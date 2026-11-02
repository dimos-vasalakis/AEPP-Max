"""Αυτόματες τιμές (the navbar's dice): values for ΔΙΑΒΑΣΕ, so a student can test a program
with many inputs without typing them.

A value has the variable's type and is read like a typed one. Plain random values wouldn't
get a program far: a validation loop may never accept one, and a sentinel loop never ends.
So the values also come from what the code compares the variable with (ΑΝ, loop conditions,
ΠΕΡΙΠΤΩΣΗ): those values themselves, their neighbors, and the range between them.
"""

import math
import random
from collections.abc import Callable
from dataclasses import dataclass, field, fields

from app.glossa import nodes as n

# Then the run stops to ask, as without autofill: a program may read forever, and /run's
# request limit (schemas/run.py) must leave room for the values re-sent with typed ones.
MAX_AUTO_INPUTS = 500

COMPARISONS = {"=", "<>", "<", ">", "<=", ">="}

# Small numbers: they're checked by hand, and a count read from the student stays small.
DEFAULT_SPAN = (1, 20)
# Compared with something: 1 read in 3 of a text, 1 in 4 of a number (some exact, some next to it).
TEXT_LITERAL = 1 / 3
NUMBER_EXACT = 0.15
NUMBER_NEAR = 0.10
# Past this a literal says nothing useful, and it may not fit a float or the integer limit.
MAX_HINT = 10**15
# A longer text isn't offered: /run would refuse it re-sent with a typed value
# (schemas/run.py), and 500 copies of a long one would make a huge response.
MAX_HINT_CHARS = 100
# Tries at a first read that isn't a value the loop compares with.
REDRAWS = 20
# Numbers this close, in a loop's condition, may be a sentinel and another test (`x <> -1`
# and `x > 0`), which leaves too few values between them to be data.
NARROW = 10

NAMES = ("ΜΑΡΙΑ", "ΝΙΚΟΣ", "ΕΛΕΝΗ", "ΓΙΩΡΓΟΣ", "ΑΝΝΑ", "ΚΩΣΤΑΣ", "ΣΟΦΙΑ", "ΔΗΜΗΤΡΗΣ")


@dataclass
class _Hints:
    """What the code compares one variable (or array) with."""

    numbers: list[int | float] = field(default_factory=list)
    texts: list[str] = field(default_factory=list)
    logical: bool = False
    # In a loop's condition: on its first read, not a value that would end the loop (a
    # sentinel) before the program has seen any data.
    looping: bool = False
    # An array's index, or a ΓΙΑ's bound (which usually becomes one): stays inside the
    # arrays, so a made-up value doesn't fail a program that is fine with sensible input.
    bound: bool = False


@dataclass
class _Scope:
    hints: dict[str, _Hints] = field(default_factory=dict)
    read_before: set[str] = field(default_factory=set)
    constants: dict[str, int | float | str | bool] = field(default_factory=dict)
    smallest_array: int | None = None


class Autofill:
    def __init__(self, program: n.Unit):
        self.rng = random.Random()
        self.scopes: dict[int, _Scope] = {}
        self.collect(program)

    def value(self, key: str, type_name: str | None, unit: n.Unit) -> str:
        """The next value for the variable `key`, as typed. `type_name` is None in
        ψευδογλώσσα, where nothing is declared: the comparisons tell what it holds."""
        scope = self.scopes[id(unit)]
        hints = scope.hints.get(key, _Hints())
        first_of_loop = hints.looping and key not in scope.read_before
        scope.read_before.add(key)
        match type_name or self.inferred_type(hints):
            case "ΧΑΡΑΚΤΗΡΑΣ":
                return self.text(hints, first_of_loop)
            case "ΛΟΓΙΚΗ":
                return self.rng.choice(("ΑΛΗΘΗΣ", "ΨΕΥΔΗΣ"))
            case "ΠΡΑΓΜΑΤΙΚΗ":
                return self.real(hints, first_of_loop, scope)
            case _:
                return self.integer(hints, first_of_loop, scope)

    @staticmethod
    def inferred_type(hints: _Hints) -> str:
        if hints.texts:
            return "ΧΑΡΑΚΤΗΡΑΣ"
        if hints.logical:
            return "ΛΟΓΙΚΗ"
        if any(isinstance(number, float) for number in hints.numbers):
            return "ΠΡΑΓΜΑΤΙΚΗ"
        return "ΑΚΕΡΑΙΑ"

    def text(self, hints: _Hints, first_of_loop: bool) -> str:
        if hints.texts and not first_of_loop and self.rng.random() < TEXT_LITERAL:
            return self.rng.choice(hints.texts)
        return self.rng.choice([name for name in NAMES if name not in hints.texts] or NAMES)

    def integer(self, hints: _Hints, first_of_loop: bool, scope: _Scope) -> str:
        if (picked := self.from_literals(hints, first_of_loop)) is not None:
            return str(math.floor(picked))
        low, high = self.span(hints, scope)
        least = math.ceil(low)
        most = max(least, math.floor(high))
        return str(self.drawn(lambda: self.rng.randint(least, most), hints, first_of_loop))

    def real(self, hints: _Hints, first_of_loop: bool, scope: _Scope) -> str:
        picked = self.from_literals(hints, first_of_loop)
        if picked is None:
            low, high = self.span(hints, scope)
            # Enough decimals to land between numbers close together (`x > 0 ΚΑΙ x < 0.04`).
            digits = 1 if high - low >= 1 else min(8, 1 + math.ceil(-math.log10(high - low)))
            picked = self.drawn(
                lambda: round(self.rng.uniform(low, high), digits), hints, first_of_loop
            )
        # 8 decimals: as far as comparisons look. Never an exponent: ΔΙΑΒΑΣΕ doesn't read
        # those. + 0.0: no «-0».
        return f"{round(picked, 8) + 0.0:.8f}".rstrip("0").rstrip(".")

    def drawn(
        self, draw: Callable[[], int | float], hints: _Hints, first_of_loop: bool
    ) -> int | float:
        """A drawn number; on a loop's first read, not one the loop compares with."""
        value = draw()
        for _ in range(REDRAWS):
            if not first_of_loop or value not in hints.numbers:
                break
            value = draw()
        return value

    def span(self, hints: _Hints, scope: _Scope) -> tuple[int | float, int | float]:
        """Where a number is drawn from: between the numbers compared with, or around just one."""
        low, high = DEFAULT_SPAN
        if hints.numbers:
            low, high = min(hints.numbers), max(hints.numbers)
            if low == high:
                # `x <> -1` or `x > 0`: above it. `x < 100` or `x >= 18`: on both sides of it.
                low, high = (low + 1, low + 20) if low <= 0 else (max(1, low - 10), low + 10)
            elif hints.looping and 1 <= high - low < NARROW:
                high = low + DEFAULT_SPAN[1]
        if hints.bound and scope.smallest_array is not None and low < scope.smallest_array:
            high = min(high, scope.smallest_array)
        return low, high

    def from_literals(self, hints: _Hints, first_of_loop: bool) -> int | float | None:
        """Sometimes one of the numbers compared with, or one next to it; else None."""
        if not hints.numbers or first_of_loop:
            return None
        chance = self.rng.random()
        if chance < NUMBER_EXACT:
            return self.rng.choice(hints.numbers)
        if chance < NUMBER_EXACT + NUMBER_NEAR:
            return self.rng.choice(hints.numbers) + self.rng.choice((-1, 1))
        return None

    # What the code compares each variable with

    def collect(self, program: n.Unit) -> None:
        main = _Scope()
        for constant in program.constants:
            literal = self.literal(constant.value, main)
            if literal is not None:
                main.constants[constant.key] = literal
        for unit in (program, *getattr(program, "subprograms", [])):
            scope = main if unit is program else _Scope(constants=main.constants.copy())
            self.scopes[id(unit)] = scope
            if unit is not program:
                # A local variable wins over a main constant with the same name.
                for variable in unit.variables:
                    scope.constants.pop(variable.key, None)
                for constant in unit.constants:
                    literal = self.literal(constant.value, scope)
                    if literal is not None:
                        scope.constants[constant.key] = literal
            for variable in unit.variables:
                for dimension in variable.dimensions:
                    size = self.literal(dimension, scope)
                    if type(size) is int and size > 0:
                        scope.smallest_array = min(scope.smallest_array or size, size)
            # Walk one unit at a time, without descending into its subprograms.
            # A stack avoids Python recursion limits on deeply nested student code.
            stack: list[tuple[n.Node, bool]] = [(unit, False)]
            while stack:
                node, in_loop = stack.pop()
                match node:
                    case n.Binary(op=op, left=left, right=right) if op in COMPARISONS:
                        self.compare(left, right, in_loop, scope)
                        self.compare(right, left, in_loop, scope)
                    case n.Select(subject=subject, cases=cases):
                        for case in cases:
                            for condition in case.conditions:
                                for expr in _case_values(condition):
                                    self.compare(subject, expr, False, scope)
                    case n.For(start=start, end=end):
                        self.mark_bound([start, end], scope)
                    case n.Index(indices=indices):
                        self.mark_bound(indices, scope)
                for item in fields(node):
                    if item.name == "subprograms":
                        continue
                    value = getattr(node, item.name)
                    is_condition = item.name == "condition" and isinstance(
                        node, n.While | n.RepeatUntil
                    )
                    for child in value if isinstance(value, list) else [value]:
                        if isinstance(child, n.Node):
                            stack.append((child, in_loop or is_condition))

    def compare(self, side: n.Expr, other: n.Expr, in_loop: bool, scope: _Scope) -> None:
        if not isinstance(side, n.Name | n.Index):
            return
        literal = self.literal(other, scope)
        if literal is None:
            return
        hints = scope.hints.setdefault(side.key, _Hints())
        hints.looping = hints.looping or in_loop
        match literal:
            case bool():
                hints.logical = True
            case str():
                if len(literal) <= MAX_HINT_CHARS:
                    hints.texts.append(literal)
            case _ if abs(literal) <= MAX_HINT:
                hints.numbers.append(literal)

    def mark_bound(self, exprs: list[n.Expr], scope: _Scope) -> None:
        for expr in exprs:
            if isinstance(expr, n.Name):
                scope.hints.setdefault(expr.key, _Hints()).bound = True

    @staticmethod
    def literal(expr: n.Expr, scope: _Scope) -> int | float | str | bool | None:
        match expr:
            case n.Literal(value=value):
                return value
            case n.Unary(op="-", operand=n.Literal(value=int() | float() as value)) if (
                not isinstance(value, bool)
            ):
                return -value
            case n.Name(key=key):
                return scope.constants.get(key)
        return None


def _case_values(condition: n.CaseCondition) -> list[n.Expr]:
    if isinstance(condition, n.CaseRange):
        return [condition.low, condition.high]
    return [condition.value]
