"""Runs ψευδογλώσσα algorithms (algorithm_parser.py) on the ΓΛΩΣΣΑ interpreter.

What differs from ΓΛΩΣΣΑ (docs/glossa.md, "Αλγόριθμος (ψευδογλώσσα)"):
- Nothing is declared. A variable holds whatever value it was last given, and
  Διάβασε takes the type of what was typed (12 → integer, 2.5 → real).
- Arrays have no size: an element exists once it gets a value. Indices start at 1.
- The first algorithm reads its Δεδομένα as input before its first statement,
  and shows its Αποτελέσματα at the end, on one line, as Εμφάνισε would.
- Κάλεσε Χ(...) passes the Δεδομένα in and, after it returns, copies each
  Αποτέλεσμα back to the variable given in its place. Χ(...) inside an
  expression takes the Δεδομένα only and is the value of its one Αποτέλεσμα.
"""

from dataclasses import dataclass, field

from app.glossa import nodes as n
from app.glossa.interpreter import (
    INTEGER_INPUT,
    MAX_ARRAY_CELLS,
    REAL_INPUT,
    UNSET,
    Value,
    _error,
    _Frame,
    _Machine,
    integer_input,
    real_input,
    run_machine,
    same_value,
    type_of,
)
from app.glossa.lexer import normalize
from app.glossa.result import RunLimits, RunResult, Variable

Position = tuple[int, ...]


@dataclass
class _Grid:
    """A ψευδογλώσσα array: never declared, so it has no size."""

    name: str
    cells: dict[Position, Value] = field(default_factory=dict)

    def label(self, at: Position) -> str:
        return _label(self.name, at)


def _label(name: str, at: Position) -> str:
    return f"{name}[{', '.join(map(str, at))}]"


@dataclass
class _Back:
    """Where an Αποτέλεσμα goes after Κάλεσε: the variable (or whole array) or
    element given in its place, with the element's position taken before the call."""

    param: n.Name
    arg: n.Name | n.Index
    at: Position | None = None


def execute_algorithms(
    main: n.Algorithm, inputs: list[str], *, limits: RunLimits, trace: bool
) -> RunResult:
    """Run the first algorithm; the same contract as interpreter.execute."""
    return run_machine(_AlgorithmMachine(main, inputs, limits, trace))


class _AlgorithmMachine(_Machine):
    def __init__(self, main: n.Algorithm, inputs: list[str], limits: RunLimits, trace: bool):
        super().__init__(main, inputs, limits, trace)  # type: ignore[arg-type]
        self.main = main
        # Array cells copied into the calls still running: a deep recursion that passes a
        # big array along would otherwise hold a copy per level (memory, not steps).
        self.copied_cells = 0
        # The first algorithm may call itself too (the textbook's recursive Παραγοντικό).
        self.subprograms = {a.key: a for a in (main, *main.subprograms)}  # type: ignore[misc]

    def run(self) -> None:
        main = self.main
        frame = self.frame(main)
        self.stack.append(frame)
        if main.data:
            self.tick(main.data[0], frame)
            self.line_open = False  # as after Διάβασε
            for name in main.data:
                if name.key in main.arrays:
                    raise _error(
                        name,
                        f"Ο πίνακας {name.name} δεν διαβάζεται ολόκληρος από τα Δεδομένα. "
                        f"Διάβασε τα στοιχεία του ένα ένα (Διάβασε {name.name}[i] μέσα σε "
                        "ένα Για), ή δώσ' τον από άλλον αλγόριθμο με Κάλεσε.",
                    )
                self.store(name, self.read(name, frame), frame)
        self.block(main.body, frame)
        if main.results:
            self.tick(main.results[0], frame)
            values: list[Value] = []
            for name in main.results:
                slot = frame.values.get(name.key, UNSET)
                if isinstance(slot, _Grid):
                    values.extend(slot.cells[at] for at in sorted(slot.cells))
                else:
                    values.append(self.eval(name, frame))
            self.write(values)

    # Statements

    def statement(self, stmt: n.Stmt, frame: _Frame) -> None:
        if isinstance(stmt, n.Swap):
            self.tick(stmt, frame)
            # Both places first: in «Αντιμετάθεσε i, Π[i]» the element is Π[i] for i's old value.
            places = [
                (ref, self.position(ref, frame) if isinstance(ref, n.Index) else None)
                for ref in (stmt.first, stmt.second)
            ]
            first = self.eval(stmt.first, frame)
            second = self.eval(stmt.second, frame)
            for (ref, at), value in zip(places, (second, first), strict=True):
                if at is None:
                    self.store(ref, value, frame)
                else:
                    self.put(frame, ref, at, value)  # type: ignore[arg-type]
            return
        super().statement(stmt, frame)

    def read(self, target: n.Target, frame: _Frame) -> Value:
        """No declared type: the value is what the typed text looks like."""
        text = self.next_text(target)
        plain = text.strip()
        if INTEGER_INPUT.fullmatch(plain):
            return integer_input(plain, target)
        decimal = plain.replace(",", ".")  # 2,5 as Greeks write it
        if REAL_INPUT.fullmatch(decimal):
            return real_input(decimal, target)
        word = normalize(plain)
        if word in ("ΑΛΗΘΗΣ", "ΨΕΥΔΗΣ"):
            return word == "ΑΛΗΘΗΣ"
        return text

    # Calls

    def call(  # type: ignore[override]
        self, sub: n.Algorithm, args: list[n.Expr], node: n.Node, caller: _Frame
    ) -> Value | None:
        self.check_depth(sub, node)
        frame = self.frame(sub)
        in_expression = isinstance(node, n.Call)
        back: list[_Back] = []
        copied = 0
        try:
            # The checker matched the arguments: the Δεδομένα, then (after Κάλεσε only)
            # the Αποτελέσματα.
            for i, (param, arg) in enumerate(zip(sub.params, args, strict=False)):
                if i < len(sub.data):
                    copied += self.pass_in(param, arg, frame, caller)
                if not in_expression and sub.is_result(param.key):
                    if isinstance(arg, n.Name):
                        back.append(_Back(param, arg))
                    elif isinstance(arg, n.Index):
                        back.append(_Back(param, arg, self.position(arg, caller)))
            self.run_body(sub, frame)
        finally:
            self.copied_cells -= copied

        if in_expression:
            result = sub.results[0]
            value = frame.values.get(result.key, UNSET)
            if value is UNSET:
                raise _error(
                    node,
                    f"Ο αλγόριθμος {sub.name} τελείωσε χωρίς να πάρει τιμή "
                    f"το αποτέλεσμά του, {result.name}.",
                )
            return value  # type: ignore[return-value]
        for target in back:
            self.give_back(target, frame, caller)
        return None

    def pass_in(self, param: n.Name, arg: n.Expr, frame: _Frame, caller: _Frame) -> int:
        """A Δεδομένο gets the argument's value; an array goes in as a copy. A
        variable (or element) with no value yet goes in without one. Returns the
        number of array cells copied."""
        value: Value
        if isinstance(arg, n.Name):
            slot = caller.values.get(arg.key, UNSET)
            if isinstance(slot, _Grid):
                size = len(slot.cells)
                if self.copied_cells + size > MAX_ARRAY_CELLS:
                    raise _error(
                        arg,
                        f"Πάρα πολλά αντίγραφα του πίνακα {arg.name} σε κλήσεις που δεν έχουν "
                        "τελειώσει. Μήπως η αναδρομή πηγαίνει πολύ βαθιά;",
                    )
                self.copied_cells += size
                self.charge(len(slot.cells))
                frame.values[param.key] = _Grid(param.name, dict(slot.cells))
                frame.copied[param.name] = slot.name
                return size
            if slot is UNSET:
                return 0
            value = slot  # type: ignore[assignment]
        elif isinstance(arg, n.Index):
            grid = caller.values.get(arg.key)
            at = self.position(arg, caller)
            if not isinstance(grid, _Grid) or at not in grid.cells:
                return 0
            value = grid.cells[at]
        else:
            value = self.eval(arg, caller)
        frame.values[param.key] = value
        frame.names[param.key] = param.name
        return 0

    def give_back(self, target: _Back, frame: _Frame, caller: _Frame) -> None:
        """After Κάλεσε: an Αποτέλεσμα to the variable given in its place."""
        value = frame.values.get(target.param.key, UNSET)
        arg = target.arg
        if value is UNSET:
            return  # it never got a value: the caller's variable keeps its own
        if target.at is not None:
            grid = caller.values.get(arg.key)
            if isinstance(grid, _Grid) and same_value(grid.cells.get(target.at), value):
                return  # unchanged: nothing for the trace
            self.put(caller, arg, target.at, value)  # type: ignore[arg-type]
        elif isinstance(value, _Grid):
            old = caller.values.get(arg.key)
            grid = _Grid(old.name if isinstance(old, _Grid) else arg.name, dict(value.cells))
            caller.values[arg.key] = grid  # type: ignore[assignment]
            for at, cell in grid.cells.items():
                if not (isinstance(old, _Grid) and old.cells.get(at) == cell):
                    self.note(grid.label(at), cell)
        elif not same_value(caller.values.get(arg.key), value):  # type: ignore[arg-type]
            self.store(arg, value, caller)  # type: ignore[arg-type]

    # Variables

    def fill(self, variable: Variable, value: object, budget: list[int]) -> None:
        if isinstance(value, _Grid):
            variable.dims = []  # no size: only the elements that have a value
            cells = ((value.label(at), value.cells[at]) for at in sorted(value.cells))
            self.fill_cells(variable, cells, budget)
        else:
            super().fill(variable, value, budget)

    def position(self, ref: n.Index, frame: _Frame) -> Position:
        at = []
        for expr in ref.indices:
            index = self.eval(expr, frame)
            if type_of(index) != "ΑΚΕΡΑΙΑ":
                raise _error(expr, f"Ο δείκτης του πίνακα {ref.name} πρέπει να είναι ακέραιος.")
            if index < 1:  # type: ignore[operator]
                raise _error(
                    expr, f"Ο δείκτης {index} του πίνακα {ref.name} πρέπει να είναι από 1 και πάνω."
                )
            at.append(index)
        return tuple(at)  # type: ignore[arg-type]

    def put(self, frame: _Frame, ref: n.Index, at: Position, value: Value) -> None:
        """Set an element, making the array on its first one."""
        grid = frame.values.get(ref.key)
        if not isinstance(grid, _Grid):
            grid = _Grid(ref.name)
            frame.values[ref.key] = grid  # type: ignore[assignment]
        if at not in grid.cells and len(grid.cells) >= MAX_ARRAY_CELLS:
            raise _error(ref, f"Ο πίνακας {grid.name} είναι πολύ μεγάλος.")
        grid.cells[at] = value
        self.note(grid.label(at), value)

    def store(self, target: n.Target, value: Value, frame: _Frame) -> None:
        if isinstance(target, n.Index):
            self.put(frame, target, self.position(target, frame), value)
            return
        frame.values[target.key] = value
        self.note(frame.names.setdefault(target.key, target.name), value)

    def eval(self, expr: n.Expr, frame: _Frame) -> Value:
        if isinstance(expr, n.Name):
            value = frame.values.get(expr.key, UNSET)
            if value is UNSET:
                raise _error(expr, f"Η μεταβλητή {expr.name} δεν έχει πάρει τιμή.")
            assert not isinstance(value, _Grid)  # the checker allows whole arrays only as arguments
            return value  # type: ignore[return-value]
        if isinstance(expr, n.Index):
            at = self.position(expr, frame)
            grid = frame.values.get(expr.key)
            if not isinstance(grid, _Grid) or at not in grid.cells:
                raise _error(expr, f"Το στοιχείο {_label(expr.name, at)} δεν έχει πάρει τιμή.")
            return grid.cells[at]
        return super().eval(expr, frame)
