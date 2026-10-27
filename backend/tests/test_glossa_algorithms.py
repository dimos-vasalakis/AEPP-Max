"""ψευδογλώσσα algorithms (language="pseudocode"). Most programs here are the
textbook's own examples (ΑΕΠΠ ch. 2.4 and 3), so a change that breaks one is a
change away from what students are taught."""

import pytest

from app.glossa import RunResult, check, run


def go(source: str, inputs: list[str] | None = None, trace: bool = False) -> RunResult:
    return run(source, inputs, language="pseudocode", trace=trace)


def output(source: str, inputs: list[str] | None = None) -> list[str]:
    result = go(source, inputs)
    assert result.status == "ok", result.error
    return result.output


def error(source: str, inputs: list[str] | None = None) -> tuple[str, int | None]:
    result = go(source, inputs)
    assert result.status == "error", result
    assert result.error is not None
    return result.error.message, result.error.line


def algorithm(body: str, header: str = "") -> str:
    return f"Αλγόριθμος Δοκιμή\n{header}{body}\nΤέλος Δοκιμή\n"


class TestTextbookExamples:
    def test_sequence(self) -> None:
        source = """Αλγόριθμος Παράδειγμα_1
Διάβασε a
Διάβασε b
c ← a + b
Εκτύπωσε c
Τέλος Παράδειγμα_1"""
        assert output(source, ["2", "3"]) == ["5"]

    def test_one_line_if_needs_no_end(self) -> None:
        source = """Αλγόριθμος Παράδειγμα_2
Διάβασε a
Αν a < 0 τότε a ← a*(-1)
Εκτύπωσε a
Τέλος Παράδειγμα_2"""
        assert output(source, ["-7"]) == ["7"]
        assert output(source, ["4"]) == ["4"]

    def test_if_else(self) -> None:
        source = """Αλγόριθμος Παράδειγμα_3
Διάβασε a, b
Αν a < b τότε
  c ← a + b
αλλιώς
  c ← a * b
Τέλος_αν
Εκτύπωσε c
Τέλος Παράδειγμα_3"""
        assert output(source, ["2", "3"]) == ["5"]
        assert output(source, ["3", "2"]) == ["6"]

    def test_else_if_chain_with_statements_on_the_same_lines(self) -> None:
        source = """Αλγόριθμος Παράδειγμα_4
Διάβασε a
Αν a = 1 τότε εκτύπωσε "Α"
αλλιώς_αν a = 2 τότε εκτύπωσε "Β"
αλλιώς_αν a = 3 τότε εκτύπωσε "Γ"
αλλιώς εκτύπωσε "άγνωστος"
Τέλος_αν
Τέλος Παράδειγμα_4"""
        assert output(source, ["2"]) == ["Β"]
        assert output(source, ["9"]) == ["άγνωστος"]

    def test_select_with_comparisons(self) -> None:
        source = """Αλγόριθμος Παράδειγμα_5
Διάβασε age
Επίλεξε age
  Περίπτωση < 0
    Εμφάνισε "Είπαμε ηλικία ..."
  Περίπτωση < 18
    Εμφάνισε "Μπράβο"
  Περίπτωση αλλιώς
    Εμφάνισε "Ποτέ δεν είναι αργά"
Τέλος_επιλογών
Τέλος Παράδειγμα_5"""
        assert output(source, ["15"]) == ["Μπράβο"]
        assert output(source, ["40"]) == ["Ποτέ δεν είναι αργά"]

    def test_while_with_the_textbook_symbols(self) -> None:
        source = """Αλγόριθμος Παράδειγμα_7
i ← 1
Όσο i ≤ 3 επανάλαβε
  Εμφάνισε i
  i ← i + 1
Τέλος_επανάληψης
Τέλος Παράδειγμα_7"""
        assert output(source) == ["1", "2", "3"]

    def test_repeat_until_runs_at_least_once(self) -> None:
        source = """Αλγόριθμος Παράδειγμα_9
Αρχή_επανάληψης
  Διάβασε x
  Εμφάνισε x
Μέχρις_ότου x < 0
Τέλος Παράδειγμα_9"""
        assert output(source, ["4", "-1"]) == ["4", "-1"]

    def test_for_with_a_step(self) -> None:
        source = """Αλγόριθμος Παράδειγμα_11
άθροισμα ← 0
Για i από 2 μέχρι 100 με_βήμα 2
  άθροισμα ← άθροισμα + i
Τέλος_επανάληψης
Εκτύπωσε άθροισμα
Τέλος Παράδειγμα_11"""
        assert output(source) == ["2550"]

    def test_russian_multiplication_reads_data_and_shows_results(self) -> None:
        source = """Αλγόριθμος Πολλαπλασιασμός_αλά_ρωσικά
Δεδομένα // M1, M2 //
Ρ ← 0
Όσο M2 > 0 επανάλαβε
  Αν M2 mod 2 = 1 τότε Ρ ← Ρ + M1
  M1 ← M1 * 2
  M2 ← M2 div 2
Τέλος_επανάληψης
Αποτελέσματα // Ρ //
Τέλος Πολλαπλασιασμός_αλά_ρωσικά"""
        assert output(source, ["45", "19"]) == ["855"]
        # Out of values: the Δεδομένα line is the one waiting.
        waiting = go(source, ["45"])
        assert (waiting.status, waiting.input_line) == ("needs_input", 2)

    def test_recursion_as_an_expression(self) -> None:
        source = """Αλγόριθμος Παραγοντικό
Δεδομένα // n //
Αν n = 0 τότε
  product ← 1
αλλιώς
  product ← n * Παραγοντικό(n-1)
Τέλος_αν
Αποτελέσματα // product //
Τέλος Παραγοντικό"""
        assert output(source, ["5"]) == ["120"]

    def test_euclid_with_the_same_name_in_data_and_results(self) -> None:
        source = """Αλγόριθμος Ευκλείδης
Δεδομένα // x, y //
z ← y
Όσο z ≠ 0 επανάλαβε
  z ← x mod y
  x ← y
  y ← z
Τέλος_επανάληψης
Αποτελέσματα // x //
Τέλος Ευκλείδης"""
        assert output(source, ["150", "35"]) == ["5"]

    def test_bubble_sort_called_with_its_array(self) -> None:
        source = """Αλγόριθμος Κύριος
Για i από 1 μέχρι 4
  Διάβασε Α[i]
Τέλος_επανάληψης
Κάλεσε Φυσαλίδα(Α, 4)
Για i από 1 μέχρι 4
  Εμφάνισε Α[i]
Τέλος_επανάληψης
Τέλος Κύριος

Αλγόριθμος Φυσαλίδα
Δεδομένα // table, n //
Για i από 2 μέχρι n
  Για j από n μέχρι i με_βήμα -1
    Αν table[j-1] > table[j] τότε
      Αντιμετάθεσε table[j-1], table[j]
    Τέλος_αν
  Τέλος_επανάληψης
Τέλος_επανάληψης
Αποτελέσματα // table //
Τέλος Φυσαλίδα"""
        assert output(source, ["3", "1", "4", "2"]) == ["1", "2", "3", "4"]

    def test_two_dimensional_arrays(self) -> None:
        source = algorithm(
            """Για i από 1 μέχρι 2
  Για j από 1 μέχρι 3
    table[i, j] ← i * j
  Τέλος_επανάληψης
Τέλος_επανάληψης
Εμφάνισε table[2, 3]"""
        )
        assert output(source) == ["6"]


class TestCalls:
    MAIN = """Αλγόριθμος Κύριος
Διάβασε α, β
Κάλεσε Μέγιστος(α, β, μ)
Εμφάνισε μ
Εμφάνισε 2 * Μέγιστος(α, β)
Τέλος Κύριος

Αλγόριθμος Μέγιστος
Δεδομένα // x, y //
Αν x > y τότε max ← x
αλλιώς max ← y
Τέλος_αν
Αποτελέσματα // max //
Τέλος Μέγιστος"""

    def test_call_returns_results_to_the_variables_after_the_data(self) -> None:
        assert output(self.MAIN, ["3", "8"]) == ["8", "16"]

    def test_trace_enters_the_called_algorithm_with_its_data(self) -> None:
        result = go(self.MAIN, ["3", "8"], trace=True)
        assert result.trace is not None
        rows = [(s.line, s.scope, s.changes) for s in result.trace]
        assert rows[1] == (3, "Κύριος", {})
        assert rows[2] == (8, "Μέγιστος", {"x": "3", "y": "8"})
        # μ gets the result back on the Κάλεσε line, after Μέγιστος's own rows.
        assert (3, "Κύριος", {"μ": "8"}) in rows[3:]

    def test_data_go_in_by_value(self) -> None:
        source = """Αλγόριθμος Κύριος
a ← 1
Κάλεσε Αλλάζει(a)
Εμφάνισε a
Τέλος Κύριος
Αλγόριθμος Αλλάζει
Δεδομένα // a //
a ← 99
Τέλος Αλλάζει"""
        assert output(source) == ["1"]

    def test_the_wrong_number_of_arguments(self) -> None:
        source = self.MAIN.replace("Κάλεσε Μέγιστος(α, β, μ)", "Κάλεσε Μέγιστος(α, β)")
        message, line = error(source)
        assert "3 παραμέτρους (x, y, max)" in message
        assert line == 3

    def test_a_result_needs_a_variable(self) -> None:
        message, _ = error(self.MAIN.replace("Μέγιστος(α, β, μ)", "Μέγιστος(α, β, 1)"))
        assert "δώσε μια μεταβλητή" in message

    def test_an_expression_call_needs_exactly_one_result(self) -> None:
        source = """Αλγόριθμος Κύριος
x ← Δύο(1)
Τέλος Κύριος
Αλγόριθμος Δύο
Δεδομένα // a //
b ← a
c ← a
Αποτελέσματα // b, c //
Τέλος Δύο"""
        message, line = error(source)
        assert "ένα αποτέλεσμα" in message and line == 2

    def test_an_unknown_algorithm(self) -> None:
        assert "δεν έχει οριστεί" in error(algorithm("Κάλεσε Λείπει(1)"))[0]

    def test_a_call_without_the_keyword(self) -> None:
        assert "Κάλεσε Χ(...)" in error(algorithm("Χ(1)"))[0]

    def test_arrays_keep_their_indices_across_calls(self) -> None:
        source = """Αλγόριθμος Κύριος
Π[1] ← 1
Κάλεσε Β(Π)
Τέλος Κύριος
Αλγόριθμος Β
Δεδομένα // Τ //
Εμφάνισε Τ[1, 1]
Τέλος Β"""
        message, line = error(source)
        assert "με 2" in message and line == 3

    def test_runaway_recursion_stops(self) -> None:
        source = """Αλγόριθμος Ατέρμονο
Δεδομένα // n //
m ← Ατέρμονο(n + 1)
Αποτελέσματα // m //
Τέλος Ατέρμονο"""
        assert "αναδρομή" in error(source, ["1"])[0]


class TestValues:
    def test_read_takes_the_type_of_what_was_typed(self) -> None:
        source = algorithm("Διάβασε a, b, c, d\nΕμφάνισε a + 1, b * 2, c, ' ', όχι d")
        assert output(source, ["4", "2,5", "λέξη", "αληθής"]) == ["5 5λέξη ΨΕΥΔΗΣ"]

    def test_a_variable_with_no_value(self) -> None:
        message, line = error(algorithm("Εμφάνισε x"))
        assert message == "Η μεταβλητή x δεν έχει πάρει τιμή."
        assert line == 2

    def test_an_element_with_no_value(self) -> None:
        assert "Το στοιχείο Α[3] δεν έχει πάρει τιμή." in error(algorithm("Α[1] ← 1\nx ← Α[3]"))[0]

    def test_indices_start_at_one(self) -> None:
        assert "από 1 και πάνω" in error(algorithm("Α[0] ← 1"))[0]

    def test_swap(self) -> None:
        assert output(algorithm("a ← 1\nb ← 2\nΑντιμετάθεσε a, b\nΕμφάνισε a, b")) == ["2 1"]

    def test_swap_finds_both_places_first(self) -> None:
        body = "Π[1] ← 2\nΠ[2] ← 5\ni ← 1\nΑντιμετάθεσε i, Π[i]\nΕμφάνισε i, ' ', Π[1], ' ', Π[2]"
        assert output(algorithm(body)) == ["2 1 5"]

    def test_a_huge_typed_integer_is_an_error(self) -> None:
        assert "πολύ μεγάλος" in error(algorithm("Διάβασε x"), ["9" * 5000])[0]

    def test_deep_recursion_with_a_big_array_stops(self) -> None:
        source = """Αλγόριθμος Κύριος
Για κ από 1 μέχρι 9000
  Τ[κ] ← κ
Τέλος_επανάληψης
Κάλεσε Β(Τ, 1)
Τέλος Κύριος
Αλγόριθμος Β
Δεδομένα // Τ, κ //
Αν κ < 190 τότε Κάλεσε Β(Τ, κ + 1)
Τέλος Β"""
        assert "αντίγραφα του πίνακα" in error(source)[0]

    def test_an_array_can_not_be_read_whole_from_the_data(self) -> None:
        source = algorithm("x ← table[1]", header="Δεδομένα // table //\n")
        assert "δεν διαβάζεται ολόκληρος" in error(source)[0]

    def test_trace_names_elements(self) -> None:
        result = go(algorithm("Α[2] ← 5"), trace=True)
        assert result.trace is not None
        assert result.trace[0].changes == {"Α[2]": "5"}


class TestSyntax:
    @pytest.mark.parametrize(
        ("body", "fragment"),
        [
            ("Εμφάνισε 1\nΤέλος αν", "με κάτω παύλα"),
            ("Επανάλαβε\nx ← 1\nΜέχρις_ότου x > 0", "Αρχή_επανάληψης"),
            ("x = 1", "<-"),
            ("x ← 1\nΑν x > 0 τότε\nx ← 2", "Τέλος_αν"),
            ("x ← Α", "δεν έχει πάρει τιμή"),
            ("Α[1] ← 1\nx ← Α", "είναι πίνακας"),
            ("Α[1] ← 1\nΑ[1, 2] ← 1", "με 1 δείκτη"),
        ],
    )
    def test_messages(self, body: str, fragment: str) -> None:
        result = go(algorithm(body))
        assert result.status == "error"
        assert result.error is not None and fragment in result.error.message

    def test_data_lists_names_only(self) -> None:
        source = algorithm("Ρ ← 1", header="Δεδομένα // M1, M2 ακέραιοι //\n")
        assert "μόνο ονόματα" in (check(source, "pseudocode") or pytest.fail()).message

    @pytest.mark.parametrize("names", ["", "x, "])
    def test_data_need_names(self, names: str) -> None:
        source = algorithm("y ← 1", header=f"Δεδομένα // {names}//\n")
        assert check(source, "pseudocode") is not None

    def test_data_after_results(self) -> None:
        source = algorithm("y ← 1\nΑποτελέσματα // y //\nΔεδομένα // x //")
        assert "δεύτερη γραμμή" in (check(source, "pseudocode") or pytest.fail()).message

    def test_data_go_on_the_second_line(self) -> None:
        source = algorithm("x ← 1\nΔεδομένα // a //")
        assert "δεύτερη γραμμή" in (check(source, "pseudocode") or pytest.fail()).message

    def test_the_end_names_the_algorithm(self) -> None:
        source = "Αλγόριθμος Α\nx ← 1\nΤέλος Β"
        assert "λέγεται Α" in (check(source, "pseudocode") or pytest.fail()).message

    def test_a_valid_algorithm_has_no_error(self) -> None:
        assert check(algorithm("x ← 1"), "pseudocode") is None

    def test_keywords_ignore_case_and_accents(self) -> None:
        source = "ΑΛΓΟΡΙΘΜΟΣ Α\nΑΝ 1 < 2 ΤΟΤΕ\nΕΜΦΑΝΙΣΕ 'ναι'\nΤΕΛΟΣ_ΑΝ\nΤΕΛΟΣ Α"
        assert output(source) == ["ναι"]

    def test_a_glossa_program_in_algorithm_mode(self) -> None:
        error = check("ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "pseudocode")
        assert error is not None and "«Πρόγραμμα»" in error.message

    def test_an_algorithm_in_program_mode(self) -> None:
        error = check("Αλγόριθμος Α\nx ← 1\nΤέλος Α")
        assert error is not None and "«Αλγόριθμος»" in error.message

    def test_glossa_points_to_the_ascii_comparison(self) -> None:
        error = check("ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\nΓΡΑΨΕ 1 ≤ 2\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ")
        assert error is not None and "<=" in error.message


class TestOneLineIf:
    def test_an_outer_end_if_belongs_to_the_outer_if(self) -> None:
        source = algorithm(
            """Διάβασε a, b
x ← 0
Αν a > 0 τότε
  Αν b > 0 τότε x ← 1
Τέλος_αν
Εμφάνισε x"""
        )
        assert output(source, ["1", "1"]) == ["1"]
        assert output(source, ["-1", "1"]) == ["0"]

    def test_a_one_line_if_with_an_else_below_it(self) -> None:
        source = algorithm(
            """Διάβασε a
Αν a > 0 τότε x ← 1
αλλιώς
  x ← 2
Τέλος_αν
Εμφάνισε x"""
        )
        assert output(source, ["-3"]) == ["2"]


def test_frames_show_arrays_without_a_size() -> None:
    result = go(algorithm("Για i από 1 μέχρι 2\n  Π[i] ← 10 * i\nΤέλος_επανάληψης"))
    frame = result.frames[0]
    assert frame.title.startswith("Αλγόριθμος ")
    i, array = frame.variables
    assert (i.name, i.type, i.value) == ("i", None, "3")
    assert (array.dims, array.cells) == ([], {"Π[1]": "10", "Π[2]": "20"})


def test_a_copied_array_is_traced() -> None:
    source = """Αλγόριθμος Κύριος
Π[1] ← 4
Κάλεσε Διπλό(Π, χ)
Εμφάνισε χ
Τέλος Κύριος

Αλγόριθμος Διπλό
Δεδομένα // Α //
χ ← 2 * Α[1]
Αποτελέσματα // χ //
Τέλος Διπλό
"""
    result = go(source, trace=True)
    assert result.output == ["8"], result.error
    assert result.trace is not None
    assert next(s for s in result.trace if s.scope == "Διπλό").copied == {"Α": "Π"}
