"""Static checks on a parsed program: errors the student can see without running.

Each program unit (program, function, procedure) has its own names. There are
no global variables; the main program's constants are visible in subprograms
(a docs/glossa.md "Verify" item: tighten it if the Διερμηνευτής says otherwise).
Types aren't checked here; the interpreter does that at runtime.
"""

from dataclasses import dataclass
from typing import Literal

from app.glossa import nodes as n
from app.glossa.builtins import BUILTINS
from app.glossa.errors import GlossaError

SymbolKind = Literal["constant", "variable"]


@dataclass
class _Symbol:
    kind: SymbolKind
    dimensions: int = 0
    value: int | float | str | bool | None = None  # constants only


def check_program(program: n.Program) -> None:
    """Raise GlossaError(kind="syntax") at the first problem found."""
    _Checker(program).run()


def _count(number: int, one: str, many: str) -> str:
    return f"{number} {one if number == 1 else many}"


def _error(node: n.Node, message: str) -> GlossaError:
    return GlossaError(message, node.line, "syntax", node.column, node.end_column)


class _Checker:
    def __init__(self, program: n.Program):
        self.program = program
        self.subprograms: dict[str, n.Function | n.Procedure] = {}
        self.main_scope: dict[str, _Symbol] = {}

    def run(self) -> None:
        for sub in self.program.subprograms:
            if sub.key in BUILTINS:
                raise _error(sub, f"Το {sub.name} είναι όνομα ενσωματωμένης συνάρτησης.")
            if sub.key in self.subprograms:
                raise _error(sub, f"Υπάρχει ήδη υποπρόγραμμα με το όνομα {sub.name}.")
            if sub.key == self.program.key:
                raise _error(
                    sub, f"Το {sub.name} είναι το όνομα του προγράμματος: δώσε άλλο όνομα."
                )
            self.subprograms[sub.key] = sub
        self.main_scope = _UnitChecker(self, self.program).run()
        for sub in self.program.subprograms:
            _UnitChecker(self, sub).run()


class _UnitChecker:
    def __init__(self, checker: _Checker, unit: n.Unit):
        self.checker = checker
        self.unit = unit
        self.scope: dict[str, _Symbol] = {}
        self.assigns_own_name = False

    @property
    def function(self) -> n.Function | None:
        return self.unit if isinstance(self.unit, n.Function) else None

    def run(self) -> dict[str, _Symbol]:
        for constant in self.unit.constants:
            self.declare(constant)
            self.scope[constant.key] = _Symbol("constant", value=self.constant_value(constant))
        for variable in self.unit.variables:
            self.declare(variable)
            for dimension in variable.dimensions:
                self.check_dimension(dimension)
            self.scope[variable.key] = _Symbol("variable", len(variable.dimensions))
        if isinstance(self.unit, n.Function | n.Procedure):
            self.check_params(self.unit)

        self.statements(self.unit.body)

        if self.function and not self.assigns_own_name:
            name = self.function.name
            raise _error(
                self.function,
                f"Η συνάρτηση {name} δεν παίρνει ποτέ τιμή: λείπει μια εντολή {name} <- ...",
            )
        return self.scope

    # Declarations

    def declare(self, node: n.Constant | n.Variable) -> None:
        name = node.name
        if self.function and node.key == self.function.key:
            raise _error(
                node,
                f"Η συνάρτηση {name} δεν δηλώνεται στις ΜΕΤΑΒΛΗΤΕΣ. Παίρνει τιμή με {name} <- ...",
            )
        if node.key in self.scope:
            raise _error(node, f"Το όνομα {name} έχει ήδη δηλωθεί.")
        if node.key in BUILTINS:
            raise _error(node, f"Το {name} είναι όνομα ενσωματωμένης συνάρτησης.")
        if node.key in self.checker.subprograms:
            raise _error(node, f"Το {name} είναι όνομα υποπρογράμματος.")

    def constant_value(self, constant: n.Constant) -> int | float | str | bool:
        expr = constant.value
        if isinstance(expr, n.Literal):
            return expr.value
        if (
            isinstance(expr, n.Unary)
            and expr.op in ("-", "+")
            and isinstance(expr.operand, n.Literal)
            and isinstance(expr.operand.value, int | float)
            and not isinstance(expr.operand.value, bool)
        ):
            return -expr.operand.value if expr.op == "-" else expr.operand.value
        if isinstance(expr, n.Name) and (symbol := self.scope.get(expr.key)):
            if symbol.kind == "constant" and symbol.value is not None:
                return symbol.value
        raise _error(expr, "Μια σταθερά παίρνει συγκεκριμένη τιμή, π.χ. 10, 3.14 ή 'Αθήνα'.")

    def check_dimension(self, expr: n.Expr) -> None:
        value = None
        if isinstance(expr, n.Literal):
            value = expr.value
        elif isinstance(expr, n.Name) and (symbol := self.lookup(expr.key)):
            if symbol.kind == "constant":
                value = symbol.value
        if not (isinstance(value, int) and not isinstance(value, bool) and value > 0):
            raise _error(
                expr,
                "Το μέγεθος πίνακα πρέπει να είναι θετικός ακέραιος ή ακέραια σταθερά.",
            )

    def check_params(self, unit: n.Function | n.Procedure) -> None:
        seen: set[str] = set()
        for param in unit.params:
            if param.key in seen:
                raise _error(param, f"Η παράμετρος {param.name} υπάρχει δύο φορές.")
            seen.add(param.key)
            symbol = self.scope.get(param.key)
            if symbol is None or symbol.kind != "variable":
                raise _error(
                    param,
                    f"Η παράμετρος {param.name} πρέπει να δηλωθεί στις ΜΕΤΑΒΛΗΤΕΣ "
                    f"του {unit.name}, με τον τύπο της.",
                )

    def lookup(self, key: str) -> _Symbol | None:
        if symbol := self.scope.get(key):
            return symbol
        main = self.checker.main_scope.get(key)
        if main and main.kind == "constant" and self.unit is not self.checker.program:
            return main
        return None

    # Statements

    def statements(self, body: list[n.Stmt]) -> None:
        for stmt in body:
            self.statement(stmt)

    def statement(self, stmt: n.Stmt) -> None:
        match stmt:
            case n.Assign(target=target, value=value):
                if isinstance(target, n.Name) and self.function and target.key == self.function.key:
                    self.assigns_own_name = True
                else:
                    self.target(target)
                self.expr(value)
            case n.Read(targets=targets):
                for target in targets:
                    self.target(target)
            case n.Write(values=values):
                for value in values:
                    self.expr(value)
            case n.If(branches=branches, otherwise=otherwise):
                for branch in branches:
                    self.expr(branch.condition)
                    self.statements(branch.body)
                self.statements(otherwise or [])
            case n.Select(subject=subject, cases=cases, otherwise=otherwise):
                self.expr(subject)
                for case in cases:
                    for condition in case.conditions:
                        if isinstance(condition, n.CaseRange):
                            self.expr(condition.low)
                            self.expr(condition.high)
                        else:
                            self.expr(condition.value)
                    self.statements(case.body)
                self.statements(otherwise or [])
            case n.While(condition=condition, body=body):
                self.expr(condition)
                self.statements(body)
            case n.RepeatUntil(body=body, condition=condition):
                self.statements(body)
                self.expr(condition)
            case n.For(counter=counter, start=start, end=end, step=step, body=body):
                self.target(counter)
                for expr in (start, end, step):
                    if expr is not None:
                        self.expr(expr)
                self.statements(body)
            case n.CallProcedure():
                self.call_procedure(stmt)

    def target(self, target: n.Target) -> None:
        """A variable or element that gets a value (<-, ΔΙΑΒΑΣΕ, ΓΙΑ)."""
        symbol = self.resolve(target)
        if symbol.kind == "constant":
            raise _error(target, f"Το {target.name} είναι σταθερά και δεν αλλάζει τιμή.")
        self.check_indexing(target, symbol, whole_array_ok=False)

    def call_procedure(self, stmt: n.CallProcedure) -> None:
        sub = self.checker.subprograms.get(stmt.key)
        if isinstance(sub, n.Function) or stmt.key in BUILTINS:
            raise _error(
                stmt,
                f"Η {stmt.name} είναι συνάρτηση: χρησιμοποίησέ τη μέσα σε έκφραση, "
                f"π.χ. x <- {stmt.name}(...).",
            )
        if sub is None:
            raise _error(stmt, f"Η διαδικασία {stmt.name} δεν έχει οριστεί.")
        self.check_args(stmt, sub, stmt.args)

    def check_args(self, node: n.Node, sub: n.Function | n.Procedure, args: list[n.Expr]) -> None:
        if len(args) != len(sub.params):
            what = "συνάρτηση" if isinstance(sub, n.Function) else "διαδικασία"
            raise _error(
                node,
                f"Η {what} {sub.name} παίρνει "
                f"{_count(len(sub.params), 'παράμετρο', 'παραμέτρους')}, "
                f"αλλά δόθηκαν {len(args)}.",
            )
        for arg in args:
            self.expr(arg, whole_array_ok=True)

    # Expressions

    def expr(self, expr: n.Expr, whole_array_ok: bool = False) -> None:
        match expr:
            case n.Literal():
                pass
            case n.Name() | n.Index():
                symbol = self.resolve(expr)
                self.check_indexing(expr, symbol, whole_array_ok)
            case n.Call(args=args):
                self.call_function(expr, args)
            case n.Unary(operand=operand):
                self.expr(operand)
            case n.Binary(left=left, right=right):
                self.expr(left)
                self.expr(right)

    def call_function(self, call: n.Call, args: list[n.Expr]) -> None:
        if call.key in BUILTINS:
            if len(args) != 1:
                raise _error(call, f"Η συνάρτηση {call.name} παίρνει μία παράμετρο.")
            self.expr(args[0])
            return
        sub = self.checker.subprograms.get(call.key)
        if isinstance(sub, n.Procedure):
            raise _error(
                call,
                f"Η {call.name} είναι διαδικασία: καλείται με ΚΑΛΕΣΕ, όχι μέσα σε έκφραση.",
            )
        if sub is None:
            if self.lookup(call.key):
                raise _error(
                    call,
                    f"Το {call.name} δεν είναι συνάρτηση. "
                    f"Για στοιχείο πίνακα γράψε {call.name}[...].",
                )
            raise _error(call, f"Η συνάρτηση {call.name} δεν έχει οριστεί.")
        self.check_args(call, sub, args)

    def resolve(self, ref: n.Name | n.Index) -> _Symbol:
        if symbol := self.lookup(ref.key):
            return symbol
        if self.function and ref.key == self.function.key:
            raise _error(
                ref,
                f"Το όνομα της συνάρτησης {ref.name} μόνο παίρνει τιμή ({ref.name} <- ...), "
                "δεν διαβάζεται.",
            )
        sub = self.checker.subprograms.get(ref.key)
        if isinstance(sub, n.Function) or ref.key in BUILTINS:
            raise _error(ref, f"Η συνάρτηση {ref.name} καλείται με παρενθέσεις: {ref.name}(...).")
        if isinstance(sub, n.Procedure):
            raise _error(ref, f"Η {ref.name} είναι διαδικασία: καλείται με ΚΑΛΕΣΕ.")
        if self.unit is not self.checker.program and ref.key in self.checker.main_scope:
            raise _error(
                ref,
                f"Η {ref.name} δεν έχει δηλωθεί σε αυτό το υποπρόγραμμα. "
                "Δεν υπάρχουν καθολικές μεταβλητές: πέρασέ την ως παράμετρο.",
            )
        raise _error(ref, f"Η μεταβλητή {ref.name} δεν έχει δηλωθεί.")

    def check_indexing(self, ref: n.Name | n.Index, symbol: _Symbol, whole_array_ok: bool) -> None:
        if isinstance(ref, n.Index):
            for index in ref.indices:
                self.expr(index)
            if symbol.dimensions == 0:
                raise _error(ref, f"Το {ref.name} δεν είναι πίνακας.")
            if len(ref.indices) != symbol.dimensions:
                raise _error(
                    ref,
                    f"Ο πίνακας {ref.name} έχει "
                    f"{_count(symbol.dimensions, 'διάσταση', 'διαστάσεις')}, αλλά δόθηκαν "
                    f"{_count(len(ref.indices), 'δείκτης', 'δείκτες')}.",
                )
        elif symbol.dimensions and not whole_array_ok:
            raise _error(
                ref, f"Ο {ref.name} είναι πίνακας: γράψε ένα στοιχείο του, π.χ. {ref.name}[1]."
            )
