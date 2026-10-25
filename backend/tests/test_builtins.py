import math

import pytest

from app.glossa.builtins import BUILTINS
from app.glossa.errors import GlossaError


@pytest.mark.parametrize(
    ("name", "arg", "expected"),
    [
        ("ΗΜ", 30, 0.5),
        ("ΣΥΝ", 60, 0.5),
        ("ΕΦ", 45, 1.0),
        ("Τ_Ρ", 16, 4.0),
        ("ΛΟΓ", math.e, 1.0),
        ("Ε", 0, 1.0),
        ("Α_Μ", 7.9, 7),
        ("Α_Μ", -2.5, -3),
        ("Α_Τ", -3, 3),
    ],
)
def test_values(name: str, arg: float, expected: float) -> None:
    assert BUILTINS[name](arg) == pytest.approx(expected)


def test_integer_part_is_an_integer() -> None:
    assert isinstance(BUILTINS["Α_Μ"](7.9), int)


@pytest.mark.parametrize(("name", "arg"), [("Τ_Ρ", -1), ("ΛΟΓ", 0), ("ΕΦ", 90), ("ΕΦ", -90)])
def test_domain_errors_are_in_greek(name: str, arg: float) -> None:
    with pytest.raises(GlossaError) as exc:
        BUILTINS[name](arg)
    assert exc.value.kind == "runtime"
    assert name in exc.value.message
