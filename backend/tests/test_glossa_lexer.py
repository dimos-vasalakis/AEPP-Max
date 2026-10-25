import pytest

from app.glossa.errors import GlossaError
from app.glossa.lexer import normalize, tokenize


def kinds_values(source: str) -> list[tuple[str, str]]:
    return [(t.kind, t.value) for t in tokenize(source) if t.kind not in ("newline", "eof")]


def test_keywords_ignore_case_and_accents() -> None:
    assert kinds_values("αλλιώς_αν Τέλος_Επανάληψης") == [
        ("keyword", "ΑΛΛΙΩΣ_ΑΝ"),
        ("keyword", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ"),
    ]


def test_identifiers_keep_their_spelling() -> None:
    assert kinds_values("Μέσος_Όρος") == [("identifier", "Μέσος_Όρος")]
    assert normalize("Μέσος_όρος") == "ΜΕΣΟΣ_ΟΡΟΣ"


def test_literals_and_operators() -> None:
    assert kinds_values("x <- 3.5 + 2 * 'α' ← ΑΛΗΘΗΣ") == [
        ("identifier", "x"),
        ("operator", "<-"),
        ("real", "3.5"),
        ("operator", "+"),
        ("integer", "2"),
        ("operator", "*"),
        ("string", "α"),
        ("operator", "<-"),
        ("boolean", "ΑΛΗΘΗΣ"),
    ]


def test_range_is_not_a_real() -> None:
    assert kinds_values("1..5") == [("integer", "1"), ("punct", ".."), ("integer", "5")]


def test_word_operators() -> None:
    assert kinds_values("α και β ή όχι γ div 2 mod 3") == [
        ("identifier", "α"),
        ("operator", "ΚΑΙ"),
        ("identifier", "β"),
        ("operator", "Η"),
        ("operator", "ΟΧΙ"),
        ("identifier", "γ"),
        ("operator", "DIV"),
        ("integer", "2"),
        ("operator", "MOD"),
        ("integer", "3"),
    ]


def test_comments_are_skipped_but_not_inside_strings() -> None:
    assert kinds_values("ΓΡΑΨΕ 'Γεια!' ! σχόλιο") == [
        ("keyword", "ΓΡΑΨΕ"),
        ("string", "Γεια!"),
    ]


def test_ampersand_continues_the_previous_line() -> None:
    tokens = tokenize("ΓΡΑΨΕ 1,\n  & 2\nΓΡΑΨΕ 3")
    assert [(t.kind, t.line) for t in tokens] == [
        ("keyword", 1),
        ("integer", 1),
        ("punct", 1),
        ("integer", 2),
        ("newline", 2),
        ("keyword", 3),
        ("integer", 3),
        ("newline", 3),
        ("eof", 3),
    ]


def test_columns_are_one_based_and_end_exclusive() -> None:
    token = tokenize("  ΓΡΑΨΕ x")[0]
    assert (token.line, token.column, token.end_column) == (1, 3, 8)


@pytest.mark.parametrize(
    ("source", "message", "column"),
    [
        ("ΓΡΑΨΕ 'Γεια", "Τα εισαγωγικά (') δεν κλείνουν", 7),
        ("x <- 5 # 2", "Ο χαρακτήρας «#» δεν επιτρέπεται", 8),
        ("x <- 1 & 2", "Το & μπαίνει μόνο στην αρχή γραμμής", 8),
        ("TOTE", "Μήπως εννοείς ΤΟΤΕ;", 1),
        ("ΑΝ x > 1 TΟΤΕ", "Μήπως εννοείς ΤΟΤΕ;", 10),
    ],
)
def test_lexical_errors(source: str, message: str, column: int) -> None:
    with pytest.raises(GlossaError) as exc:
        tokenize(source)
    assert message in exc.value.message
    assert (exc.value.kind, exc.value.line, exc.value.column) == ("syntax", 1, column)


def test_latin_variable_names_are_fine() -> None:
    assert kinds_values("max <- H") == [
        ("identifier", "max"),
        ("operator", "<-"),
        ("identifier", "H"),
    ]
