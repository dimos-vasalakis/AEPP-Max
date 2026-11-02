"""Αυτόματες τιμές: ΔΙΑΒΑΣΕ gets made-up values, so a program with many inputs runs to its
end. The values are random, so each property is checked over many runs."""

import pytest
from fastapi.testclient import TestClient

from app.glossa import RunResult, run
from app.glossa.autofill import MAX_AUTO_INPUTS
from app.main import app

RUNS = 40


def filled(source: str, language: str = "glossa", trace: bool = False) -> RunResult:
    return run(source, language=language, trace=trace, autofill=True)  # type: ignore[arg-type]


def values(result: RunResult) -> list[str]:
    return [auto.value for auto in result.auto_inputs]


def program(declarations: str, body: str) -> str:
    return f"ΠΡΟΓΡΑΜΜΑ Τ\nΜΕΤΑΒΛΗΤΕΣ\n{declarations}\nΑΡΧΗ\n{body}\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n"


def test_off_by_default_the_run_asks():
    result = run(program("ΑΚΕΡΑΙΕΣ: x", "ΔΙΑΒΑΣΕ x"))
    assert result.status == "needs_input"
    assert result.auto_inputs == []


@pytest.mark.parametrize(
    "declaration",
    ["ΑΚΕΡΑΙΕΣ: α", "ΠΡΑΓΜΑΤΙΚΕΣ: α", "ΧΑΡΑΚΤΗΡΕΣ: α", "ΛΟΓΙΚΕΣ: α"],
)
def test_every_type_gets_a_value_it_can_read(declaration):
    for _ in range(RUNS):
        result = filled(program(declaration, "ΔΙΑΒΑΣΕ α\nΓΡΑΨΕ α"))
        assert result.status == "ok", result.error
        assert len(result.auto_inputs) == 1


def test_many_array_elements_take_one_run():
    source = program(
        "ΑΚΕΡΑΙΕΣ: i, Π[300]", "ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 300\n  ΔΙΑΒΑΣΕ Π[i]\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
    )
    result = filled(source)
    assert result.status == "ok", result.error
    assert len(result.auto_inputs) == 300


def test_a_number_compared_with_nothing_is_small():
    for _ in range(RUNS):
        assert 1 <= int(values(filled(program("ΑΚΕΡΑΙΕΣ: x", "ΔΙΑΒΑΣΕ x")))[0]) <= 20


def test_a_validation_loop_ends_with_a_value_in_its_range():
    source = program(
        "ΑΚΕΡΑΙΕΣ: β",
        "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ\n  ΔΙΑΒΑΣΕ β\nΜΕΧΡΙΣ_ΟΤΟΥ β >= 0 ΚΑΙ β <= 20\nΓΡΑΨΕ β",
    )
    for _ in range(RUNS):
        result = filled(source)
        assert result.status == "ok", result.error
        assert 0 <= int(result.output[-1]) <= 20


def test_a_validation_loop_on_text_ends_with_one_of_its_words():
    source = program(
        "ΧΑΡΑΚΤΗΡΕΣ: φ",
        "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ\n  ΔΙΑΒΑΣΕ φ\nΜΕΧΡΙΣ_ΟΤΟΥ φ = 'Α' Ή φ = 'Γ'\nΓΡΑΨΕ φ",
    )
    for _ in range(RUNS):
        result = filled(source)
        assert result.status == "ok", result.error
        assert result.output[-1] in ("Α", "Γ")


def test_a_validation_loop_below_a_limit_ends():
    source = program("ΑΚΕΡΑΙΕΣ: x", "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ\n  ΔΙΑΒΑΣΕ x\nΜΕΧΡΙΣ_ΟΤΟΥ x < 0")
    for _ in range(RUNS):
        assert filled(source).status == "ok"


@pytest.mark.parametrize(
    ("declarations", "stop", "constants"),
    [
        ("ΑΚΕΡΑΙΕΣ: x", "-1", ""),
        ("ΧΑΡΑΚΤΗΡΕΣ: x", "'ΤΕΛΟΣ'", ""),
        ("ΑΚΕΡΑΙΕΣ: x", "ΦΡΟΥΡΟΣ", "ΣΤΑΘΕΡΕΣ\nΦΡΟΥΡΟΣ = -1\n"),
    ],
)
def test_a_sentinel_loop_ends_but_not_before_any_data(declarations, stop, constants):
    source = (
        f"ΠΡΟΓΡΑΜΜΑ Τ\n{constants}ΜΕΤΑΒΛΗΤΕΣ\n{declarations}\nΑΡΧΗ\n"
        f"ΔΙΑΒΑΣΕ x\nΟΣΟ x <> {stop} ΕΠΑΝΑΛΑΒΕ\n  ΔΙΑΒΑΣΕ x\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n"
        "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n"
    )
    for _ in range(RUNS):
        result = filled(source)
        assert result.status == "ok", result.error
        assert len(result.auto_inputs) >= 2


def test_unused_procedure_constant_cannot_change_main_sentinel():
    source = (
        "ΠΡΟΓΡΑΜΜΑ Τ\nΣΤΑΘΕΡΕΣ\nΟΡΙΟ = 100\nΜΕΤΑΒΛΗΤΕΣ\nΑΚΕΡΑΙΕΣ: x\nΑΡΧΗ\n"
        "ΔΙΑΒΑΣΕ x\nΟΣΟ x <> ΟΡΙΟ ΕΠΑΝΑΛΑΒΕ\n  ΔΙΑΒΑΣΕ x\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n"
        "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n"
        "ΔΙΑΔΙΚΑΣΙΑ Αχρηστη()\nΣΤΑΘΕΡΕΣ\nΟΡΙΟ = -1\nΑΡΧΗ\n"
        "ΓΡΑΨΕ ΟΡΙΟ\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ\n"
    )
    result = filled(source)
    assert result.status == "ok", result.error
    assert "100" in values(result)


def test_called_procedure_uses_its_own_input_hints_and_constant():
    source = (
        "ΠΡΟΓΡΑΜΜΑ Τ\nΣΤΑΘΕΡΕΣ\nΟΡΙΟ = 100\nΜΕΤΑΒΛΗΤΕΣ\nΑΚΕΡΑΙΕΣ: x\nΑΡΧΗ\n"
        "ΚΑΛΕΣΕ Τοπικη()\nΔΙΑΒΑΣΕ x\nΟΣΟ x <> ΟΡΙΟ ΕΠΑΝΑΛΑΒΕ\n"
        "  ΔΙΑΒΑΣΕ x\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n"
        "ΔΙΑΔΙΚΑΣΙΑ Τοπικη()\nΣΤΑΘΕΡΕΣ\nΟΡΙΟ = -1\n"
        "ΜΕΤΑΒΛΗΤΕΣ\nΑΚΕΡΑΙΕΣ: x\nΑΡΧΗ\n"
        "ΔΙΑΒΑΣΕ x\nΟΣΟ x <> ΟΡΙΟ ΕΠΑΝΑΛΑΒΕ\n"
        "  ΔΙΑΒΑΣΕ x\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ\n"
    )
    result = filled(source)
    assert result.status == "ok", result.error
    assert "-1" in values(result)
    assert "100" in values(result)


def test_procedure_variable_shadows_main_constant_in_comparisons():
    source = (
        "ΠΡΟΓΡΑΜΜΑ Τ\nΣΤΑΘΕΡΕΣ\nΟΡΙΟ = 100\nΑΡΧΗ\n"
        "ΚΑΛΕΣΕ Τοπικη()\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n"
        "ΔΙΑΔΙΚΑΣΙΑ Τοπικη()\nΜΕΤΑΒΛΗΤΕΣ\nΑΚΕΡΑΙΕΣ: ΟΡΙΟ, x\nΑΡΧΗ\n"
        "ΟΡΙΟ <- -1\nΔΙΑΒΑΣΕ x\nΟΣΟ x <> ΟΡΙΟ ΕΠΑΝΑΛΑΒΕ\n"
        "  ΔΙΑΒΑΣΕ x\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ\n"
    )
    result = filled(source)
    # A mutable variable is not a literal hint; use the usual small-number range
    # instead of incorrectly treating it as the main program's constant (100).
    assert result.status == "needs_input"
    assert len(values(result)) == MAX_AUTO_INPUTS
    assert all(1 <= int(value) <= 20 for value in values(result))


def test_a_case_value_can_come_up():
    source = program(
        "ΑΚΕΡΑΙΕΣ: κ",
        "ΔΙΑΒΑΣΕ κ\nΕΠΙΛΕΞΕ κ\n  ΠΕΡΙΠΤΩΣΗ 1\n    ΓΡΑΨΕ κ\n"
        "  ΠΕΡΙΠΤΩΣΗ 3\n    ΓΡΑΨΕ κ\nΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
    )
    # Between the two values: not a default 1 to 20.
    seen = {int(values(filled(source))[0]) for _ in range(RUNS)}
    assert seen & {1, 3}
    assert max(seen) <= 4
    assert min(seen) >= 0


@pytest.mark.parametrize("declaration", ["ΠΡΑΓΜΑΤΙΚΕΣ: x", "ΑΚΕΡΑΙΕΣ: x"])
def test_a_huge_literal_is_ignored(declaration):
    source = program(declaration, f"ΔΙΑΒΑΣΕ x\nΑΝ x > {10**20} ΤΟΤΕ\n  ΓΡΑΨΕ x\nΤΕΛΟΣ_ΑΝ")
    for _ in range(RUNS):
        result = filled(source)
        assert result.status == "ok", result.error
        assert 1 <= float(values(result)[0]) <= 20


def test_an_integer_compared_with_a_real_still_reads():
    source = program("ΑΚΕΡΑΙΕΣ: x", "ΔΙΑΒΑΣΕ x\nΑΝ x > 2.5 ΤΟΤΕ\n  ΓΡΑΨΕ x\nΤΕΛΟΣ_ΑΝ")
    for _ in range(RUNS):
        assert filled(source).status == "ok"


@pytest.mark.parametrize("stop", ["5", "999", "-1"])
def test_a_sentinel_is_never_the_first_value(stop):
    source = program(
        "ΑΚΕΡΑΙΕΣ: x", f"ΔΙΑΒΑΣΕ x\nΟΣΟ x <> {stop} ΕΠΑΝΑΛΑΒΕ\n  ΔΙΑΒΑΣΕ x\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
    )
    for _ in range(RUNS * 5):
        assert values(filled(source))[0] != stop


def test_a_sentinel_with_another_test_on_the_variable_still_gets_data():
    # The textbook's shape: -1 and 0 alone would leave nothing between them to read.
    source = program(
        "ΑΚΕΡΑΙΕΣ: x, c",
        "c <- 0\nΔΙΑΒΑΣΕ x\nΟΣΟ x <> -1 ΕΠΑΝΑΛΑΒΕ\n  ΑΝ x > 0 ΤΟΤΕ\n    c <- c + 1\n"
        "  ΤΕΛΟΣ_ΑΝ\n  ΔΙΑΒΑΣΕ x\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\nΓΡΑΨΕ c",
    )
    results = [filled(source) for _ in range(RUNS)]
    assert all(result.status == "ok" for result in results)
    assert all(values(result)[0] != "-1" for result in results)
    assert sum(len(result.auto_inputs) for result in results) > 3 * RUNS
    assert any(max(int(value) for value in values(result)) > 1 for result in results)


@pytest.mark.parametrize("until", ["x = 0.125", "x > 0 ΚΑΙ x < 0.04"])
def test_a_loop_on_a_fine_real_ends(until):
    source = program("ΠΡΑΓΜΑΤΙΚΕΣ: x", f"ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ\n  ΔΙΑΒΑΣΕ x\nΜΕΧΡΙΣ_ΟΤΟΥ {until}")
    for _ in range(RUNS):
        assert filled(source).status == "ok"


def test_a_real_is_never_minus_zero():
    source = program("ΠΡΑΓΜΑΤΙΚΕΣ: x", "ΔΙΑΒΑΣΕ x\nΑΝ x >= -1 ΚΑΙ x <= 1 ΤΟΤΕ\n  ΓΡΑΨΕ x\nΤΕΛΟΣ_ΑΝ")
    assert all(values(filled(source))[0] != "-0" for _ in range(RUNS * 25))


def test_a_long_text_in_the_code_is_not_offered():
    long = "Α" * 101
    source = program(
        "ΧΑΡΑΚΤΗΡΕΣ: φ", f"ΔΙΑΒΑΣΕ φ\nΟΣΟ φ <> '{long}' ΕΠΑΝΑΛΑΒΕ\n  ΔΙΑΒΑΣΕ φ\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
    )
    result = filled(source)
    assert result.status == "needs_input"
    assert all(len(value) <= 100 for value in values(result))


@pytest.mark.parametrize(
    ("constants", "size"), [("", "10"), ("ΣΤΑΘΕΡΕΣ\nΜΕΓΕΘΟΣ = 10\n", "ΜΕΓΕΘΟΣ")]
)
def test_a_count_stays_inside_the_arrays(constants, size):
    source = (
        f"ΠΡΟΓΡΑΜΜΑ Τ\n{constants}ΜΕΤΑΒΛΗΤΕΣ\nΑΚΕΡΑΙΕΣ: ν, i, Π[{size}]\nΑΡΧΗ\n"
        "ΔΙΑΒΑΣΕ ν\nΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ ν\n  ΔΙΑΒΑΣΕ Π[i]\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n"
        "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n"
    )
    for _ in range(RUNS):
        result = filled(source)
        assert result.status == "ok", result.error


def test_array_elements_are_not_held_to_its_size():
    source = program("ΑΚΕΡΑΙΕΣ: i, Π[2]", "ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 2\n  ΔΙΑΒΑΣΕ Π[i]\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ")
    seen = {int(value) for _ in range(RUNS) for value in values(filled(source))}
    assert max(seen) > 2


def test_a_program_that_never_stops_reading_asks_after_the_cap():
    source = program("ΑΚΕΡΑΙΕΣ: x", "ΟΣΟ ΑΛΗΘΗΣ ΕΠΑΝΑΛΑΒΕ\n  ΔΙΑΒΑΣΕ x\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ")
    result = filled(source)
    assert result.status == "needs_input"
    assert result.input_line == 6
    assert len(result.auto_inputs) == MAX_AUTO_INPUTS


def test_values_given_first_are_used_first():
    source = program("ΑΚΕΡΑΙΕΣ: x, y", "ΔΙΑΒΑΣΕ x, y\nΓΡΑΨΕ x")
    result = run(source, ["7"], autofill=True)
    assert result.output == ["7"]
    assert len(result.auto_inputs) == 1


def test_the_same_values_replay_the_same_run():
    # A typed value after the cap re-runs from the start with the values as inputs.
    source = program(
        "ΑΚΕΡΑΙΕΣ: x, σ",
        "σ <- 0\nΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ\n  ΔΙΑΒΑΣΕ x\n  σ <- σ + x\nΜΕΧΡΙΣ_ΟΤΟΥ x < 0\nΓΡΑΨΕ σ",
    )
    first = filled(source)
    again = run(source, values(first))
    assert again.status == "ok"
    assert again.output == first.output
    assert again.auto_inputs == []


def test_each_value_says_where_it_was_read():
    source = program(
        "ΑΚΕΡΑΙΕΣ: x, y",
        "ΓΡΑΨΕ 'πρώτη'\nΔΙΑΒΑΣΕ x\nΓΡΑΨΕ 'δεύτερη'\nΓΡΑΨΕ 'τρίτη'\nΔΙΑΒΑΣΕ y",
    )
    result = filled(source, trace=True)
    assert [auto.output for auto in result.auto_inputs] == [1, 3]
    assert result.trace is not None
    assert [result.trace[auto.step].line for auto in result.auto_inputs] == [6, 9]
    # The trace's rows show the values, as for typed ones.
    assert result.trace[result.auto_inputs[0].step].changes["x"] == result.auto_inputs[0].value


def test_algorithm_values_follow_the_comparisons():
    source = (
        "Αλγόριθμος Τ\nΔεδομένα // α //\n"
        'Αν α = "ΝΑΙ" τότε\n  Εκτύπωσε α\nΤέλος_αν\nΔιάβασε β\nΕκτύπωσε β\nΤέλος Τ\n'
    )
    for _ in range(RUNS):
        result = filled(source, "pseudocode", trace=True)
        assert result.status == "ok", result.error
        first, second = values(result)
        assert not first.lstrip("-").isdigit()  # compared with text
        assert second.isdigit()  # compared with nothing: a number
        assert result.auto_inputs[0].step == 0  # the Δεδομένα's row


def test_the_api_takes_autofill():
    client = TestClient(app)
    code = program("ΑΚΕΡΑΙΕΣ: x", "ΔΙΑΒΑΣΕ x\nΓΡΑΨΕ x")
    body = client.post("/api/v1/run", json={"code": code, "autofill": True}).json()
    assert body["status"] == "ok"
    assert body["output"] == [body["auto_inputs"][0]["value"]]
    assert client.post("/api/v1/run", json={"code": code}).json()["status"] == "needs_input"
