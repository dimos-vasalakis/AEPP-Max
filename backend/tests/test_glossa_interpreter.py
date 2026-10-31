import pytest

from app.glossa import RunLimits, RunResult, check, run
from app.glossa.interpreter import SNAPSHOT_ARRAY_CELLS, SNAPSHOT_CELLS
from app.glossa.result import Frame


def program(body: str, declarations: str = "", subprograms: str = "") -> str:
    return f"ΠΡΟΓΡΑΜΜΑ Δοκιμή\n{declarations}\nΑΡΧΗ\n{body}\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n{subprograms}"


def output(body: str, declarations: str = "", inputs: list[str] | None = None) -> list[str]:
    result = run(program(body, declarations), inputs)
    assert result.status == "ok", result.error
    return result.output


def error(body: str, declarations: str = "", inputs: list[str] | None = None) -> tuple[str, int]:
    result = run(program(body, declarations), inputs)
    assert result.status == "error", result
    assert result.error is not None and result.error.kind == "runtime"
    assert result.error.line is not None
    return result.error.message, result.error.line


WATER = """ΠΡΟΓΡΑΜΜΑ Υπολογισμός_Ποσότητας_Νερού
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: άτομα
  ΑΚΕΡΑΙΕΣ: ημέρες
  ΠΡΑΓΜΑΤΙΚΕΣ: ποσότητα

ΑΡΧΗ
! Είσοδος
  ΔΙΑΒΑΣΕ άτομα
  ΔΙΑΒΑΣΕ ημέρες

! Επεξεργασία
  ποσότητα <- ημέρες* 2.5
  ποσότητα <- ποσότητα + 5
  ποσότητα <- ποσότητα* άτομα

! Έξοδος
  ΓΡΑΨΕ ποσότητα
ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ
"""


class TestRunning:
    def test_a_whole_program(self) -> None:
        result = run(WATER, ["4", "3"])
        assert result.status == "ok"
        assert result.output == ["50"]
        assert result.steps == 6

    def test_asks_for_input_when_it_runs_out(self) -> None:
        result = run(WATER, ["4"])
        assert result.status == "needs_input"
        assert result.output == []
        assert result.input_line == 10  # the second ΔΙΑΒΑΣΕ, which the editor marks
        assert run(WATER, ["4", "3"]).status == "ok"
        assert run(WATER, ["4", "3"]).input_line is None

    def test_the_prompt_comes_before_the_question(self) -> None:
        body = "  ΓΡΑΨΕ 'Δώσε αριθμό: '\n  ΔΙΑΒΑΣΕ x\n  ΓΡΑΨΕ 'Διπλάσιο: ', 2 * x"
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x"), [])
        assert result.status == "needs_input"
        assert result.output == ["Δώσε αριθμό:"]
        assert output(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x", ["21"]) == ["Δώσε αριθμό:", "Διπλάσιο: 42"]


class TestWrite:
    def test_joins_values_with_a_space_only_between_numbers(self) -> None:
        assert output("  ΓΡΑΨΕ 'α=', 1, 2, ' ', ΑΛΗΘΗΣ") == ["α=1 2 ΑΛΗΘΗΣ"]

    def test_prints_reals_with_two_decimals(self) -> None:
        assert output("  ΓΡΑΨΕ 1 / 3\n  ΓΡΑΨΕ 10 / 4\n  ΓΡΑΨΕ 4 / 2\n  ΓΡΑΨΕ -0.001") == [
            "0.33",
            "2.5",
            "2",
            "0",
        ]

    def test_a_trailing_space_keeps_the_line_open(self) -> None:
        body = "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3\n    ΓΡΑΨΕ i, ' '\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΓΡΑΨΕ 'τέλος'"
        # The line stays open until a ΓΡΑΨΕ that doesn't end with a space.
        assert output(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i") == ["123τέλος"]
        two_spaces = "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3\n    ΓΡΑΨΕ i, '  '\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΓΡΑΨΕ ''"
        assert output(two_spaces, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i") == ["1 2 3 "]


class TestExpressions:
    @pytest.mark.parametrize(
        ("expr", "expected"),
        [
            ("7 DIV 2", "3"),
            ("7 MOD 2", "1"),
            ("2 ^ 10", "1024"),
            ("2 ^ -1", "0.5"),
            ("2 ^ 3 ^ 2", "64"),  # left-associative: (2 ^ 3) ^ 2
            ("2 ^ -1 ^ 2", "0.25"),
            ("-2 ^ 2", "-4"),
            ("1 + 2 * 3", "7"),
            ("10 / 3 * 3 = 10", "ΑΛΗΘΗΣ"),
            ("0.1 + 0.2 = 0.3", "ΑΛΗΘΗΣ"),
            ("'αβ' < 'αγ'", "ΑΛΗΘΗΣ"),
            ("ΟΧΙ 1 > 2 ΚΑΙ ΑΛΗΘΗΣ", "ΑΛΗΘΗΣ"),
            ("Τ_Ρ(16) + Α_Τ(-3)", "7"),
            ("Α_Μ(7 / 2)", "3"),
            ("ΗΜ(30)", "0.5"),
        ],
    )
    def test_values(self, expr: str, expected: str) -> None:
        assert output(f"  ΓΡΑΨΕ {expr}") == [expected]

    @pytest.mark.parametrize(
        ("expr", "message"),
        [
            ("1 / 0", "Διαίρεση με το μηδέν."),
            ("5 MOD 0", "Διαίρεση με το μηδέν."),
            ("5.5 DIV 2", "Ο τελεστής DIV εφαρμόζεται μόνο σε ακέραιους."),
            ("'α' + 1", "Ο τελεστής + εφαρμόζεται μόνο σε αριθμούς, όχι σε αλφαριθμητική τιμή."),
            ("1 = 'α'", "Δεν συγκρίνεται ακέραια με αλφαριθμητική τιμή."),
            ("1 ΚΑΙ ΑΛΗΘΗΣ", "Το ΚΑΙ εφαρμόζεται μόνο σε λογικές τιμές."),
            ("Τ_Ρ(-1)", "Η συνάρτηση Τ_Ρ δεν μπορεί να λάβει αρνητική τιμή."),
            ("9 ^ 9 ^ 99", "Το αποτέλεσμα είναι πολύ μεγάλο."),
            ("Α_Μ(10.0 ^ 300)", "Το αποτέλεσμα είναι πολύ μεγάλο."),
        ],
    )
    def test_errors(self, expr: str, message: str) -> None:
        assert error(f"  ΓΡΑΨΕ 1\n  ΓΡΑΨΕ {expr}") == (message, 5)


class TestVariables:
    def test_unset_variable(self) -> None:
        assert error("  y <- x + 1", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x, y") == (
            "Η μεταβλητή x δεν έχει πάρει τιμή.",
            5,
        )

    def test_types(self) -> None:
        declarations = "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x\n  ΠΡΑΓΜΑΤΙΚΕΣ: y"
        assert output("  y <- 3\n  ΓΡΑΨΕ y / 2", declarations) == ["1.5"]
        assert error("  x <- 7 / 2", declarations) == (
            "Δεν μπορεί να εκχωρηθεί πραγματική τιμή σε ακέραια μεταβλητή x.",
            6,
        )

    def test_constants(self) -> None:
        declarations = "ΣΤΑΘΕΡΕΣ\n  Ν = 3\n  Κ = 3.14\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Π[Ν]"
        assert output("  Π[Ν] <- 2\n  ΓΡΑΨΕ Π[3] * Κ", declarations) == ["6.28"]

    def test_arrays(self) -> None:
        declarations = "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Μ[2, 3], i, j"
        body = (
            "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 2\n    ΓΙΑ j ΑΠΟ 1 ΜΕΧΡΙ 3\n      Μ[i, j] <- 10 * i + j\n"
            "    ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΓΡΑΨΕ Μ[2, 3]"
        )
        assert output(body, declarations) == ["23"]
        assert error("  Μ[3, 1] <- 0", declarations) == (
            "Ο δείκτης 3 είναι εκτός ορίων του πίνακα Μ (1..2).",
            5,
        )
        assert error("  ΓΡΑΨΕ Μ[1, 2]", declarations) == (
            "Το στοιχείο Μ[1, 2] δεν έχει πάρει τιμή.",
            5,
        )


class TestInput:
    def test_converts_to_the_variables_type(self) -> None:
        declarations = "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: α\n  ΠΡΑΓΜΑΤΙΚΕΣ: β\n  ΧΑΡΑΚΤΗΡΕΣ: γ\n  ΛΟΓΙΚΕΣ: δ"
        body = "  ΔΙΑΒΑΣΕ α, β, γ, δ\n  ΓΡΑΨΕ α + β, ' ', γ, ' ', δ"
        assert output(body, declarations, [" -3 ", "2,5", "Γιάννης", "αληθής"]) == [
            "-0.5 Γιάννης ΑΛΗΘΗΣ"
        ]

    def test_rejects_a_value_of_the_wrong_kind(self) -> None:
        assert error("  ΔΙΑΒΑΣΕ α", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: α", ["3.5"]) == (
            "Δόθηκε «3.5», αλλά η α περιμένει ακέραιο αριθμό.",
            5,
        )


class TestControlFlow:
    def test_if_chain(self) -> None:
        body = (
            "  ΓΙΑ x ΑΠΟ -1 ΜΕΧΡΙ 1\n    ΑΝ x < 0 ΤΟΤΕ\n      ΓΡΑΨΕ 'αρνητικός'\n"
            "    ΑΛΛΙΩΣ_ΑΝ x = 0 ΤΟΤΕ\n      ΓΡΑΨΕ 'μηδέν'\n    ΑΛΛΙΩΣ\n      ΓΡΑΨΕ 'θετικός'\n"
            "    ΤΕΛΟΣ_ΑΝ\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        )
        assert output(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x") == ["αρνητικός", "μηδέν", "θετικός"]

    def test_for_leaves_the_counter_past_the_bound(self) -> None:
        body = "  ΓΙΑ i ΑΠΟ 10 ΜΕΧΡΙ 1 ΜΕ_ΒΗΜΑ -3\n    ΓΡΑΨΕ i\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΓΡΑΨΕ i"
        assert output(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i") == ["10", "7", "4", "1", "-2"]

    def test_nested_for_cannot_reuse_the_counter(self) -> None:
        body = (
            "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3\n    ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 2\n      ΓΡΑΨΕ i\n"
            "    ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        )
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i"))
        assert result.status == "error" and result.error is not None
        assert result.error.kind == "runtime"
        assert result.error.line == 6
        assert "μετρητής" in result.error.message

    def test_sequential_for_can_reuse_the_counter(self) -> None:
        body = "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 2\n    ΓΡΑΨΕ i\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n" * 2
        assert output(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i") == ["1", "2", "1", "2"]

    def test_for_that_never_runs(self) -> None:
        body = "  ΓΙΑ i ΑΠΟ 5 ΜΕΧΡΙ 1\n    ΓΡΑΨΕ i\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΓΡΑΨΕ i"
        assert output(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i") == ["5"]

    def test_for_with_a_real_step(self) -> None:
        body = "  ΓΙΑ x ΑΠΟ 0 ΜΕΧΡΙ 1 ΜΕ_ΒΗΜΑ 0.1\n    y <- x\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΓΡΑΨΕ y"
        assert output(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΠΡΑΓΜΑΤΙΚΕΣ: x, y") == ["1"]

    def test_zero_step(self) -> None:
        body = "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 5 ΜΕ_ΒΗΜΑ 0\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        assert (
            error(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i")[0]
            == "Το βήμα της ΓΙΑ δεν μπορεί να είναι μηδέν."
        )

    def test_while_and_repeat(self) -> None:
        body = (
            "  x <- 1\n  ΟΣΟ x < 100 ΕΠΑΝΑΛΑΒΕ\n    x <- x * 2\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n"
            "  ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ\n    x <- x - 50\n  ΜΕΧΡΙΣ_ΟΤΟΥ x < 0\n  ΓΡΑΨΕ x"
        )
        assert output(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x") == ["-22"]

    def test_select(self) -> None:
        body = (
            "  ΓΙΑ x ΑΠΟ 1 ΜΕΧΡΙ 12 ΜΕ_ΒΗΜΑ 4\n    ΕΠΙΛΕΞΕ x\n"
            "      ΠΕΡΙΠΤΩΣΗ 1, 2\n        ΓΡΑΨΕ 'μικρό'\n"
            "      ΠΕΡΙΠΤΩΣΗ 3..6\n        ΓΡΑΨΕ 'μεσαίο'\n"
            "      ΠΕΡΙΠΤΩΣΗ > 10\n        ΓΡΑΨΕ 'μεγάλο'\n"
            "      ΠΕΡΙΠΤΩΣΗ ΑΛΛΙΩΣ\n        ΓΡΑΨΕ 'άλλο'\n"
            "    ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        )
        assert output(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x") == ["μικρό", "μεσαίο", "άλλο"]

    def test_conditions_are_evaluated_in_full(self) -> None:
        declarations = "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Α[3], i"
        body = (
            "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3\n    Α[i] <- i\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  i <- 1\n"
            "  ΟΣΟ i <= 3 ΚΑΙ Α[i] <> 0 ΕΠΑΝΑΛΑΒΕ\n    i <- i + 1\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        )
        assert error(body, declarations) == (
            "Ο δείκτης 4 είναι εκτός ορίων του πίνακα Α (1..3).",
            9,
        )

    def test_a_number_is_not_a_condition(self) -> None:
        assert error("  ΑΝ 1 ΤΟΤΕ\n    ΓΡΑΨΕ 1\n  ΤΕΛΟΣ_ΑΝ")[0] == (
            "Η συνθήκη πρέπει να έχει λογική τιμή (ΑΛΗΘΗΣ ή ΨΕΥΔΗΣ)."
        )


SUBPROGRAMS = """
ΣΥΝΑΡΤΗΣΗ Παραγοντικό(ν): ΑΚΕΡΑΙΑ
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: ν
ΑΡΧΗ
  ΑΝ ν <= 1 ΤΟΤΕ
    Παραγοντικό <- 1
  ΑΛΛΙΩΣ
    Παραγοντικό <- ν * Παραγοντικό(ν - 1)
  ΤΕΛΟΣ_ΑΝ
ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ

ΔΙΑΔΙΚΑΣΙΑ Αντιμετάθεση(α, β)
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: α, β, τ
ΑΡΧΗ
  τ <- α
  α <- β
  β <- τ
ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ

ΔΙΑΔΙΚΑΣΙΑ Γέμισε(Π, πλήθος)
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: Π[3], πλήθος, i
ΑΡΧΗ
  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3
    Π[i] <- i * i
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  πλήθος <- 3
ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ

ΣΥΝΑΡΤΗΣΗ Άθροισμα(Π): ΑΚΕΡΑΙΑ
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: Π[3], i, σ
ΑΡΧΗ
  σ <- 0
  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3
    σ <- σ + Π[i]
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  Π[1] <- 0
  Άθροισμα <- σ
ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ

ΣΥΝΑΡΤΗΣΗ Ατέρμονη(ν): ΑΚΕΡΑΙΑ
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: ν
ΑΡΧΗ
  Ατέρμονη <- Ατέρμονη(ν + 1)
ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ

ΣΥΝΑΡΤΗΣΗ Μισή(ν): ΑΚΕΡΑΙΑ
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: ν
ΑΡΧΗ
  ΑΝ ν > 0 ΤΟΤΕ
    Μισή <- ν DIV 2
  ΤΕΛΟΣ_ΑΝ
ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ
"""


def with_subprograms(body: str, inputs: list[str] | None = None) -> RunResult:
    declarations = "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x, y, Α[3], ν"
    return run(program(body, declarations, SUBPROGRAMS), inputs)


class TestSubprograms:
    def test_recursive_function(self) -> None:
        result = with_subprograms("  ΓΡΑΨΕ Παραγοντικό(10)")
        assert result.output == ["3628800"]

    def test_procedure_copies_its_parameters_back(self) -> None:
        result = with_subprograms("  x <- 1\n  y <- 2\n  ΚΑΛΕΣΕ Αντιμετάθεση(x, y)\n  ΓΡΑΨΕ x, y")
        assert result.output == ["2 1"]

    def test_procedure_fills_an_array_and_an_unset_variable(self) -> None:
        result = with_subprograms("  ΚΑΛΕΣΕ Γέμισε(Α, ν)\n  ΓΡΑΨΕ Α[1], Α[2], Α[3], ν")
        assert result.output == ["1 4 9 3"]

    def test_function_gets_a_copy_of_an_array(self) -> None:
        body = "  ΚΑΛΕΣΕ Γέμισε(Α, ν)\n  ΓΡΑΨΕ Άθροισμα(Α), ' ', Α[1]"
        assert with_subprograms(body).output == ["14 1"]

    def test_expressions_as_procedure_arguments_are_not_copied_back(self) -> None:
        result = with_subprograms("  x <- 5\n  ΚΑΛΕΣΕ Αντιμετάθεση(x + 1, x)\n  ΓΡΑΨΕ x")
        assert result.output == ["6"]

    def test_runaway_recursion(self) -> None:
        result = with_subprograms("  ΓΡΑΨΕ Ατέρμονη(1)")
        assert result.status == "error" and result.error is not None
        assert result.error.message.startswith("Πάρα πολλές κλήσεις του Ατέρμονη")

    def test_function_that_ends_without_a_value(self) -> None:
        result = with_subprograms("  ΓΡΑΨΕ Μισή(-4)")
        assert result.error is not None
        assert result.error.message == "Η συνάρτηση Μισή τελείωσε χωρίς να πάρει τιμή."
        assert result.error.line == 5


class TestLimits:
    def test_infinite_loop(self) -> None:
        body = "  x <- 1\n  ΟΣΟ x > 0 ΕΠΑΝΑΛΑΒΕ\n    x <- 1\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x"), limits=RunLimits(max_steps=1000))
        assert result.status == "limit"
        assert result.steps == 1001

    def test_too_much_output(self) -> None:
        body = "  ΟΣΟ ΑΛΗΘΗΣ ΕΠΑΝΑΛΑΒΕ\n    ΓΡΑΨΕ 'ξανά'\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        result = run(program(body), limits=RunLimits(max_output_lines=10))
        assert result.status == "limit"
        assert len(result.output) == 10

    def test_timeout(self) -> None:
        body = "  ΟΣΟ ΑΛΗΘΗΣ ΕΠΑΝΑΛΑΒΕ\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        result = run(program(body), limits=RunLimits(max_steps=10**9, timeout_seconds=0.05))
        assert result.status == "limit"


class TestTrace:
    def test_records_lines_changes_conditions_and_output(self) -> None:
        body = "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 2\n    ΓΡΑΨΕ i\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i"), trace=True)
        assert result.trace is not None
        steps = [(s.line, s.changes, s.condition, s.output) for s in result.trace]
        assert steps == [
            (5, {"i": "1"}, True, []),
            (6, {}, None, ["1"]),
            (5, {"i": "2"}, True, []),
            (6, {}, None, ["2"]),
            (5, {"i": "3"}, False, []),
        ]

    def test_scope_names_the_subprogram(self) -> None:
        source = program(
            "  x <- 1\n  y <- 2\n  ΚΑΛΕΣΕ Αντιμετάθεση(x, y)",
            "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x, y",
            SUBPROGRAMS,
        )
        result = run(source, trace=True)
        assert result.trace is not None
        assert {s.scope for s in result.trace} == {"Δοκιμή", "Αντιμετάθεση"}
        call = result.trace[2]
        assert (call.scope, call.changes) == ("Δοκιμή", {})
        # Entering it: a row on its first line with what its parameters were given.
        entry = result.trace[3]
        header = source.split("\n").index("ΔΙΑΔΙΚΑΣΙΑ Αντιμετάθεση(α, β)") + 1
        assert (entry.line, entry.scope) == (header, "Αντιμετάθεση")
        assert entry.changes == {"α": "1", "β": "2"}
        # The values come back to x and y after the procedure's own steps, on the call's line.
        back = result.trace[-1]
        assert (back.line, back.scope, back.changes) == (call.line, "Δοκιμή", {"x": "2", "y": "1"})

    def test_the_entry_row_uses_the_declared_spelling(self) -> None:
        subprogram = """
ΔΙΑΔΙΚΑΣΙΑ Δείξε(Α)
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: α
ΑΡΧΗ
  α <- α + 1
ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ
"""
        source = program("  x <- 5\n  ΚΑΛΕΣΕ Δείξε(x)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x", subprogram)
        result = run(source, trace=True)
        assert result.trace is not None
        names = {name for s in result.trace if s.scope == "Δείξε" for name in s.changes}
        assert names == {"α"}

    def test_an_unchanged_argument_is_not_a_change(self) -> None:
        subprogram = """
ΔΙΑΔΙΚΑΣΙΑ Τύπωσε(α)
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: α
ΑΡΧΗ
  ΓΡΑΨΕ α
ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ
"""
        source = program("  x <- 5\n  ΚΑΛΕΣΕ Τύπωσε(x)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x", subprogram)
        result = run(source, trace=True)
        assert result.trace is not None
        assert result.trace[-1].scope == "Τύπωσε"  # no row coming back: x didn't change
        assert result.output == ["5"]

    def test_a_function_value_is_assigned_after_its_steps(self) -> None:
        result = run(
            program(
                "  x <- Παραγοντικό(2) + Παραγοντικό(1)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x", SUBPROGRAMS
            ),
            trace=True,
        )
        assert result.trace is not None
        rows = [(s.line, s.scope, s.changes) for s in result.trace]
        assert rows[0] == (5, "Δοκιμή", {})
        assert all(scope == "Παραγοντικό" for _, scope, _ in rows[1:-1])
        assert rows[-1] == (5, "Δοκιμή", {"x": "3"})

    def test_a_condition_with_a_call_comes_after_the_call(self) -> None:
        result = run(
            program(
                "  ΑΝ Παραγοντικό(3) = 6 ΤΟΤΕ\n    ΓΡΑΨΕ 'ναι'\n  ΤΕΛΟΣ_ΑΝ",
                subprograms=SUBPROGRAMS,
            ),
            trace=True,
        )
        assert result.trace is not None
        resumed = result.trace[-2]
        assert (resumed.line, resumed.scope, resumed.condition) == (4, "Δοκιμή", True)
        assert result.trace[0].condition is None
        assert result.trace[-1].output == ["ναι"]

    def test_a_call_without_changes_adds_no_row(self) -> None:
        result = run(
            program(
                "  x <- 1\n  y <- 2\n  ΚΑΛΕΣΕ Αντιμετάθεση(5, 6)\n  ΓΡΑΨΕ x",
                "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x, y",
                SUBPROGRAMS,
            ),
            trace=True,
        )
        assert result.trace is not None
        assert [s.scope for s in result.trace].count("Δοκιμή") == 4
        assert result.trace[-1].output == ["1"]

    def test_truncates(self) -> None:
        body = "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 100\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        result = run(
            program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i"),
            limits=RunLimits(max_trace_steps=10),
            trace=True,
        )
        assert result.status == "ok"
        assert result.trace is not None and len(result.trace) == 10
        assert result.trace_truncated


def values(frame: Frame) -> dict[str, str | dict[str, str] | None]:
    return {v.name: v.cells if v.dims is not None else v.value for v in frame.variables}


class TestFrames:
    """Μεταβλητές: the calls running when the run stopped, with their values."""

    def test_the_program_at_the_end(self) -> None:
        result = with_subprograms("  x <- 1\n  ΚΑΛΕΣΕ Γέμισε(Α, ν)")
        assert [(f.scope, f.title) for f in result.frames] == [("Δοκιμή", "ΠΡΟΓΡΑΜΜΑ Δοκιμή")]
        x, _, array, _ = result.frames[0].variables
        assert (x.name, x.type, x.value) == ("x", "ΑΚΕΡΑΙΑ", "1")
        assert array.dims == [3]
        assert values(result.frames[0]) == {
            "x": "1",
            "y": None,  # declared, never given a value
            "Α": {"Α[1]": "1", "Α[2]": "4", "Α[3]": "9"},
            "ν": "3",
        }

    def test_a_run_stopped_in_a_call_keeps_it(self) -> None:
        result = with_subprograms("  ΓΡΑΨΕ Μισή(-4)")
        assert result.status == "error"
        assert [f.title for f in result.frames] == ["ΠΡΟΓΡΑΜΜΑ Δοκιμή"]  # it returned
        result = with_subprograms("  ΓΡΑΨΕ Ατέρμονη(1)")
        assert len(result.frames) == 201
        assert values(result.frames[-1]) == {"ν": "200", "Ατέρμονη": None}

    def test_waiting_for_input_in_a_procedure(self) -> None:
        subprogram = """
ΔΙΑΔΙΚΑΣΙΑ Ρώτα(α)
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: α
ΑΡΧΗ
  ΔΙΑΒΑΣΕ α
ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ
"""
        source = program("  x <- 5\n  ΚΑΛΕΣΕ Ρώτα(x)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x", subprogram)
        result = run(source)
        assert result.status == "needs_input"
        assert [f.title for f in result.frames] == ["ΠΡΟΓΡΑΜΜΑ Δοκιμή", "ΔΙΑΔΙΚΑΣΙΑ Ρώτα"]
        assert values(result.frames[1]) == {"α": "5"}
        assert values(run(source, ["7"]).frames[0]) == {"x": "7"}

    def test_a_function_shows_its_value(self) -> None:
        result = with_subprograms("  ΓΡΑΨΕ Παραγοντικό(3)")
        assert result.trace is None and result.units == []
        traced = run(program("  ΓΡΑΨΕ Παραγοντικό(2)", subprograms=SUBPROGRAMS), trace=True)
        unit = next(u for u in traced.units if u.scope == "Παραγοντικό")
        assert unit.title == "ΣΥΝΑΡΤΗΣΗ Παραγοντικό"
        assert [(v.name, v.type, v.value) for v in unit.variables] == [
            ("ν", "ΑΚΕΡΑΙΑ", None),
            ("Παραγοντικό", "ΑΚΕΡΑΙΑ", None),
        ]

    def test_big_arrays_send_only_some_cells(self) -> None:
        body = "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 6000\n    Α[i] <- 'αβγ'\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i\n  ΧΑΡΑΚΤΗΡΕΣ: Α[6000]"))
        array = result.frames[0].variables[1]
        assert array.cells is not None and len(array.cells) == SNAPSHOT_ARRAY_CELLS
        assert array.cells_truncated

    def test_each_array_gets_its_own_share(self) -> None:
        body = (
            "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 5000\n    Α[i] <- i\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n"
            "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10\n    Β[i] <- i\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        )
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i, Α[5000], Β[10]"))
        _, big, small = result.frames[0].variables
        assert big.cells is not None and len(big.cells) == SNAPSHOT_ARRAY_CELLS
        assert small.cells is not None and len(small.cells) == 10
        assert not small.cells_truncated

    def test_all_arrays_share_a_budget(self) -> None:
        # 12 running calls, each with its own copy of a full 500-cell array.
        subprogram = """
ΣΥΝΑΡΤΗΣΗ Βάθος(Α, ν): ΑΚΕΡΑΙΑ
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: Α[500], ν
ΑΡΧΗ
  Βάθος <- 1 DIV ν + Βάθος(Α, ν - 1)
ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ
"""
        body = "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 500\n    Α[i] <- i\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΓΡΑΨΕ Βάθος(Α, 10)"
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i, Α[500]", subprogram))
        assert result.status == "error" and len(result.frames) == 12
        arrays = [f.variables[0] for f in result.frames[1:]] + [result.frames[0].variables[1]]
        assert sum(len(a.cells or {}) for a in arrays) == SNAPSHOT_CELLS
        assert result.frames[-1].variables[0].cells_truncated

    def test_an_array_parameter_is_traced_in_and_back(self) -> None:
        subprogram = """
ΔΙΑΔΙΚΑΣΙΑ Αλλαγή(Β)
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: Β[2], τ
ΑΡΧΗ
  τ <- Β[1]
  Β[1] <- Β[2]
  Β[2] <- τ
ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ
"""
        body = "  Α[1] <- 5\n  Α[2] <- 3\n  ΚΑΛΕΣΕ Αλλαγή(Α)\n  ΓΡΑΨΕ Α[1]"
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Α[2]", subprogram), trace=True)
        assert result.trace is not None
        entry = next(s for s in result.trace if s.scope == "Αλλαγή")
        assert entry.copied == {"Β": "Α"}
        back = [s.changes for s in result.trace if s.scope == "Δοκιμή" and s.changes]
        assert back[-1] == {"Α[1]": "3", "Α[2]": "5"}

    def test_trace_steps_count_the_screen_lines(self) -> None:
        body = "  ΓΡΑΨΕ 'α '\n  x <- 1\n  ΓΡΑΨΕ 'β'\n  ΓΡΑΨΕ 'γ'"
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x"), trace=True)
        assert result.output == ["αβ", "γ"]
        assert result.trace is not None
        # The open line continues at the third step; only steps with output count lines.
        assert [(s.output, s.lines) for s in result.trace] == [
            (["α"], 1),
            ([], 0),
            (["β"], 1),
            (["γ"], 2),
        ]

    def test_trace_steps_say_which_call(self) -> None:
        result = run(
            program(
                "  x <- Παραγοντικό(1) + Παραγοντικό(1)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x", SUBPROGRAMS
            ),
            trace=True,
        )
        assert result.trace is not None
        rows = [(s.scope, s.depth, s.call) for s in result.trace]
        # The second call starts at the same depth as the first, with a call of its own.
        assert rows[0] == ("Δοκιμή", 0, 0)
        assert ("Παραγοντικό", 1, 1) in rows and ("Παραγοντικό", 1, 2) in rows
        assert rows[-1] == ("Δοκιμή", 0, 0)  # x, back on the program's line


def test_a_huge_typed_integer_is_an_error() -> None:
    message, _ = error("  ΔΙΑΒΑΣΕ x", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x", ["9" * 5000])
    assert message == "Ο αριθμός που δόθηκε είναι πολύ μεγάλος."


class TestOutputSize:
    """A long string printed in a loop can't fill the server's memory."""

    LONG = "  σ <- '" + "Α" * 1000 + "'\n"

    def test_output_stops_at_its_character_limit(self) -> None:
        body = self.LONG + "  ΓΙΑ ι ΑΠΟ 1 ΜΕΧΡΙ 1000\n    ΓΡΑΨΕ σ, σ, σ\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        source = program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΧΑΡΑΚΤΗΡΕΣ: σ\n  ΑΚΕΡΑΙΕΣ: ι")
        result = run(source, [], limits=RunLimits(max_output_chars=10_000))
        assert result.status == "limit"
        assert sum(len(line) for line in result.output) <= 10_000

    def test_a_line_kept_open_counts_too(self) -> None:
        body = self.LONG + "  ΓΙΑ ι ΑΠΟ 1 ΜΕΧΡΙ 1000\n    ΓΡΑΨΕ σ, ' '\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        source = program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΧΑΡΑΚΤΗΡΕΣ: σ\n  ΑΚΕΡΑΙΕΣ: ι")
        result = run(source, [], limits=RunLimits(max_output_chars=10_000))
        assert result.status == "limit" and len(result.output) == 1

    def test_the_trace_stops_at_its_character_limit(self) -> None:
        body = self.LONG + "  ΓΙΑ ι ΑΠΟ 1 ΜΕΧΡΙ 100\n    σ <- σ\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"
        source = program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΧΑΡΑΚΤΗΡΕΣ: σ\n  ΑΚΕΡΑΙΕΣ: ι")
        result = run(source, [], trace=True, limits=RunLimits(max_trace_chars=10_000))
        assert result.status == "ok" and result.trace_truncated
        assert result.trace is not None and len(result.trace) < 30


class TestHugeValues:
    """Numbers past MAX_INTEGER or a float's range are errors, never a crash."""

    def test_a_huge_literal_is_a_syntax_error(self) -> None:
        for literal in ("1" * 5000, "1" * 400, "1" * 400 + ".0"):
            error = check(program(f"  x <- {literal}", "ΜΕΤΑΒΛΗΤΕΣ\n  ΠΡΑΓΜΑΤΙΚΕΣ: x"))
            assert error is not None and error.message == "Ο αριθμός είναι πολύ μεγάλος."

    def test_a_huge_input_is_an_error(self) -> None:
        for decl in ("ΑΚΕΡΑΙΕΣ: x", "ΠΡΑΓΜΑΤΙΚΕΣ: x"):
            result = run(
                program("  ΔΙΑΒΑΣΕ x\n  ΓΡΑΨΕ Α_Μ(x)", f"ΜΕΤΑΒΛΗΤΕΣ\n  {decl}"), ["9" * 400]
            )
            assert result.status == "error"
            assert result.error is not None and "πολύ μεγάλος" in result.error.message

    def test_leading_zeros_dont_count(self) -> None:
        padded = "0" * 5000 + "7"
        decl = "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x"
        assert output(f"  x <- {padded}\n  ΓΡΑΨΕ x", decl) == ["7"]
        assert output("  ΔΙΑΒΑΣΕ x\n  ΓΡΑΨΕ x", decl, ["-" + padded]) == ["-7"]

    def test_algorithm_data_too(self) -> None:
        source = "Αλγόριθμος Α\nΔεδομένα // x //\nΕμφάνισε x / 2\nΤέλος Α"
        result = run(source, ["9" * 400], language="pseudocode")
        assert result.status == "error"


class TestArrayMemory:
    """All arrays alive at once share a budget, and copying them costs steps."""

    def test_many_big_arrays_are_an_error(self) -> None:
        names = ", ".join(f"Χ{k}[1000000]" for k in range(10))
        result = run(program("  ΓΡΑΨΕ 1", f"ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: {names}"))
        assert result.status == "error" and result.error is not None
        assert result.error.message.startswith("Οι πίνακες δεν χωράνε στη μνήμη")

    def test_a_recursive_procedure_with_an_array_is_an_error(self) -> None:
        sub = (
            "ΔΙΑΔΙΚΑΣΙΑ Δ(ν)\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: ν, Β[500000]\nΑΡΧΗ\n"
            "  ΑΝ ν > 0 ΤΟΤΕ\n    ΚΑΛΕΣΕ Δ(ν - 1)\n  ΤΕΛΟΣ_ΑΝ\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ"
        )
        result = run(program("  ΚΑΛΕΣΕ Δ(100)", "", sub))
        assert result.status == "error" and result.error is not None
        assert result.error.message.startswith("Οι πίνακες δεν χωράνε στη μνήμη")

    def test_arrays_are_freed_when_a_call_returns(self) -> None:
        sub = "ΔΙΑΔΙΚΑΣΙΑ Δ\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Β[900000]\nΑΡΧΗ\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ"
        body = "  ΓΙΑ ι ΑΠΟ 1 ΜΕΧΡΙ 5\n    ΚΑΛΕΣΕ Δ\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  ΓΡΑΨΕ 1"
        result = run(program(body, "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: ι", sub))
        assert result.status == "ok"

    def test_copying_a_big_array_counts_as_steps(self) -> None:
        sub = "ΔΙΑΔΙΚΑΣΙΑ Δ(Β)\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Β[100000]\nΑΡΧΗ\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ"
        result = run(program("  ΚΑΛΕΣΕ Δ(Α)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Α[100000]", sub))
        assert result.status == "ok"
        assert result.steps >= 300  # Α, Β, the copy in and back: 100 steps each


def test_an_array_of_the_wrong_type_names_its_values() -> None:
    procedure = (
        "ΔΙΑΔΙΚΑΣΙΑ Τύπωσε(Β)\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Β[3]\nΑΡΧΗ\n  ΓΡΑΨΕ Β[1]\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ"
    )
    source = program(
        "  Α[1] <- 1.5\n  ΚΑΛΕΣΕ Τύπωσε(Α)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΠΡΑΓΜΑΤΙΚΕΣ: Α[3]", procedure
    )
    result = run(source)
    assert result.status == "error" and result.error is not None
    assert result.error.message == (
        "Ο πίνακας Α έχει πραγματικές τιμές, ενώ η παράμετρος Β ακέραιες. "
        "Σε ΚΑΛΕΣΕ πρέπει να έχουν τον ίδιο τύπο."
    )


# A procedure's argument that is copied back (a variable, an element, an array) must have
# the parameter's type (docs/glossa.md): refused at the ΚΑΛΕΣΕ, before the procedure runs.
SHOW_REAL = "ΔΙΑΔΙΚΑΣΙΑ Τύπωσε(Β)\nΜΕΤΑΒΛΗΤΕΣ\n  ΠΡΑΓΜΑΤΙΚΕΣ: Β\nΑΡΧΗ\n  ΓΡΑΨΕ Β\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ"


@pytest.mark.parametrize(
    ("body", "declarations", "message"),
    [
        (
            "  x <- 3\n  ΚΑΛΕΣΕ Τύπωσε(x)",
            "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x",
            "Η παράμετρος Β είναι πραγματική, ενώ η μεταβλητή x είναι ακέραια. "
            "Σε ΚΑΛΕΣΕ πρέπει να έχουν τον ίδιο τύπο.",
        ),
        (  # even without a value yet: the procedure might have been the one to give it
            "  ΚΑΛΕΣΕ Τύπωσε(x)",
            "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x",
            "Η παράμετρος Β είναι πραγματική, ενώ η μεταβλητή x είναι ακέραια. "
            "Σε ΚΑΛΕΣΕ πρέπει να έχουν τον ίδιο τύπο.",
        ),
        (
            "  Α[2] <- 3\n  ΚΑΛΕΣΕ Τύπωσε(Α[2])",
            "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Α[3]",
            "Η παράμετρος Β είναι πραγματική, ενώ ο πίνακας Α έχει ακέραιες τιμές. "
            "Σε ΚΑΛΕΣΕ πρέπει να έχουν τον ίδιο τύπο.",
        ),
    ],
)
def test_a_procedure_argument_of_another_type_is_refused_at_the_call(
    body: str, declarations: str, message: str
) -> None:
    result = run(program(body, declarations, SHOW_REAL))
    assert result.status == "error" and result.error is not None
    assert result.error.message == message
    assert result.output == []  # the procedure never ran


def test_an_integer_array_into_a_real_array_parameter_is_refused() -> None:
    procedure = (
        "ΔΙΑΔΙΚΑΣΙΑ Τύπωσε(Β)\nΜΕΤΑΒΛΗΤΕΣ\n  ΠΡΑΓΜΑΤΙΚΕΣ: Β[3]\nΑΡΧΗ\n"
        "  ΓΡΑΨΕ Β[1]\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ"
    )
    source = program("  Α[1] <- 1\n  ΚΑΛΕΣΕ Τύπωσε(Α)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Α[3]", procedure)
    result = run(source)
    assert result.status == "error" and result.error is not None
    assert result.error.message.startswith("Ο πίνακας Α έχει ακέραιες τιμές, ενώ η παράμετρος Β")
    assert result.output == []


def test_values_that_are_not_copied_back_may_be_integers_for_a_real_parameter() -> None:
    # An expression or a constant into a procedure, anything into a function: copies only.
    function = (
        "ΣΥΝΑΡΤΗΣΗ Μισό(α): ΠΡΑΓΜΑΤΙΚΗ\nΜΕΤΑΒΛΗΤΕΣ\n  ΠΡΑΓΜΑΤΙΚΕΣ: α\nΑΡΧΗ\n"
        "  Μισό <- α / 2\nΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ"
    )
    source = program(
        "  x <- 3\n  ΚΑΛΕΣΕ Τύπωσε(x + 1)\n  ΚΑΛΕΣΕ Τύπωσε(7)\n  ΓΡΑΨΕ Μισό(x)",
        "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x",
        f"{SHOW_REAL}\n{function}",
    )
    result = run(source)
    assert result.status == "ok", result.error
    assert result.output == ["4", "7", "1.5"]


def test_the_type_rule_also_holds_inside_a_subprogram() -> None:
    # A procedure passing its own ΑΚΕΡΑΙΑ parameter on to a ΠΡΑΓΜΑΤΙΚΗ one.
    outer = (
        "ΔΙΑΔΙΚΑΣΙΑ Πέρνα(κ)\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: κ\nΑΡΧΗ\n"
        "  ΚΑΛΕΣΕ Τύπωσε(κ)\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ"
    )
    source = program(
        "  x <- 3\n  ΚΑΛΕΣΕ Πέρνα(x)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x", f"{outer}\n{SHOW_REAL}"
    )
    result = run(source)
    assert result.status == "error" and result.error is not None
    assert result.error.message.startswith(
        "Η παράμετρος Β είναι πραγματική, ενώ η μεταβλητή κ είναι ακέραια."
    )
    assert result.output == []


def test_a_named_constant_is_copied_in_like_a_number() -> None:
    source = program("  ΚΑΛΕΣΕ Τύπωσε(Ν)", "ΣΤΑΘΕΡΕΣ\n  Ν = 3", SHOW_REAL)
    result = run(source)
    assert result.status == "ok", result.error
    assert result.output == ["3"]


def test_a_string_variable_into_a_boolean_parameter_is_refused() -> None:
    procedure = "ΔΙΑΔΙΚΑΣΙΑ Δείξε(Λ)\nΜΕΤΑΒΛΗΤΕΣ\n  ΛΟΓΙΚΕΣ: Λ\nΑΡΧΗ\n  ΓΡΑΨΕ Λ\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ"
    source = program("  s <- 'ναι'\n  ΚΑΛΕΣΕ Δείξε(s)", "ΜΕΤΑΒΛΗΤΕΣ\n  ΧΑΡΑΚΤΗΡΕΣ: s", procedure)
    result = run(source)
    assert result.status == "error" and result.error is not None
    assert result.error.message == (
        "Η παράμετρος Λ είναι λογική, ενώ η μεταβλητή s είναι αλφαριθμητική. "
        "Σε ΚΑΛΕΣΕ πρέπει να έχουν τον ίδιο τύπο."
    )
    assert (result.error.line, result.error.column) == (6, 16)  # the s in Δείξε(s)
