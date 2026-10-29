"""Static checks on parsed ψευδογλώσσα algorithms.

Nothing is declared, so there is less to check than in ΓΛΩΣΣΑ: values and
types are left to the runtime. What is checked: which names are arrays (a name
used with [...], or passed where an array goes) and that they're used that way
everywhere, and the calls between algorithms (Κάλεσε and calls in expressions).
"""

from collections.abc import Iterator
from dataclasses import fields

from app.glossa import nodes as n
from app.glossa.builtins import BUILTINS
from app.glossa.checker import _count, _error


def check_algorithms(main: n.Algorithm) -> None:
    """Raise GlossaError(kind="syntax") at the first problem; fill each
    algorithm's `arrays`."""
    _Checker(main).run()


def _nodes(value: object) -> Iterator[n.Node]:
    """Every node in a statement list, depth first."""
    if isinstance(value, list):
        for item in value:
            yield from _nodes(item)
    elif isinstance(value, n.Node):
        yield value
        for f in fields(value):
            yield from _nodes(getattr(value, f.name))


def _calls(body: list[n.Stmt]) -> Iterator[n.Call | n.CallProcedure]:
    for node in _nodes(body):
        if isinstance(node, n.Call | n.CallProcedure):
            yield node


class _Checker:
    def __init__(self, main: n.Algorithm):
        self.everything = [main, *main.subprograms]
        self.algorithms: dict[str, n.Algorithm] = {}

    def run(self) -> None:
        for algorithm in self.everything:
            if algorithm.key in BUILTINS:
                raise _error(
                    algorithm, f"Το {algorithm.name} είναι όνομα ενσωματωμένης συνάρτησης."
                )
            if algorithm.key in self.algorithms:
                raise _error(algorithm, f"Υπάρχει ήδη αλγόριθμος με το όνομα {algorithm.name}.")
            self.algorithms[algorithm.key] = algorithm
        for algorithm in self.everything:
            self.index_shapes(algorithm)
        self.call_shapes()
        for algorithm in self.everything:
            _AlgorithmChecker(self, algorithm).run()

    def index_shapes(self, algorithm: n.Algorithm) -> None:
        """Arrays by their use with [...]: the same number of indices every time."""
        for node in _nodes(algorithm.body):
            if isinstance(node, n.Index):
                self.set_shape(algorithm, node, len(node.indices))

    def call_shapes(self) -> None:
        """A name passed where the other side is an array is an array too, as
        when a whole array goes through to a third algorithm."""
        changed = True
        while changed:
            changed = False
            for caller in self.everything:
                for call in _calls(caller.body):
                    callee = self.algorithms.get(call.key)
                    if callee is None:
                        continue
                    for param, arg in zip(callee.params, call.args, strict=False):
                        if not isinstance(arg, n.Name):
                            continue
                        theirs = callee.arrays.get(param.key)
                        ours = caller.arrays.get(arg.key)
                        if theirs is not None:
                            changed = self.set_shape(caller, arg, theirs) or changed
                        elif ours is not None:
                            changed = self.set_shape(callee, param, ours) or changed

    @staticmethod
    def set_shape(algorithm: n.Algorithm, ref: n.Name | n.Index, dims: int) -> bool:
        known = algorithm.arrays.get(ref.key)
        if known is None:
            algorithm.arrays[ref.key] = dims
            return True
        if known != dims:
            raise _error(
                ref,
                f"Ο πίνακας {ref.name} χρησιμοποιείται αλλού με "
                f"{_count(known, 'δείκτη', 'δείκτες')}, εδώ με {dims}.",
            )
        return False


class _AlgorithmChecker:
    def __init__(self, checker: _Checker, algorithm: n.Algorithm):
        self.checker = checker
        self.algorithm = algorithm

    @property
    def arrays(self) -> dict[str, int]:
        return self.algorithm.arrays

    def run(self) -> None:
        for names, word in (
            (self.algorithm.data, "Δεδομένα"),
            (self.algorithm.results, "Αποτελέσματα"),
        ):
            seen: set[str] = set()
            for name in names:
                if name.key in seen:
                    raise _error(name, f"Το {name.name} υπάρχει δύο φορές στα {word}.")
                seen.add(name.key)
                self.not_reserved(name)
        self.statements(self.algorithm.body)

    def not_reserved(self, ref: n.Name | n.Index) -> None:
        if ref.key in self.checker.algorithms:
            raise _error(
                ref,
                f"Το {ref.name} είναι όνομα αλγορίθμου: καλείται με Κάλεσε {ref.name}(...), "
                "δεν είναι μεταβλητή.",
            )
        if ref.key in BUILTINS:
            raise _error(ref, f"Η συνάρτηση {ref.name} καλείται με παρενθέσεις: {ref.name}(...).")

    # Statements

    def statements(self, body: list[n.Stmt]) -> None:
        for stmt in body:
            self.statement(stmt)

    def statement(self, stmt: n.Stmt) -> None:
        match stmt:
            case n.Assign(target=target, value=value):
                self.target(target)
                self.expr(value)
            case n.Read(targets=targets):
                for target in targets:
                    self.target(target)
            case n.Write(values=values):
                for value in values:
                    self.expr(value)
            case n.Swap(first=first, second=second):
                self.target(first)
                self.target(second)
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
                self.call_statement(stmt)

    def target(self, target: n.Target) -> None:
        """A variable or element that gets a value (←, Διάβασε, Για, Αντιμετάθεσε)."""
        self.not_reserved(target)
        self.ref(target)

    def call_statement(self, stmt: n.CallProcedure) -> None:
        if stmt.key in BUILTINS:
            raise _error(
                stmt,
                f"Η {stmt.name} είναι συνάρτηση: χρησιμοποίησέ τη μέσα σε έκφραση, "
                f"π.χ. x ← {stmt.name}(...).",
            )
        callee = self.callee(stmt)
        params = callee.params
        if len(stmt.args) != len(params):
            names = ", ".join(param.name for param in params)
            raise _error(
                stmt,
                f"Ο αλγόριθμος {callee.name} παίρνει "
                f"{_count(len(params), 'παράμετρο', 'παραμέτρους')}"
                f"{f' ({names})' if names else ''}: τα Δεδομένα του και μετά τα Αποτελέσματά του. "
                f"Δόθηκαν {len(stmt.args)}.",
            )
        for param, arg in zip(params, stmt.args, strict=True):
            if callee.is_result(param.key) and not isinstance(arg, n.Name | n.Index):
                raise _error(
                    arg,
                    f"Το {param.name} είναι αποτέλεσμα του {callee.name}: "
                    "δώσε μια μεταβλητή, για να πάρει την τιμή του.",
                )
            self.argument(callee, param, arg)

    def callee(self, call: n.Call | n.CallProcedure) -> n.Algorithm:
        callee = self.checker.algorithms.get(call.key)
        if callee is None:
            if call.key in self.arrays:
                raise _error(
                    call,
                    f"Το {call.name} είναι πίνακας. Για στοιχείο του γράψε {call.name}[...].",
                )
            raise _error(call, f"Ο αλγόριθμος {call.name} δεν έχει οριστεί.")
        return callee

    def argument(self, callee: n.Algorithm, param: n.Name, arg: n.Expr) -> None:
        if param.key in callee.arrays and not (isinstance(arg, n.Name) and arg.key in self.arrays):
            raise _error(arg, f"Το {param.name} του {callee.name} είναι πίνακας: δώσε έναν πίνακα.")
        if isinstance(arg, n.Name) and arg.key in self.arrays:
            if param.key not in callee.arrays:
                raise _error(
                    arg,
                    f"Ο {arg.name} είναι πίνακας, ενώ το {param.name} του {callee.name} δεν είναι.",
                )
            return
        self.expr(arg)

    # Expressions

    def expr(self, expr: n.Expr) -> None:
        match expr:
            case n.Literal():
                pass
            case n.Name() | n.Index():
                self.not_reserved(expr)
                self.ref(expr)
            case n.Call(args=args):
                self.call_expression(expr, args)
            case n.Unary(operand=operand):
                self.expr(operand)
            case n.Binary(left=left, right=right):
                self.expr(left)
                self.expr(right)

    def ref(self, ref: n.Name | n.Index) -> None:
        if isinstance(ref, n.Index):
            for index in ref.indices:
                self.expr(index)
        elif ref.key in self.arrays:
            raise _error(
                ref, f"Ο {ref.name} είναι πίνακας: γράψε ένα στοιχείο του, π.χ. {ref.name}[1]."
            )

    def call_expression(self, call: n.Call, args: list[n.Expr]) -> None:
        if call.key in BUILTINS:
            if len(args) != 1:
                raise _error(call, f"Η συνάρτηση {call.name} παίρνει μία παράμετρο.")
            self.expr(args[0])
            return
        callee = self.callee(call)
        results = callee.results
        if len(results) != 1:
            raise _error(
                call,
                f"Μέσα σε έκφραση μπαίνει μόνο αλγόριθμος με ένα αποτέλεσμα, και ο "
                f"{callee.name} έχει {len(results)}. Κάλεσέ τον με Κάλεσε {callee.name}(...).",
            )
        if results[0].key in callee.arrays:
            raise _error(
                call,
                f"Ο {callee.name} δίνει πίνακα: κάλεσέ τον με Κάλεσε {callee.name}(...).",
            )
        if len(args) != len(callee.data):
            raise _error(
                call,
                f"Μέσα σε έκφραση ο {callee.name} παίρνει τα Δεδομένα του: "
                f"{_count(len(callee.data), 'τιμή', 'τιμές')}, αλλά δόθηκαν {len(args)}.",
            )
        for param, arg in zip(callee.data, args, strict=True):
            self.argument(callee, param, arg)
