"""The built-in functions of ΓΛΩΣΣΑ. Trigonometric ones take degrees.

The interpreter checks argument count, initialization and numeric type before
calling these; they only reject values outside the function's domain.
"""

import math
from collections.abc import Callable

from app.glossa.errors import GlossaError

Number = int | float


def hm(x: Number) -> float:
    return math.sin(math.radians(x))


def syn(x: Number) -> float:
    return math.cos(math.radians(x))


def ef(x: Number) -> float:
    if x % 180 == 90:
        raise GlossaError(f"Η συνάρτηση ΕΦ δεν ορίζεται για {x} μοίρες.")
    return math.tan(math.radians(x))


def t_r(x: Number) -> float:
    if x < 0:
        raise GlossaError("Η συνάρτηση Τ_Ρ δεν μπορεί να λάβει αρνητική τιμή.")
    return math.sqrt(x)


def log(x: Number) -> float:
    if x <= 0:
        raise GlossaError("Η συνάρτηση ΛΟΓ δεν μπορεί να λάβει αρνητική τιμή ή μηδέν.")
    return math.log(x)


def e(x: Number) -> float:
    try:
        return math.exp(x)
    except OverflowError:
        raise GlossaError("Το αποτέλεσμα της συνάρτησης Ε είναι πολύ μεγάλο.") from None


def a_m(x: Number) -> int:
    # Ακέραιο μέρος as in Greek school maths: the floor, so Α_Μ(-2.5) = -3.
    return math.floor(x)


def a_t(x: Number) -> Number:
    return abs(x)


# Keyed by the normalized name (uppercase, no accents), as the lexer emits it.
BUILTINS: dict[str, Callable[[Number], Number]] = {
    "ΗΜ": hm,
    "ΣΥΝ": syn,
    "ΕΦ": ef,
    "Τ_Ρ": t_r,
    "ΛΟΓ": log,
    "Ε": e,
    "Α_Μ": a_m,
    "Α_Τ": a_t,
}
