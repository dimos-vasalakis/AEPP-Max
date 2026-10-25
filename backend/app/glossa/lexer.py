import re
import unicodedata
from dataclasses import dataclass
from typing import Literal

from app.glossa.errors import GlossaError

TokenKind = Literal[
    "keyword",  # ΠΡΟΓΡΑΜΜΑ, ΑΝ, ΤΕΛΟΣ_ΑΝ, ΑΚΕΡΑΙΕΣ, ... (normalized)
    "identifier",  # as written; compare with normalize()
    "integer",
    "real",
    "string",  # without the quotes
    "boolean",  # ΑΛΗΘΗΣ / ΨΕΥΔΗΣ
    "operator",  # <- + - * / ^ = <> < > <= >= DIV MOD ΚΑΙ Η ΟΧΙ (← becomes <-)
    "punct",  # ( ) [ ] , : ..
    "newline",  # statements end at line ends
    "eof",
]


@dataclass(frozen=True)
class Token:
    kind: TokenKind
    value: str
    line: int
    column: int  # 1-based
    end_column: int  # exclusive


KEYWORDS = frozenset(
    {
        "ΠΡΟΓΡΑΜΜΑ", "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ",
        "ΔΙΑΒΑΣΕ", "ΓΡΑΨΕ",
        "ΑΝ", "ΤΟΤΕ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ",
        "ΕΠΙΛΕΞΕ", "ΠΕΡΙΠΤΩΣΗ", "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
        "ΓΙΑ", "ΑΠΟ", "ΜΕΧΡΙ", "ΜΕ_ΒΗΜΑ", "ΟΣΟ", "ΕΠΑΝΑΛΑΒΕ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
        "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ",
        "ΣΥΝΑΡΤΗΣΗ", "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ", "ΔΙΑΔΙΚΑΣΙΑ", "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ", "ΚΑΛΕΣΕ",
        "ΑΚΕΡΑΙΕΣ", "ΠΡΑΓΜΑΤΙΚΕΣ", "ΧΑΡΑΚΤΗΡΕΣ", "ΛΟΓΙΚΕΣ",
        "ΑΚΕΡΑΙΑ", "ΠΡΑΓΜΑΤΙΚΗ", "ΧΑΡΑΚΤΗΡΑΣ", "ΛΟΓΙΚΗ",
    }
)  # fmt: skip
WORD_OPERATORS = frozenset({"DIV", "MOD", "ΚΑΙ", "Η", "ΟΧΙ"})
BOOLEANS = frozenset({"ΑΛΗΘΗΣ", "ΨΕΥΔΗΣ"})

# Longest first, so "<-" wins over "<".
_SYMBOLS = ("<-", "<=", ">=", "<>", "←", "<", ">", "=", "+", "-", "*", "/", "^")
_PUNCT = ("(", ")", "[", "]", ",", ":", "..")

_NUMBER = re.compile(r"[0-9]+(?:\.[0-9]+)?")
_WORD = re.compile(r"[^\W\d_][\ẁ-ͯ]*")
# Same line breaks as CodeMirror, so line numbers match the editor.
_LINE_BREAK = re.compile(r"\r\n|\r|\n")

# Latin capitals that look like Greek ones: "AN" typed on an English layout.
_LATIN_LOOKALIKES = str.maketrans("ABEZHIKMNOPTYX", "ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ")
# Words worth a "wrong keyboard layout" hint. Not Η: a Latin H is a fine variable name.
_HINT_WORDS = KEYWORDS | BOOLEANS | {"ΚΑΙ", "ΟΧΙ"}


def normalize(word: str) -> str:
    """Uppercase without accents (ς → Σ): how keywords and names are compared."""
    decomposed = unicodedata.normalize("NFD", word)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).upper()


def tokenize(source: str) -> list[Token]:
    """Split ΓΛΩΣΣΑ source into tokens (rules in docs/glossa.md).

    Keywords and word operators match regardless of case and accents and are
    emitted normalized. A line starting with `&` continues the previous one.
    """
    tokens: list[Token] = []
    for index, text in enumerate(_LINE_BREAK.split(source)):
        line = index + 1
        pos = 0
        stripped = text.lstrip()
        if stripped.startswith("&"):
            while tokens and tokens[-1].kind == "newline":
                tokens.pop()
            pos = len(text) - len(stripped) + 1
        while pos < len(text):
            pos = _scan(text, pos, line, tokens)
        tokens.append(Token("newline", "", line, len(text) + 1, len(text) + 1))
    last = tokens[-1]
    tokens.append(Token("eof", "", last.line, last.column, last.column))
    return tokens


def _scan(text: str, pos: int, line: int, tokens: list[Token]) -> int:
    """Append the token starting at `pos` and return the position after it."""
    ch = text[pos]
    col = pos + 1
    if ch in " \t":
        return pos + 1
    if ch == "!":
        return len(text)

    if ch in "'\"":
        end = text.find(ch, pos + 1)
        if end == -1:
            raise GlossaError(
                f"Τα εισαγωγικά ({ch}) δεν κλείνουν σε αυτή τη γραμμή.",
                line,
                "syntax",
                col,
                len(text) + 1,
            )
        tokens.append(Token("string", text[pos + 1 : end], line, col, end + 2))
        return end + 1

    if match := _NUMBER.match(text, pos):
        kind = "real" if "." in match.group() else "integer"
        tokens.append(Token(kind, match.group(), line, col, match.end() + 1))
        return match.end()

    if match := _WORD.match(text, pos):
        word = match.group()
        key = normalize(word)
        end = match.end() + 1
        if key in KEYWORDS:
            tokens.append(Token("keyword", key, line, col, end))
        elif key in WORD_OPERATORS:
            tokens.append(Token("operator", key, line, col, end))
        elif key in BOOLEANS:
            tokens.append(Token("boolean", key, line, col, end))
        else:
            greek = key.translate(_LATIN_LOOKALIKES)
            if greek != key and greek in _HINT_WORDS:
                raise GlossaError(
                    f"Η λέξη «{word}» έχει λατινικούς χαρακτήρες. Μήπως εννοείς {greek};",
                    line,
                    "syntax",
                    col,
                    end,
                )
            tokens.append(Token("identifier", word, line, col, end))
        return match.end()

    for symbol in _SYMBOLS + _PUNCT:
        if text.startswith(symbol, pos):
            kind = "punct" if symbol in _PUNCT else "operator"
            value = "<-" if symbol == "←" else symbol
            tokens.append(Token(kind, value, line, col, col + len(symbol)))
            return pos + len(symbol)

    if ch == "&":
        message = "Το & μπαίνει μόνο στην αρχή γραμμής, για να συνεχίσει την προηγούμενη."
    else:
        message = f"Ο χαρακτήρας «{ch}» δεν επιτρέπεται εδώ."
    raise GlossaError(message, line, "syntax", col, col + 1)
