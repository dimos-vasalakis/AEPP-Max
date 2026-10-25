from textwrap import dedent

import pytest

from app import glossa
from app.glossa import nodes as n
from app.glossa.lexer import tokenize
from app.glossa.parser import parse


def program(body: str, declarations: str = "  ΑΚΕΡΑΙΕΣ: x, y, i\n", after: str = "") -> str:
    """A main program around `body` (indented by the caller)."""
    return f"ΠΡΟΓΡΑΜΜΑ Τεστ\nΜΕΤΑΒΛΗΤΕΣ\n{declarations}ΑΡΧΗ\n{body}ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n{after}"


def error(source: str) -> glossa.ErrorInfo:
    info = glossa.check(source)
    assert info is not None, "expected an error"
    assert info.kind == "syntax"
    return info


FULL_PROGRAM = dedent(
    """\
    ΠΡΟΓΡΑΜΜΑ Βαθμοί
    ! Όλη η γραμματική σε ένα πρόγραμμα
    ΣΤΑΘΕΡΕΣ
      Ν = 5
      ΟΡΙΟ = 9.5
      ΤΙΤΛΟΣ = 'Αποτελέσματα'
      ΑΡΝΗΤΙΚΟ = -1
    ΜΕΤΑΒΛΗΤΕΣ
      ΑΚΕΡΑΙΕΣ: i, j, πλήθος, Μ[Ν, 3]
      ΠΡΑΓΜΑΤΙΚΕΣ: Β[Ν], μέσος
      ΧΑΡΑΚΤΗΡΕΣ: όνομα
      ΛΟΓΙΚΕΣ: βρέθηκε
    ΑΡΧΗ
      ΓΡΑΨΕ ΤΙΤΛΟΣ
      ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ Ν
        ΔΙΑΒΑΣΕ Β[i]
      ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
      ΓΙΑ i ΑΠΟ Ν ΜΕΧΡΙ 1 ΜΕ_ΒΗΜΑ -1
        ΓΙΑ j ΑΠΟ 1 ΜΕΧΡΙ 3
          Μ[i, j] <- i * j MOD 7 + 2 ^ 3 DIV 2
        ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
      ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
      μέσος <- Μέσος_Όρος(Β)
      ΑΝ μέσος >= ΟΡΙΟ ΚΑΙ ΟΧΙ (μέσος > 20) ΤΟΤΕ
        ΓΡΑΨΕ 'Πέρασε με', μέσος
      ΑΛΛΙΩΣ_ΑΝ μέσος >= 5 Ή μέσος = ΑΡΝΗΤΙΚΟ ΤΟΤΕ
        ΓΡΑΨΕ 'Οριακά'
      ΑΛΛΙΩΣ
        ΓΡΑΨΕ 'Κόπηκε'
      ΤΕΛΟΣ_ΑΝ
      ΕΠΙΛΕΞΕ Α_Μ(μέσος)
        ΠΕΡΙΠΤΩΣΗ 20
          ΓΡΑΨΕ 'Άριστα'
        ΠΕΡΙΠΤΩΣΗ 15..19, 14
          ΓΡΑΨΕ 'Πολύ καλά'
        ΠΕΡΙΠΤΩΣΗ < 10
          ΓΡΑΨΕ 'Κάτω από τη βάση'
        ΠΕΡΙΠΤΩΣΗ ΑΛΛΙΩΣ
          ΓΡΑΨΕ 'Καλά'
      ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ
      πλήθος <- 0
      ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ
        ΔΙΑΒΑΣΕ όνομα
        πλήθος <- πλήθος + 1
      ΜΕΧΡΙΣ_ΟΤΟΥ όνομα = 'ΤΕΛΟΣ' Ή πλήθος >= Ν
      βρέθηκε <- ΨΕΥΔΗΣ
      i <- 1
      ΟΣΟ i <= Ν ΚΑΙ ΟΧΙ βρέθηκε ΕΠΑΝΑΛΑΒΕ
        ΑΝ Β[i] > Τ_Ρ(ΟΡΙΟ) ΤΟΤΕ
          βρέθηκε <- ΑΛΗΘΗΣ
        ΤΕΛΟΣ_ΑΝ
        i <- i + 1
      ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
      ΚΑΛΕΣΕ Τύπωσε(Μ, 'Πίνακας Μ:',
        & βρέθηκε)
      ΚΑΛΕΣΕ Γραμμή
    ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ Βαθμοί

    ΣΥΝΑΡΤΗΣΗ Μέσος_Όρος(Π): ΠΡΑΓΜΑΤΙΚΗ
    ΣΤΑΘΕΡΕΣ
      Ν = 5
    ΜΕΤΑΒΛΗΤΕΣ
      ΠΡΑΓΜΑΤΙΚΕΣ: Π[Ν], Σ
      ΑΚΕΡΑΙΕΣ: k
    ΑΡΧΗ
      Σ <- 0
      ΓΙΑ k ΑΠΟ 1 ΜΕΧΡΙ Ν
        Σ <- Σ + Π[k]
      ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
      Μέσος_Όρος <- Σ / Ν
    ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ

    ΔΙΑΔΙΚΑΣΙΑ Τύπωσε(Α, μήνυμα, σημαία)
    ΜΕΤΑΒΛΗΤΕΣ
      ΑΚΕΡΑΙΕΣ: Α[5, 3], r
      ΧΑΡΑΚΤΗΡΕΣ: μήνυμα
      ΛΟΓΙΚΕΣ: σημαία
    ΑΡΧΗ
      ΓΡΑΨΕ μήνυμα, σημαία
      ΓΙΑ r ΑΠΟ 1 ΜΕΧΡΙ 5
        ΓΡΑΨΕ Α[r, 1], Α[r, 2], Α[r, 3]
      ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
    ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ

    ΔΙΑΔΙΚΑΣΙΑ Γραμμή
    ΑΡΧΗ
      ΓΡΑΨΕ '----'
    ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ
    """
)


def test_full_grammar_parses() -> None:
    assert glossa.check(FULL_PROGRAM) is None


def test_ast_shape() -> None:
    ast = parse(tokenize(FULL_PROGRAM))
    assert ast.name == "Βαθμοί"
    assert [c.name for c in ast.constants] == ["Ν", "ΟΡΙΟ", "ΤΙΤΛΟΣ", "ΑΡΝΗΤΙΚΟ"]
    assert [(v.name, v.type, len(v.dimensions)) for v in ast.variables[:4]] == [
        ("i", "ΑΚΕΡΑΙΑ", 0),
        ("j", "ΑΚΕΡΑΙΑ", 0),
        ("πλήθος", "ΑΚΕΡΑΙΑ", 0),
        ("Μ", "ΑΚΕΡΑΙΑ", 2),
    ]
    assert [type(s).__name__ for s in ast.subprograms] == ["Function", "Procedure", "Procedure"]
    assert isinstance(ast.body[3], n.Assign)


def test_precedence() -> None:
    ast = parse(tokenize(program("  x <- 1 + 2 * 3 ^ 2\n  y <- -2 ^ 2\n")))
    one_plus = ast.body[0].value
    assert isinstance(one_plus, n.Binary) and one_plus.op == "+"
    assert isinstance(one_plus.right, n.Binary) and one_plus.right.op == "*"
    assert isinstance(one_plus.right.right, n.Binary) and one_plus.right.right.op == "^"
    minus = ast.body[1].value  # -(2^2), like js-glossa
    assert isinstance(minus, n.Unary) and isinstance(minus.operand, n.Binary)


def test_not_binds_looser_than_comparison() -> None:
    ast = parse(tokenize(program("  ΑΝ ΟΧΙ x > 1 ΚΑΙ y < 2 ΤΟΤΕ\n  ΤΕΛΟΣ_ΑΝ\n")))
    condition = ast.body[0].branches[0].condition
    assert isinstance(condition, n.Binary) and condition.op == "ΚΑΙ"
    assert isinstance(condition.left, n.Unary) and condition.left.op == "ΟΧΙ"
    assert isinstance(condition.left.operand, n.Binary) and condition.left.operand.op == ">"


def test_names_ignore_case_and_accents() -> None:
    source = program("  ΣΥΝΟΛΟ <- 1\n  γραψε σύνολο\n", declarations="  ΑΚΕΡΑΙΕΣ: Σύνολο\n")
    assert glossa.check(source) is None


def test_blank_lines_and_comments_anywhere() -> None:
    source = "\n! σχόλιο\nΠΡΟΓΡΑΜΜΑ Α ! όνομα\n\nΑΡΧΗ\n\n  ! τίποτα\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n\n"
    assert glossa.check(source) is None


@pytest.mark.parametrize(
    ("source", "message", "line"),
    [
        # Structure
        ("ΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "Το πρόγραμμα ξεκινά με ΠΡΟΓΡΑΜΜΑ", 1),
        ("ΠΡΟΓΡΑΜΜΑ\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "Περίμενα το όνομα του προγράμματος", 1),
        ("ΠΡΟΓΡΑΜΜΑ ΑΝ\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "δεσμευμένη λέξη", 1),
        ("ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\n", "λείπει το ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", 1),
        ("ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ Β", "Το πρόγραμμα λέγεται Α, όχι Β", 3),
        ("ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\nΓΡΑΨΕ 1", "επιτρέπονται μόνο ΣΥΝΑΡΤΗΣΗ", 4),
        (program("  ΓΡΑΨΕ 1 2\n"), "Περίμενα τέλος γραμμής, αλλά βρέθηκε «2»", 5),
        # Declarations
        ("ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  x: ΑΚΕΡΑΙΕΣ\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ξεκινά με τύπο", 3),
        (
            "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΑ: x\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
            "πληθυντικό: ΑΚΕΡΑΙΕΣ",
            3,
        ),
        (
            "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x\n  x <- 1\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
            "Περίμενα ΑΡΧΗ",
            4,
        ),
        (
            "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\nΣΤΑΘΕΡΕΣ\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
            "πριν από τις ΜΕΤΑΒΛΗΤΕΣ",
            3,
        ),
        ("ΠΡΟΓΡΑΜΜΑ Α\nΣΤΑΘΕΡΕΣ\n  π <- 3.14\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "παίρνουν τιμή με =", 3),
        # Statements
        (program("  x = 5\n"), "Η εκχώρηση γράφεται με <-", 5),
        (program("  ΑΝ x > 1 ΤΟΤΕ\n  ΤΕΛΟΣ ΑΝ\n"), "Γράψε ΤΕΛΟΣ_ΑΝ με κάτω παύλα", 6),
        (program("  ΑΝ x > 1 ΤΟΤΕ\n  ΑΛΛΙΩΣ ΑΝ x < 0 ΤΟΤΕ\n  ΤΕΛΟΣ_ΑΝ\n"), "Γράψε ΑΛΛΙΩΣ_ΑΝ", 6),
        (program("  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 9 ΜΕ ΒΗΜΑ 2\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n"), "Γράψε ΜΕ_ΒΗΜΑ", 5),
        (program("  ΑΝ x > 1\n  ΤΕΛΟΣ_ΑΝ\n"), "Περίμενα ΤΟΤΕ, αλλά βρέθηκε τέλος γραμμής", 5),
        (program("  ΑΝ x <- 1 ΤΟΤΕ\n  ΤΕΛΟΣ_ΑΝ\n"), "η ισότητα γράφεται με =", 5),
        (
            program("  ΑΝ x > 1 ΤΟΤΕ\n    x <- 1\n"),
            "Περίμενα ΤΕΛΟΣ_ΑΝ (για το ΑΝ της γραμμής 5)",
            7,
        ),
        (program("  ΟΣΟ x > 1 ΕΠΑΝΑΛΑΒΕ\n  ΤΕΛΟΣ_ΑΝ\n"), "Περίμενα ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", 6),
        (
            program("  ΑΝ x > 1 ΤΟΤΕ\n  ΑΛΛΙΩΣ\n  ΑΛΛΙΩΣ_ΑΝ x ΤΟΤΕ\n  ΤΕΛΟΣ_ΑΝ\n"),
            "ΑΛΛΙΩΣ είναι το τελευταίο",
            7,
        ),
        (program("  ΑΝ 0 < x < 10 ΤΟΤΕ\n  ΤΕΛΟΣ_ΑΝ\n"), "Δύο συγκρίσεις στη σειρά", 5),
        (program("  ΕΠΙΛΕΞΕ x\n    ΓΡΑΨΕ x\n  ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ\n"), "Περίμενα ΠΕΡΙΠΤΩΣΗ", 6),
        (
            program("  ΕΠΙΛΕΞΕ x\n  ΠΕΡΙΠΤΩΣΗ ΑΛΛΙΩΣ\n  ΠΕΡΙΠΤΩΣΗ 1\n  ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ\n"),
            "ΠΕΡΙΠΤΩΣΗ ΑΛΛΙΩΣ είναι η τελευταία",
            7,
        ),
        (program("  ΤΟΤΕ\n"), "Το ΤΟΤΕ δεν μπορεί να ξεκινά εντολή", 5),
        (program("  x <- (1 + 2\n"), "Περίμενα ), αλλά βρέθηκε τέλος γραμμής", 5),
        (program("  x <- ΓΡΑΨΕ\n"), "Περίμενα τιμή ή έκφραση, αλλά βρέθηκε η λέξη ΓΡΑΨΕ", 5),
        (program("  Τύπωσε(x)\n"), "Οι διαδικασίες καλούνται με ΚΑΛΕΣΕ", 5),
    ],
)
def test_syntax_errors(source: str, message: str, line: int) -> None:
    info = error(source)
    assert message in info.message
    assert info.line == line


PROC = "ΔΙΑΔΙΚΑΣΙΑ Δ(α)\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: α\nΑΡΧΗ\n  α <- 1\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ\n"
FUNC = "ΣΥΝΑΡΤΗΣΗ Φ(α): ΑΚΕΡΑΙΑ\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: α\nΑΡΧΗ\n  Φ <- α\nΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ\n"


@pytest.mark.parametrize(
    ("source", "message"),
    [
        # Names
        (program("  z <- 1\n"), "Η μεταβλητή z δεν έχει δηλωθεί"),
        (program("  ΔΙΑΒΑΣΕ z\n"), "Η μεταβλητή z δεν έχει δηλωθεί"),
        (program("  ΓΙΑ k ΑΠΟ 1 ΜΕΧΡΙ 2\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n"), "Η μεταβλητή k δεν έχει δηλωθεί"),
        (program("", declarations="  ΑΚΕΡΑΙΕΣ: x, X\n"), "Το όνομα X έχει ήδη δηλωθεί"),
        (program("", declarations="  ΑΚΕΡΑΙΕΣ: ΗΜ\n"), "όνομα ενσωματωμένης συνάρτησης"),
        (program("", declarations="  ΑΚΕΡΑΙΕΣ: Δ\n", after=PROC), "όνομα υποπρογράμματος"),
        # Constants
        (
            "ΠΡΟΓΡΑΜΜΑ Α\nΣΤΑΘΕΡΕΣ\n  Κ = 1\nΑΡΧΗ\n  Κ <- 2\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
            "Το Κ είναι σταθερά",
        ),
        (
            "ΠΡΟΓΡΑΜΜΑ Α\nΣΤΑΘΕΡΕΣ\n  Κ = 1 + 1\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
            "Μια σταθερά παίρνει συγκεκριμένη τιμή",
        ),
        # Arrays
        (program("", declarations="  ΑΚΕΡΑΙΕΣ: Π[x]\n"), "Το μέγεθος πίνακα"),
        (program("", declarations="  ΑΚΕΡΑΙΕΣ: Π[0]\n"), "Το μέγεθος πίνακα"),
        (program("  Π <- 1\n", declarations="  ΑΚΕΡΑΙΕΣ: Π[3]\n"), "γράψε ένα στοιχείο του"),
        (program("  x[1] <- 1\n"), "Το x δεν είναι πίνακας"),
        (
            program("  Μ[1] <- 1\n", declarations="  ΑΚΕΡΑΙΕΣ: Μ[2, 2]\n"),
            "έχει 2 διαστάσεις, αλλά δόθηκαν 1 δείκτης",
        ),
        (program("  y <- x(1)\n"), "Το x δεν είναι συνάρτηση"),
        # Calls
        (program("  ΚΑΛΕΣΕ Δ\n"), "Η διαδικασία Δ δεν έχει οριστεί"),
        (program("  y <- Φ(1)\n"), "Η συνάρτηση Φ δεν έχει οριστεί"),
        (program("  ΚΑΛΕΣΕ Δ(1, 2)\n", after=PROC), "παίρνει 1 παράμετρο, αλλά δόθηκαν 2"),
        (program("  ΚΑΛΕΣΕ Φ(1)\n", after=FUNC), "Η Φ είναι συνάρτηση"),
        (program("  y <- Δ(1)\n", after=PROC), "Η Δ είναι διαδικασία"),
        (program("  y <- Φ\n", after=FUNC), "καλείται με παρενθέσεις"),
        (program("  y <- ΗΜ(1, 2)\n"), "Η συνάρτηση ΗΜ παίρνει μία παράμετρο"),
        # Subprograms
        (
            program("", after=FUNC.replace("  Φ <- α\n", "")),
            "Η συνάρτηση Φ δεν παίρνει ποτέ τιμή",
        ),
        (
            program("", after=PROC.replace("  ΑΚΕΡΑΙΕΣ: α\n", "")),
            "Η παράμετρος α πρέπει να δηλωθεί",
        ),
        (
            program("", after=PROC.replace("  α <- 1\n", "  α <- x\n")),
            "Δεν υπάρχουν καθολικές μεταβλητές",
        ),
        (program("", after=FUNC + FUNC), "Υπάρχει ήδη υποπρόγραμμα με το όνομα Φ"),
        (
            program("", after=FUNC.replace("ΑΚΕΡΑΙΑ\n", "ΑΚΕΡΑΙΕΣ\n", 1)),
            "Ο τύπος της συνάρτησης γράφεται στον ενικό",
        ),
    ],
)
def test_static_errors(source: str, message: str) -> None:
    assert message in error(source).message


def test_main_constants_are_visible_in_subprograms() -> None:
    source = (
        "ΠΡΟΓΡΑΜΜΑ Α\nΣΤΑΘΕΡΕΣ\n  Ν = 3\nΑΡΧΗ\n  ΚΑΛΕΣΕ Δ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n"
        "ΔΙΑΔΙΚΑΣΙΑ Δ\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: Π[Ν]\nΑΡΧΗ\n  Π[1] <- Ν\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ\n"
    )
    assert glossa.check(source) is None


def test_error_points_at_the_token() -> None:
    info = error(program("  y <- x + zz\n"))
    assert (info.line, info.column, info.end_column) == (5, 12, 14)  # zz


def test_run_reports_syntax_errors_without_running() -> None:
    result = glossa.run(program("  x = 5\n"))
    assert result.status == "error"
    assert result.error is not None and result.error.line == 5


def test_absurd_nesting_is_an_error_not_a_crash() -> None:
    info = error(program("  x <- " + "(" * 2000 + "1" + ")" * 2000 + "\n"))
    assert "φωλιασμένα" in info.message
