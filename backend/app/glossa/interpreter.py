"""Runs a parsed and checked program: a tree-walking interpreter over nodes.py.

The checker has already resolved every name, call and array dimension, so this
only deals with what depends on values: types, uninitialized variables, indices,
division by zero, input, and the limits that stop runaway programs. Where the
textbook is silent it follows the Διερμηνευτής's defaults (docs/glossa.md,
"What the interpreter does on uncertain points").
"""

import math
import re
import sys
import time
from collections.abc import Iterable
from dataclasses import dataclass, field

from app.glossa import nodes as n
from app.glossa.builtins import BUILTINS
from app.glossa.errors import GlossaError
from app.glossa.lexer import normalize
from app.glossa.result import Frame, RunLimits, RunResult, TraceStep, Variable

Value = int | float | str | bool

PRINT_DECIMALS = 2  # ΓΡΑΨΕ 1/3 → 0.33, as the Διερμηνευτής prints by default
COMPARE_DECIMALS = 8  # so 10 / 3 * 3 = 10 is ΑΛΗΘΗΣ, as in the Διερμηνευτής
MAX_CALL_DEPTH = 200
MAX_ARRAY_CELLS = 1_000_000
MAX_INTEGER = 10**100  # far beyond any exercise; stops 9^9^9 from eating the CPU
# All arrays alive at once (the program's, and each running call's), so many big
# arrays, or one in a recursive procedure, can't fill the server's memory.
MAX_LIVE_CELLS = 2_000_000
# Allocating and copying arrays costs time too: this many cells count as one step.
CELLS_PER_STEP = 1_000
CLOCK_EVERY = 256  # steps between clock checks
# What RunResult.frames may hold: array elements in all, and characters per value.
SNAPSHOT_CELLS = 5_000
SNAPSHOT_ARRAY_CELLS = 500  # per array: Μεταβλητές lists no more (variables.ts MAX_ELEMENTS)
SNAPSHOT_CHARS = 200

ADJECTIVE = {
    "ΑΚΕΡΑΙΑ": "ακέραια",
    "ΠΡΑΓΜΑΤΙΚΗ": "πραγματική",
    "ΧΑΡΑΚΤΗΡΑΣ": "αλφαριθμητική",
    "ΛΟΓΙΚΗ": "λογική",
}
INTEGER_INPUT = re.compile(r"[+-]?\d+")
REAL_INPUT = re.compile(r"[+-]?(\d+(\.\d*)?|\.\d+)")


class _Unset:
    def __repr__(self) -> str:
        return "UNSET"


UNSET = _Unset()


@dataclass
class _Array:
    name: str
    type: str
    dims: tuple[int, ...]
    cells: list[Value | _Unset]

    def offset(self, indices: list[int], node: n.Node) -> int:
        flat = 0
        for index, size in zip(indices, self.dims, strict=True):
            if not 1 <= index <= size:
                raise _error(
                    node,
                    f"Ο δείκτης {index} είναι εκτός ορίων του πίνακα {self.name} (1..{size}).",
                )
            flat = flat * size + index - 1
        return flat

    def label(self, flat: int) -> str:
        indices = []
        for size in reversed(self.dims):
            flat, rest = divmod(flat, size)
            indices.append(str(rest + 1))
        return f"{self.name}[{', '.join(reversed(indices))}]"


@dataclass
class _Frame:
    unit: n.Unit
    types: dict[str, str] = field(default_factory=dict)  # key → ΑΚΕΡΑΙΑ, …
    names: dict[str, str] = field(default_factory=dict)  # key → declared spelling
    values: dict[str, Value | _Unset | _Array] = field(default_factory=dict)
    constants: dict[str, Value] = field(default_factory=dict)
    result: Value | _Unset = UNSET  # a function's return value
    cells: int = 0  # its arrays' cells, freed when the call returns (MAX_LIVE_CELLS)
    depth: int = 0  # how deep in calls (0: the program)
    call: int = 0  # which call (0: the program), as TraceStep.call
    copied: dict[str, str] = field(default_factory=dict)  # as TraceStep.copied


# Where an argument came from, so a procedure can copy its parameter back.
_Ref = tuple[_Frame, str] | tuple[_Array, int]


class _NeedsInput(Exception):
    def __init__(self, line: int):
        super().__init__(line)
        self.line = line  # the ΔΙΑΒΑΣΕ waiting for the value


class _Limit(Exception):
    pass


def _error(node: n.Node, message: str) -> GlossaError:
    return GlossaError(message, node.line, "runtime", node.column, node.end_column)


def type_of(value: Value) -> str:
    if isinstance(value, bool):
        return "ΛΟΓΙΚΗ"
    if isinstance(value, int):
        return "ΑΚΕΡΑΙΑ"
    if isinstance(value, float):
        return "ΠΡΑΓΜΑΤΙΚΗ"
    return "ΧΑΡΑΚΤΗΡΑΣ"


def _is_number(value: Value) -> bool:
    return isinstance(value, int | float) and not isinstance(value, bool)


def _fit(type_name: str, value: Value) -> Value | None:
    """`value` as stored in a variable of `type_name`, or None if it doesn't fit."""
    if type_name == "ΑΚΕΡΑΙΑ":
        return value if type_of(value) == "ΑΚΕΡΑΙΑ" else None
    if type_name == "ΠΡΑΓΜΑΤΙΚΗ":
        return float(value) if _is_number(value) else None
    return value if type_of(value) == type_name else None


def same_value(old: object, new: Value) -> bool:
    """Whether a variable that held `old` still holds `new` (ΑΛΗΘΗΣ is not 1)."""
    return type(old) is type(new) and old == new


def format_value(value: Value) -> str:
    """How ΓΡΑΨΕ (and the trace) shows a value."""
    if isinstance(value, bool):
        return "ΑΛΗΘΗΣ" if value else "ΨΕΥΔΗΣ"
    if isinstance(value, float):
        text = f"{value:.{PRINT_DECIMALS}f}".rstrip("0").rstrip(".")
        return "0" if text == "-0" else text
    return str(value)


def _shown(value: Value) -> str:
    """A value as Μεταβλητές shows it: as ΓΡΑΨΕ would, a long string cut short."""
    text = format_value(value)
    return text if len(text) <= SNAPSHOT_CHARS else text[:SNAPSHOT_CHARS] + "…"


def unit_title(unit: n.Unit) -> str:
    """How a unit starts, as Μεταβλητές names it: «ΔΙΑΔΙΚΑΣΙΑ Ταξινόμηση»."""
    match unit:
        case n.Function():
            word = "ΣΥΝΑΡΤΗΣΗ"
        case n.Procedure():
            word = "ΔΙΑΔΙΚΑΣΙΑ"
        case n.Algorithm():
            word = "Αλγόριθμος"
        case _:
            word = "ΠΡΟΓΡΑΜΜΑ"
    return f"{word} {unit.name}"


def execute(program: n.Program, inputs: list[str], *, limits: RunLimits, trace: bool) -> RunResult:
    """Run a parsed program.

    - ΔΙΑΒΑΣΕ consumes `inputs` in order and converts each to the variable's
      type; once they run out, stop with status "needs_input" and the output
      so far.
    - Count steps and check the clock every few hundred steps; past
      limits.max_steps or limits.timeout_seconds stop with status "limit" (this
      runs in a worker thread that can't be killed, so the loop must stop itself).
    - With trace=True, record a TraceStep per executed statement, up to
      limits.max_trace_steps and limits.max_trace_chars (then set trace_truncated
      and keep running). Output past max_output_lines or max_output_chars stops
      with status "limit".
    - Runtime errors (uninitialized variable, division by zero, index out of
      bounds, type mismatch, ...) end the run with status "error".
    """
    return run_machine(_Machine(program, inputs, limits, trace))


# Each ΓΛΩΣΣΑ call is a dozen Python frames; the depth itself is capped by MAX_CALL_DEPTH.
# Set on import, before anything compiles, so the parser always gets the same depth.
sys.setrecursionlimit(max(sys.getrecursionlimit(), 20 * MAX_CALL_DEPTH + 1000))


def run_machine(machine: "_Machine") -> RunResult:
    """Run `machine` (this module's, or algorithm_interpreter's) to a RunResult."""
    input_line = None
    try:
        machine.run()
        status = "ok"
        error = None
    except GlossaError as exc:
        status, error = "error", exc.info()
    except _NeedsInput as exc:
        status, error = "needs_input", None
        input_line = exc.line
    except _Limit:
        status, error = "limit", None
    except RecursionError:
        status = "error"
        error = GlossaError(
            "Πάρα πολλά επίπεδα το ένα μέσα στο άλλο: κλήσεις υποπρογραμμάτων ή μια πολύ "
            "μεγάλη έκφραση."
        ).info()
    return RunResult(
        status=status,
        output=machine.output,
        error=error,
        trace=machine.trace,
        trace_truncated=machine.trace_truncated,
        steps=machine.steps,
        input_line=input_line,
        frames=machine.snapshot(),
        units=list(machine.declared.values()),
    )


class _Machine:
    def __init__(self, program: n.Program, inputs: list[str], limits: RunLimits, trace: bool):
        self.program = program
        self.subprograms = {sub.key: sub for sub in program.subprograms}
        self.inputs = inputs
        self.next_input = 0
        self.limits = limits
        self.deadline = time.monotonic() + limits.timeout_seconds
        self.steps = 0
        self.depth = 0
        self.output: list[str] = []
        self.line_open = False  # the last ΓΡΑΨΕ ended with a space: keep writing on its line
        self.trace: list[TraceStep] | None = [] if trace else None
        self.trace_truncated = False
        self.output_chars = 0
        self.live_cells = 0  # MAX_LIVE_CELLS
        self.trace_chars = 0  # what the trace's changes and output hold (limits.max_trace_chars)
        self.step: TraceStep | None = None
        # The caller's step after a call, added to the trace once something happens in it.
        self.resume: TraceStep | None = None
        self.main_constants: dict[str, Value] = {}
        # The calls running, the program first. A call leaves only when it returns, so
        # after an error, a missing value or a limit this is where the run stopped.
        self.stack: list[_Frame] = []
        self.calls = 0  # calls started, to number them (TraceStep.call)
        # Traced runs: each unit that ran, with its declarations (RunResult.units).
        self.declared: dict[str, Frame] = {}

    def run(self) -> None:
        frame = self.frame(self.program)
        self.stack.append(frame)
        self.main_constants = frame.constants
        self.block(self.program.body, frame)

    # Bookkeeping

    def tick(self, node: n.Node, frame: _Frame) -> None:
        """Count a step; start its trace entry."""
        self.steps += 1
        if self.steps > self.limits.max_steps:
            raise _Limit
        if self.steps % CLOCK_EVERY == 0 and time.monotonic() > self.deadline:
            raise _Limit
        self.resume = None
        if self.trace is not None:
            self.step = self.record(
                TraceStep(line=node.line, scope=frame.unit.name, depth=frame.depth, call=frame.call)
            )

    def charge(self, cells: int) -> None:
        """Count allocating or copying `cells` array cells as steps, and check the clock:
        one call can copy a million cells, far more than its steps say."""
        self.steps += cells // CELLS_PER_STEP
        if self.steps > self.limits.max_steps or time.monotonic() > self.deadline:
            raise _Limit

    def allocate(self, cells: int, node: n.Node) -> None:
        if self.live_cells + cells > MAX_LIVE_CELLS:
            raise _error(
                node,
                "Οι πίνακες δεν χωράνε στη μνήμη: είναι πολλοί ή πολύ μεγάλοι μαζί (ή "
                "δημιουργούνται ξανά σε κάθε κλήση μιας αναδρομής). Μίκρυνέ τους.",
            )
        self.live_cells += cells
        self.charge(cells)

    def record(self, step: TraceStep) -> TraceStep | None:
        """Add `step` to the trace, unless the trace is full."""
        assert self.trace is not None
        full = self.trace_chars >= self.limits.max_trace_chars
        if full or len(self.trace) >= self.limits.max_trace_steps:
            self.trace_truncated = True
            return None
        self.trace.append(step)
        return step

    def current(self) -> TraceStep | None:
        """The trace step that changes, conditions and output go to."""
        if self.resume is not None:
            resumed, self.resume = self.resume, None
            self.step = self.record(resumed)
        return self.step

    def note(self, name: str, value: Value) -> None:
        if row := self.current():
            row.changes[name] = text = format_value(value)
            self.trace_chars += len(name) + len(text)

    def condition(self, expr: n.Expr, frame: _Frame) -> bool:
        value = self.eval(expr, frame)
        if not isinstance(value, bool):
            raise _error(expr, "Η συνθήκη πρέπει να έχει λογική τιμή (ΑΛΗΘΗΣ ή ΨΕΥΔΗΣ).")
        if row := self.current():
            row.condition = value
        return value

    # Program units

    def frame(self, unit: n.Unit) -> _Frame:
        frame = _Frame(unit)
        for constant in unit.constants:
            frame.constants[constant.key] = self.constant_value(constant.value, frame)
        for variable in unit.variables:
            frame.types[variable.key] = variable.type
            frame.names[variable.key] = variable.name
            if variable.dimensions:
                dims = tuple(self.dimension(d, frame) for d in variable.dimensions)
                size = math.prod(dims)
                if size > MAX_ARRAY_CELLS:
                    raise _error(variable, f"Ο πίνακας {variable.name} είναι πολύ μεγάλος.")
                self.allocate(size, variable)
                frame.cells += size
                cells: list[Value | _Unset] = [UNSET] * size
                frame.values[variable.key] = _Array(variable.name, variable.type, dims, cells)
            else:
                frame.values[variable.key] = UNSET
        if self.trace is not None and unit.name not in self.declared:
            self.declared[unit.name] = Frame(unit.name, unit_title(unit), self.variables(frame))
        return frame

    # What Μεταβλητές shows

    def snapshot(self) -> list[Frame]:
        """The running calls' variables and their values (RunResult.frames), with at
        most SNAPSHOT_CELLS array elements in all."""
        budget = [SNAPSHOT_CELLS]
        return [
            Frame(f.unit.name, unit_title(f.unit), self.variables(f, budget)) for f in self.stack
        ]

    def variables(self, frame: _Frame, budget: list[int] | None = None) -> list[Variable]:
        """`frame`'s variables in the order they were declared (or first given a value),
        then a function's own value. Without `budget`, no values: only declarations."""
        shown = []
        for key, value in frame.values.items():
            name = frame.names.get(key) or getattr(value, "name", key)
            variable = Variable(name, frame.types.get(key))
            if budget is not None:
                self.fill(variable, value, budget)
            elif isinstance(value, _Array):
                variable.dims = list(value.dims)
            shown.append(variable)
        unit = frame.unit
        if isinstance(unit, n.Function):
            result = frame.result
            value = None if budget is None or result is UNSET else _shown(result)  # type: ignore[arg-type]
            shown.append(Variable(unit.name, unit.return_type, value))
        return shown

    def fill(self, variable: Variable, value: object, budget: list[int]) -> None:
        """Give `variable` its value, or an array its elements while `budget` lasts."""
        if isinstance(value, _Array):
            variable.dims = list(value.dims)
            cells = ((value.label(i), c) for i, c in enumerate(value.cells) if c is not UNSET)
            self.fill_cells(variable, cells, budget)  # type: ignore[arg-type]
        elif value is not UNSET:
            variable.value = _shown(value)  # type: ignore[arg-type]

    @staticmethod
    def fill_cells(
        variable: Variable, cells: Iterable[tuple[str, Value]], budget: list[int]
    ) -> None:
        """The first SNAPSHOT_ARRAY_CELLS elements with a value, in order (so all those
        Μεταβλητές lists), while `budget` lasts."""
        variable.cells = {}
        for label, cell in cells:
            if budget[0] <= 0 or len(variable.cells) >= SNAPSHOT_ARRAY_CELLS:
                variable.cells_truncated = True
                return
            budget[0] -= 1
            variable.cells[label] = _shown(cell)

    def constant_value(self, expr: n.Expr, frame: _Frame) -> Value:
        # The checker allows only these forms.
        if isinstance(expr, n.Literal):
            return expr.value
        if isinstance(expr, n.Unary) and isinstance(expr.operand, n.Literal):
            value = expr.operand.value
            assert _is_number(value)
            return -value if expr.op == "-" else value
        assert isinstance(expr, n.Name)
        return self.constant(expr.key, frame)  # type: ignore[return-value]

    def constant(self, key: str, frame: _Frame) -> Value | None:
        if key in frame.constants:
            return frame.constants[key]
        return self.main_constants.get(key)

    def dimension(self, expr: n.Expr, frame: _Frame) -> int:
        value = expr.value if isinstance(expr, n.Literal) else self.constant(expr.key, frame)  # type: ignore[attr-defined]
        assert isinstance(value, int)
        return value

    def call(
        self, sub: n.Function | n.Procedure, args: list[n.Expr], node: n.Node, caller: _Frame
    ) -> Value | None:
        self.check_depth(sub, node)
        frame = self.frame(sub)
        try:
            refs: list[tuple[n.Param, _Ref | None]] = []
            for param, arg in zip(sub.params, args, strict=True):
                refs.append((param, self.bind(param, arg, frame, caller)))
            self.run_body(sub, frame)

            if isinstance(sub, n.Function):
                if frame.result is UNSET:
                    raise _error(node, f"Η συνάρτηση {sub.name} τελείωσε χωρίς να πάρει τιμή.")
                return frame.result  # type: ignore[return-value]
            # A procedure's parameters go back to the variables they came from.
            for param, ref in refs:
                if ref is not None:
                    self.copy_back(frame.values[param.key], ref, node)
            return None
        finally:
            self.live_cells -= frame.cells

    def check_depth(self, sub: n.Unit, node: n.Node) -> None:
        if self.depth >= MAX_CALL_DEPTH:
            raise _error(
                node,
                f"Πάρα πολλές κλήσεις του {sub.name} η μία μέσα στην άλλη. "
                "Μήπως η αναδρομή δεν σταματά ποτέ;",
            )

    def run_body(self, sub: n.Unit, frame: _Frame) -> None:
        """A called subprogram's statements; the caller's trace step resumes after."""
        caller = self.resume or self.step
        self.resume = None
        self.calls += 1
        frame.depth, frame.call = self.depth + 1, self.calls
        self.stack.append(frame)
        if self.trace is not None:
            # A row on the subprogram's first line with what its parameters were given,
            # as the πίνακας τιμών writes on entering it (arrays left out: too many cells).
            self.step = self.record(
                TraceStep(
                    line=sub.line,
                    scope=sub.name,
                    depth=frame.depth,
                    call=frame.call,
                    copied=frame.copied,
                )
            )
            for param in sub.params:  # type: ignore[attr-defined]
                value = frame.values.get(param.key)
                if self.step is not None and isinstance(value, int | float | str):
                    # The declared spelling, as store() writes it: one column per variable.
                    name = frame.names.get(param.key, param.name)
                    self.step.changes[name] = text = format_value(value)
                    self.trace_chars += len(name) + len(text)
        self.depth += 1
        try:
            self.block(sub.body, frame)
            # Only on return: a run that stops in the call stops with it on the stack.
            self.stack.pop()
        finally:
            self.depth -= 1
            self.step = caller
            if caller is not None and self.trace and self.trace[-1] is not caller:
                # What the caller does next (a procedure's values coming back, the
                # function's value being assigned) goes after the call's own steps,
                # in the order a student writes the πίνακας τιμών by hand.
                self.step = None
                self.resume = TraceStep(
                    line=caller.line, scope=caller.scope, depth=caller.depth, call=caller.call
                )

    def bind(self, param: n.Param, arg: n.Expr, frame: _Frame, caller: _Frame) -> _Ref | None:
        """Give `param` the argument's value; return where the argument lives, if a variable."""
        slot = frame.values[param.key]
        if isinstance(slot, _Array):
            source = caller.values.get(arg.key) if isinstance(arg, n.Name) else None
            if not isinstance(source, _Array):
                raise _error(arg, f"Η παράμετρος {param.name} είναι πίνακας: δώσε έναν πίνακα.")
            if source.dims != slot.dims:
                raise _error(
                    arg,
                    f"Ο πίνακας {source.name} δεν έχει τις διαστάσεις της παραμέτρου {param.name}.",
                )
            if _fit(slot.type, _sample(source.type)) is None:
                raise _error(
                    arg,
                    f"Ο πίνακας {source.name} είναι {ADJECTIVE[source.type]}, "
                    f"ενώ η παράμετρος {param.name} είναι {ADJECTIVE[slot.type]}.",
                )
            self.charge(len(source.cells))
            frame.copied[slot.name] = source.name
            slot.cells = [c if c is UNSET else _fit(slot.type, c) for c in source.cells]  # type: ignore[misc]
            return (caller, arg.key)  # type: ignore[union-attr]

        ref: _Ref | None = None
        if isinstance(arg, n.Name) and isinstance(caller.values.get(arg.key), _Array):
            raise _error(
                arg, f"Ο {arg.name} είναι πίνακας, ενώ η παράμετρος {param.name} δεν είναι."
            )
        if isinstance(arg, n.Name) and arg.key in caller.values:
            # A variable may go in without a value: the procedure may be the one giving it.
            ref = (caller, arg.key)
            value = caller.values[arg.key]
        elif isinstance(arg, n.Index):
            array, flat = self.element(arg, caller)
            ref = (array, flat)
            value = array.cells[flat]
        else:
            value = self.eval(arg, caller)
        if value is not UNSET:
            fitted = _fit(frame.types[param.key], value)  # type: ignore[arg-type]
            if fitted is None:
                raise _error(
                    arg,
                    f"Η παράμετρος {param.name} είναι {ADJECTIVE[frame.types[param.key]]}, "
                    f"αλλά δόθηκε {ADJECTIVE[type_of(value)]} τιμή.",  # type: ignore[arg-type]
                )
            frame.values[param.key] = fitted
        return ref

    def copy_back(self, value: Value | _Unset | _Array, ref: _Ref, node: n.Node) -> None:
        target, where = ref
        if isinstance(value, _Array):
            assert isinstance(target, _Frame) and isinstance(where, str)
            array = target.values[where]
            assert isinstance(array, _Array)
            self.charge(len(value.cells))
            for i, cell in enumerate(value.cells):
                if cell is not UNSET:
                    stored = self.fit_or_fail(array.type, cell, node, array.name)  # type: ignore[arg-type]
                    # Only the elements that changed, as for a variable below.
                    if not same_value(array.cells[i], stored):
                        self.note(array.label(i), stored)
                    array.cells[i] = stored
            return
        if value is UNSET:
            return
        # Only a value that changed goes in the trace: nothing visible wrote the others.
        if isinstance(target, _Frame):
            assert isinstance(where, str)
            name = target.names[where]
            stored = self.fit_or_fail(target.types[where], value, node, name)
            if not same_value(target.values[where], stored):
                self.note(name, stored)
            target.values[where] = stored
        else:
            assert isinstance(where, int)
            stored = self.fit_or_fail(target.type, value, node, target.label(where))
            if not same_value(target.cells[where], stored):
                self.note(target.label(where), stored)
            target.cells[where] = stored

    # Statements

    def block(self, body: list[n.Stmt], frame: _Frame) -> None:
        for stmt in body:
            self.statement(stmt, frame)

    def statement(self, stmt: n.Stmt, frame: _Frame) -> None:
        match stmt:
            case n.Assign(target=target, value=value):
                self.tick(stmt, frame)
                result = self.eval(value, frame)
                function = frame.unit
                if (
                    isinstance(function, n.Function)
                    and isinstance(target, n.Name)
                    and target.key == function.key
                ):
                    fitted = _fit(function.return_type, result)
                    if fitted is None:
                        raise _error(
                            stmt,
                            f"Η συνάρτηση {function.name} επιστρέφει "
                            f"{ADJECTIVE[function.return_type]} τιμή, "
                            f"όχι {ADJECTIVE[type_of(result)]}.",
                        )
                    frame.result = fitted
                    self.note(function.name, fitted)
                else:
                    self.store(target, result, frame)
            case n.Read(targets=targets):
                self.tick(stmt, frame)
                self.line_open = False  # the student pressed Enter after typing
                for target in targets:
                    self.store(target, self.read(target, frame), frame)
            case n.Write(values=values):
                self.tick(stmt, frame)
                self.write([self.eval(v, frame) for v in values])
            case n.If(branches=branches, otherwise=otherwise):
                for branch in branches:
                    self.tick(branch, frame)
                    if self.condition(branch.condition, frame):
                        self.block(branch.body, frame)
                        return
                if otherwise is not None:
                    self.block(otherwise, frame)
            case n.Select(subject=subject, cases=cases, otherwise=otherwise):
                self.tick(stmt, frame)
                value = self.eval(subject, frame)
                for case in cases:
                    self.tick(case, frame)
                    matched = any(self.case_matches(c, value, frame) for c in case.conditions)
                    if row := self.current():
                        row.condition = matched
                    if matched:
                        self.block(case.body, frame)
                        return
                if otherwise is not None:
                    self.block(otherwise, frame)
            case n.While(condition=condition, body=body):
                while True:
                    self.tick(stmt, frame)
                    if not self.condition(condition, frame):
                        break
                    self.block(body, frame)
            case n.RepeatUntil(body=body, condition=condition):
                while True:
                    self.block(body, frame)
                    self.tick(condition, frame)
                    if self.condition(condition, frame):
                        break
            case n.For():
                self.for_loop(stmt, frame)
            case n.CallProcedure(args=args):
                self.tick(stmt, frame)
                sub = self.subprograms[stmt.key]
                self.call(sub, args, stmt, frame)

    def for_loop(self, loop: n.For, frame: _Frame) -> None:
        self.tick(loop, frame)
        start = self.number(loop.start, frame)
        end = self.number(loop.end, frame)
        step = 1 if loop.step is None else self.number(loop.step, frame)
        if step == 0:
            raise _error(loop.step or loop, "Το βήμα της ΓΙΑ δεν μπορεί να είναι μηδέν.")
        self.store(loop.counter, start, frame)
        first = True
        while True:
            if not first:
                self.tick(loop, frame)
                current = self.eval(loop.counter, frame)
                assert _is_number(current)
                self.store(loop.counter, self.arithmetic("+", current, step, loop), frame)  # type: ignore[arg-type]
            first = False
            current = self.eval(loop.counter, frame)
            assert _is_number(current)
            going = _compare("<=" if step > 0 else ">=", current, end)  # type: ignore[arg-type]
            if row := self.current():
                row.condition = going
            if not going:
                return
            self.block(loop.body, frame)

    def case_matches(self, condition: n.CaseCondition, value: Value, frame: _Frame) -> bool:
        match condition:
            case n.CaseValue(value=expr):
                return self.compare("=", value, self.eval(expr, frame), condition)
            case n.CaseRange(low=low, high=high):
                return self.compare(">=", value, self.eval(low, frame), condition) and self.compare(
                    "<=", value, self.eval(high, frame), condition
                )
            case n.CaseCompare(op=op, value=expr):
                return self.compare(op, value, self.eval(expr, frame), condition)
        raise AssertionError(condition)

    def next_text(self, target: n.Target) -> str:
        """The next input, as typed; out of inputs, the run stops to ask for one."""
        if self.next_input >= len(self.inputs):
            raise _NeedsInput(target.line)
        text = self.inputs[self.next_input]
        self.next_input += 1
        return text

    def read(self, target: n.Target, frame: _Frame) -> Value:
        text = self.next_text(target)
        type_name = self.target_type(target, frame)
        plain = text.strip()
        if type_name == "ΑΚΕΡΑΙΑ":
            if INTEGER_INPUT.fullmatch(plain):
                return integer_input(plain, target)
            raise _error(target, f"Δόθηκε «{text}», αλλά η {target.name} περιμένει ακέραιο αριθμό.")
        if type_name == "ΠΡΑΓΜΑΤΙΚΗ":
            decimal = plain.replace(",", ".")  # 2,5 as Greeks write it
            if REAL_INPUT.fullmatch(decimal):
                return real_input(decimal, target)
            raise _error(target, f"Δόθηκε «{text}», αλλά η {target.name} περιμένει αριθμό.")
        if type_name == "ΛΟΓΙΚΗ":
            word = normalize(plain)
            if word in ("ΑΛΗΘΗΣ", "ΨΕΥΔΗΣ"):
                return word == "ΑΛΗΘΗΣ"
            raise _error(
                target, f"Δόθηκε «{text}», αλλά η {target.name} περιμένει ΑΛΗΘΗΣ ή ΨΕΥΔΗΣ."
            )
        return text

    def write(self, values: list[Value]) -> None:
        parts: list[str] = []
        length = self.output_chars
        for i, value in enumerate(values):
            # Two numbers in a row get a space between them, as in the Διερμηνευτής.
            if i and _is_number(value) and _is_number(values[i - 1]):
                parts.append(" ")
            parts.append(format_value(value))
            # Checked as it grows: one ΓΡΑΨΕ of many long strings could build a huge line.
            length += len(parts[-1])
            if length > self.limits.max_output_chars + 1:  # + the space that may go below
                raise _Limit
        text = "".join(parts)
        # A ΓΡΑΨΕ ending with a space leaves the cursor on its line (the space itself goes).
        stays = text.endswith(" ")
        if stays:
            text = text[:-1]
        self.output_chars += len(text)
        if self.output_chars > self.limits.max_output_chars:
            raise _Limit
        if self.line_open and self.output:
            self.output[-1] += text
        else:
            if len(self.output) >= self.limits.max_output_lines:
                raise _Limit
            self.output.append(text)
        self.line_open = stays
        if row := self.current():
            row.output.append(text)
            self.trace_chars += len(text)

    # Variables

    def target_type(self, target: n.Target, frame: _Frame) -> str:
        return frame.types[target.key]

    def element(self, ref: n.Index, frame: _Frame) -> tuple[_Array, int]:
        array = frame.values[ref.key]
        assert isinstance(array, _Array)
        indices = []
        for expr in ref.indices:
            index = self.eval(expr, frame)
            if type_of(index) != "ΑΚΕΡΑΙΑ":
                raise _error(expr, f"Ο δείκτης του πίνακα {array.name} πρέπει να είναι ακέραιος.")
            indices.append(index)
        return array, array.offset(indices, ref)  # type: ignore[arg-type]

    def store(self, target: n.Target, value: Value, frame: _Frame) -> None:
        if isinstance(target, n.Index):
            array, flat = self.element(target, frame)
            stored = self.fit_or_fail(array.type, value, target, array.label(flat))
            array.cells[flat] = stored
            self.note(array.label(flat), stored)
        else:
            name = frame.names[target.key]
            stored = self.fit_or_fail(frame.types[target.key], value, target, name)
            frame.values[target.key] = stored
            self.note(name, stored)

    def fit_or_fail(self, type_name: str, value: Value, node: n.Node, name: str) -> Value:
        fitted = _fit(type_name, value)
        if fitted is None:
            raise _error(
                node,
                f"Δεν μπορεί να εκχωρηθεί {ADJECTIVE[type_of(value)]} τιμή "
                f"στη {ADJECTIVE[type_name]} μεταβλητή {name}.",
            )
        return fitted

    # Expressions

    def eval(self, expr: n.Expr, frame: _Frame) -> Value:
        match expr:
            case n.Literal(value=value):
                return value
            case n.Name():
                if expr.key in frame.values:
                    value = frame.values[expr.key]
                    if value is UNSET:
                        raise _error(expr, f"Η μεταβλητή {expr.name} δεν έχει πάρει τιμή.")
                    assert not isinstance(value, _Array | _Unset)
                    return value
                constant = self.constant(expr.key, frame)
                assert constant is not None
                return constant
            case n.Index():
                array, flat = self.element(expr, frame)
                cell = array.cells[flat]
                if cell is UNSET:
                    raise _error(expr, f"Το στοιχείο {array.label(flat)} δεν έχει πάρει τιμή.")
                return cell  # type: ignore[return-value]
            case n.Call(args=args):
                if expr.key in BUILTINS:
                    argument = self.number(args[0], frame, f"Η συνάρτηση {expr.name}")
                    try:
                        return BUILTINS[expr.key](argument)
                    except GlossaError as exc:
                        raise _error(expr, exc.message) from None
                    except (OverflowError, ValueError):
                        raise _error(
                            expr, f"Η τιμή είναι εκτός ορίων για τη συνάρτηση {expr.name}."
                        ) from None
                result = self.call(self.subprograms[expr.key], args, expr, frame)
                assert result is not None
                return result
            case n.Unary(op=op, operand=operand):
                value = self.eval(operand, frame)
                if op == "ΟΧΙ":
                    if not isinstance(value, bool):
                        raise _error(expr, "Το ΟΧΙ εφαρμόζεται μόνο σε λογικές τιμές.")
                    return not value
                if not _is_number(value):
                    raise _error(expr, f"Το {op} εφαρμόζεται μόνο σε αριθμούς.")
                return -value if op == "-" else value  # type: ignore[operator]
            case n.Binary(op=op, left=left, right=right):
                # Both sides always: ΓΛΩΣΣΑ evaluates conditions fully, so
                # ΟΣΟ i <= 10 ΚΑΙ Α[i] <> 0 fails at i = 11, as the textbook says.
                a = self.eval(left, frame)
                b = self.eval(right, frame)
                if op in ("ΚΑΙ", "Η"):
                    if not (isinstance(a, bool) and isinstance(b, bool)):
                        word = "ΚΑΙ" if op == "ΚΑΙ" else "Ή"
                        raise _error(expr, f"Το {word} εφαρμόζεται μόνο σε λογικές τιμές.")
                    return (a and b) if op == "ΚΑΙ" else (a or b)
                if op in ("=", "<>", "<", ">", "<=", ">="):
                    return self.compare(op, a, b, expr)
                return self.arithmetic(op, a, b, expr)
        raise AssertionError(expr)

    def number(self, expr: n.Expr, frame: _Frame, who: str = "") -> int | float:
        value = self.eval(expr, frame)
        if not _is_number(value):
            raise _error(
                expr, f"{who or 'Εδώ'} χρειάζεται αριθμό, όχι {ADJECTIVE[type_of(value)]} τιμή."
            )
        return value  # type: ignore[return-value]

    def compare(self, op: str, a: Value, b: Value, node: n.Node) -> bool:
        if _is_number(a) and _is_number(b):
            return _compare(op, a, b)  # type: ignore[arg-type]
        if type_of(a) != type_of(b):
            raise _error(
                node,
                f"Δεν συγκρίνεται {ADJECTIVE[type_of(a)]} με {ADJECTIVE[type_of(b)]} τιμή.",
            )
        if isinstance(a, bool) and op not in ("=", "<>"):
            raise _error(node, "Οι λογικές τιμές συγκρίνονται μόνο με = και <>.")
        return _compare(op, a, b)

    def arithmetic(self, op: str, a: Value, b: Value, node: n.Node) -> int | float:
        if not (_is_number(a) and _is_number(b)):
            bad = a if not _is_number(a) else b
            raise _error(
                node,
                f"Ο τελεστής {op} εφαρμόζεται μόνο σε αριθμούς, "
                f"όχι σε {ADJECTIVE[type_of(bad)]} τιμή.",
            )
        x, y = a, b
        assert isinstance(x, int | float) and isinstance(y, int | float)
        if op in ("DIV", "MOD"):
            if not (type_of(x) == "ΑΚΕΡΑΙΑ" and type_of(y) == "ΑΚΕΡΑΙΑ"):
                raise _error(node, f"Ο τελεστής {op} εφαρμόζεται μόνο σε ακέραιους.")
            if y == 0:
                raise _error(node, "Διαίρεση με το μηδέν.")
            return x // y if op == "DIV" else x % y
        if op == "/":
            if y == 0:
                raise _error(node, "Διαίρεση με το μηδέν.")
            result: int | float = x / y
        elif op == "^":
            result = self.power(x, y, node)
        elif op == "+":
            result = x + y
        elif op == "-":
            result = x - y
        else:
            result = x * y
        if isinstance(result, float) and not math.isfinite(result):
            raise _error(node, "Το αποτέλεσμα είναι πολύ μεγάλο.")
        if isinstance(result, int) and abs(result) > MAX_INTEGER:
            raise _error(node, "Το αποτέλεσμα είναι πολύ μεγάλο.")
        return result

    def power(self, x: int | float, y: int | float, node: n.Node) -> int | float:
        if x == 0 and y < 0:
            raise _error(node, "Διαίρεση με το μηδέν.")
        if x < 0 and isinstance(y, float) and not y.is_integer():
            raise _error(node, "Αρνητικός αριθμός δεν υψώνεται σε δεκαδική δύναμη.")
        if abs(x) > 1 and y > 0 and y * math.log10(abs(x)) > 100:
            raise _error(node, "Το αποτέλεσμα είναι πολύ μεγάλο.")
        try:
            return x**y
        except (OverflowError, ZeroDivisionError):
            raise _error(node, "Το αποτέλεσμα είναι πολύ μεγάλο.") from None


def integer_input(text: str, node: n.Node) -> int:
    """A typed integer, at most MAX_INTEGER: past it, an error instead of a crash later."""
    sign = "-" if text.startswith("-") else ""
    digits = text.lstrip("+-").lstrip("0") or "0"  # int() refuses past 4300 digits, zeros too
    if len(digits) > len(str(MAX_INTEGER)):
        raise _error(node, "Ο αριθμός που δόθηκε είναι πολύ μεγάλος.")
    value = int(sign + digits)
    if abs(value) > MAX_INTEGER:
        raise _error(node, "Ο αριθμός που δόθηκε είναι πολύ μεγάλος.")
    return value


def real_input(text: str, node: n.Node) -> float:
    """A typed real; one too big for a float (inf) is an error."""
    value = float(text)
    if not math.isfinite(value):
        raise _error(node, "Ο αριθμός που δόθηκε είναι πολύ μεγάλος.")
    return value


def _sample(type_name: str) -> Value:
    return {"ΑΚΕΡΑΙΑ": 0, "ΠΡΑΓΜΑΤΙΚΗ": 0.0, "ΧΑΡΑΚΤΗΡΑΣ": "", "ΛΟΓΙΚΗ": False}[type_name]


def _compare(op: str, a: Value, b: Value) -> bool:
    if isinstance(a, float) or isinstance(b, float):
        a, b = round(a, COMPARE_DECIMALS), round(b, COMPARE_DECIMALS)  # type: ignore[arg-type]
    match op:
        case "=":
            return a == b
        case "<>":
            return a != b
        case "<":
            return a < b  # type: ignore[operator]
        case ">":
            return a > b  # type: ignore[operator]
        case "<=":
            return a <= b  # type: ignore[operator]
        case _:
            return a >= b  # type: ignore[operator]
