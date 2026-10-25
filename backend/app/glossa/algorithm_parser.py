"""Parser for ψευδογλώσσα, the textbook's pseudocode (Αλγόριθμος ... Τέλος).

It reuses the ΓΛΩΣΣΑ parser for statements and expressions; what differs is
the frame of an algorithm, the Δεδομένα / Αποτελέσματα lines, the output words
(Εμφάνισε, Εκτύπωσε, Γράψε), Αντιμετάθεσε, and the one-line Αν ... τότε εντολή.
Rules and open points: docs/glossa.md, "Αλγόριθμοι (ψευδογλώσσα)".
"""

from collections.abc import Callable

from app.glossa import nodes as n
from app.glossa.algorithm_checker import check_algorithms
from app.glossa.errors import GlossaError
from app.glossa.lexer import PSEUDOCODE_KEYWORDS, Token, normalize
from app.glossa.parser import _Parser

# The textbook's spelling, for error messages (keep in sync with the editor's
# frontend/src/lib/glossa/vocabulary.ts, which writes the words this way).
SPELLING = {
    "ΑΛΓΟΡΙΘΜΟΣ": "Αλγόριθμος", "ΤΕΛΟΣ": "Τέλος", "ΔΕΔΟΜΕΝΑ": "Δεδομένα",
    "ΑΠΟΤΕΛΕΣΜΑΤΑ": "Αποτελέσματα", "ΔΙΑΒΑΣΕ": "Διάβασε", "ΓΡΑΨΕ": "Γράψε",
    "ΕΜΦΑΝΙΣΕ": "Εμφάνισε", "ΕΚΤΥΠΩΣΕ": "Εκτύπωσε", "ΑΝΤΙΜΕΤΑΘΕΣΕ": "Αντιμετάθεσε",
    "ΑΝ": "Αν", "ΤΟΤΕ": "τότε", "ΑΛΛΙΩΣ_ΑΝ": "αλλιώς_αν", "ΑΛΛΙΩΣ": "αλλιώς",
    "ΤΕΛΟΣ_ΑΝ": "Τέλος_αν", "ΕΠΙΛΕΞΕ": "Επίλεξε", "ΠΕΡΙΠΤΩΣΗ": "Περίπτωση",
    "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ": "Τέλος_επιλογών", "ΓΙΑ": "Για", "ΑΠΟ": "από", "ΜΕΧΡΙ": "μέχρι",
    "ΜΕ_ΒΗΜΑ": "με_βήμα", "ΟΣΟ": "Όσο", "ΕΠΑΝΑΛΑΒΕ": "επανάλαβε",
    "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ": "Τέλος_επανάληψης", "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ": "Αρχή_επανάληψης",
    "ΜΕΧΡΙΣ_ΟΤΟΥ": "Μέχρις_ότου", "ΚΑΛΕΣΕ": "Κάλεσε", "ΚΑΙ": "και", "Η": "ή", "ΟΧΙ": "όχι",
}  # fmt: skip

BLOCK_END = frozenset(
    {
        "ΤΕΛΟΣ", "ΔΕΔΟΜΕΝΑ", "ΑΠΟΤΕΛΕΣΜΑΤΑ", "ΑΛΓΟΡΙΘΜΟΣ", "ΤΕΛΟΣ_ΑΝ", "ΑΛΛΙΩΣ_ΑΝ",
        "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ", "ΠΕΡΙΠΤΩΣΗ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ",
    }
)  # fmt: skip

# ΓΛΩΣΣΑ words that start a line, for a «this is a program» hint.
_GLOSSA_ONLY = frozenset({"ΠΡΟΓΡΑΜΜΑ", "ΜΕΤΑΒΛΗΤΕΣ", "ΣΤΑΘΕΡΕΣ", "ΑΡΧΗ", "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"})
_IF_GOES_ON = ("ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ")


def parse_algorithms(tokens: list[Token]) -> n.Algorithm:
    """The first algorithm, with the ones after it as its subprograms; then the
    static checks (algorithm_checker.py). Raises GlossaError(kind="syntax")."""
    main = _AlgorithmParser(tokens).algorithms()
    check_algorithms(main)
    return main


class _AlgorithmParser(_Parser):
    KEYWORDS = PSEUDOCODE_KEYWORDS
    BLOCK_END = BLOCK_END
    LANGUAGE = "της ψευδογλώσσας"

    def spell(self, keyword: str) -> str:
        return SPELLING.get(keyword, keyword)

    def algorithms(self) -> n.Algorithm:
        self.skip_newlines()
        main = self.algorithm()
        while not self.at("eof"):
            if not self.at_keyword("ΑΛΓΟΡΙΘΜΟΣ"):
                raise self.fail(
                    "Μετά το Τέλος ενός αλγορίθμου μπορεί να ακολουθεί μόνο άλλος Αλγόριθμος."
                )
            main.subprograms.append(self.algorithm())
        return main

    def algorithm(self) -> n.Algorithm:
        if not self.at_keyword("ΑΛΓΟΡΙΘΜΟΣ"):
            if (
                self.tok.kind in ("identifier", "keyword")
                and normalize(self.tok.value) in _GLOSSA_ONLY
            ):
                raise self.fail(
                    "Αυτό είναι πρόγραμμα σε ΓΛΩΣΣΑ. Για να το εκτελέσεις, "
                    "γύρισε στα Προγράμματα από το κουμπί πάνω αριστερά."
                )
            raise self.fail("Ο αλγόριθμος ξεκινά με Αλγόριθμος και το όνομά του.")
        opener = self.advance()
        name = self.expect_name("το όνομα του αλγορίθμου")
        self.end_of_line()
        data = self.names_between_slashes() if self.at_keyword("ΔΕΔΟΜΕΝΑ") else []
        body = self.block()
        if self.at_keyword("ΔΕΔΟΜΕΝΑ"):
            raise self.fail("Τα Δεδομένα γράφονται στη δεύτερη γραμμή, αμέσως μετά το Αλγόριθμος.")
        results = self.names_between_slashes() if self.at_keyword("ΑΠΟΤΕΛΕΣΜΑΤΑ") else []
        if self.at_keyword("ΔΕΔΟΜΕΝΑ"):
            raise self.fail("Τα Δεδομένα γράφονται στη δεύτερη γραμμή, αμέσως μετά το Αλγόριθμος.")
        if not (self.at_keyword("ΤΕΛΟΣ") or self.at("eof")) and results:
            raise self.fail(
                "Τα Αποτελέσματα γράφονται στην προτελευταία γραμμή, αμέσως πριν από το Τέλος."
            )
        self.close(opener, "ΤΕΛΟΣ")
        if self.at("identifier"):
            end_name = self.advance()
            if normalize(end_name.value) != normalize(name.value):
                raise self.fail(
                    f"Ο αλγόριθμος λέγεται {name.value}, όχι {end_name.value}.", end_name
                )
        self.end_of_line()
        return n.Algorithm(
            **self.pos_of(name),
            name=name.value,
            constants=[],
            variables=[],
            body=body,
            data=data,
            results=results,
        )

    def names_between_slashes(self) -> list[n.Name]:
        """`Δεδομένα // α, β //`: the names in it."""
        keyword = self.advance()
        example = f"{self.spell(keyword.value)} // α, β //"
        self.expect("punct", "//", f"// μετά το {self.spell(keyword.value)} (π.χ. {example})")
        if self.at("punct", "//"):
            raise self.fail(
                f"Γράψε τουλάχιστον ένα όνομα ανάμεσα στα //, ή άφησε έξω τη γραμμή "
                f"{self.spell(keyword.value)}."
            )
        names: list[n.Name] = []
        while True:
            token = self.expect_name("όνομα μεταβλητής")
            names.append(n.Name(**self.pos_of(token), name=token.value))
            if self.at("identifier"):
                raise self.fail(
                    "Μέσα στα // // γράφονται μόνο ονόματα, χωρισμένα με κόμμα. "
                    "Μια περιγραφή μπαίνει σε σχόλιο, μετά από !."
                )
            if not self.accept("punct", ","):
                break
        self.expect("punct", "//", "// στο τέλος της γραμμής")
        self.end_of_line()
        return names

    # Statements

    def statement_handlers(self) -> dict[str, Callable[[], n.Stmt]]:
        return super().statement_handlers() | {
            "ΕΜΦΑΝΙΣΕ": self.write,
            "ΕΚΤΥΠΩΣΕ": self.write,
            "ΑΝΤΙΜΕΤΑΘΕΣΕ": self.swap,
            "ΕΠΑΝΑΛΑΒΕ": self.repeat_misspelled,
        }

    def call_without_keyword(self, name: Token) -> GlossaError:
        return self.fail(
            f"Ένας άλλος αλγόριθμος καλείται με Κάλεσε: Κάλεσε {name.value}(...). "
            "Αν δίνει ένα αποτέλεσμα, μπορεί και μέσα σε έκφραση: x ← "
            f"{name.value}(...)."
        )

    def repeat_misspelled(self) -> n.Stmt:
        raise self.fail(
            "Η επανάληψη με έλεγχο στο τέλος γράφεται Αρχή_επανάληψης … Μέχρις_ότου συνθήκη."
        )

    def swap(self) -> n.Swap:
        keyword = self.advance()
        first = self.target()
        self.expect("punct", ",", ", και τη δεύτερη μεταβλητή")
        second = self.target()
        return n.Swap(**self.pos_of(keyword), first=first, second=second)

    def if_(self) -> n.If:
        """Also the textbook's one-line form, `Αν συνθήκη τότε εντολή`, with no
        Τέλος_αν. A one-line Αν takes an αλλιώς_αν, αλλιώς or Τέλος_αν on the
        lines after it only when that word is indented at least as far as the Αν:
        less indented, it belongs to an Αν further out."""
        opener = self.advance()
        condition = self.condition()
        self.expect_keyword("ΤΟΤΕ")
        body, inline = self.branch_body()
        branches = [n.Branch(**self.pos_of(opener), condition=condition, body=body)]
        if inline and not self.if_goes_on(opener):
            return n.If(**self.pos_of(opener), branches=branches, otherwise=None)
        while self.at_keyword("ΑΛΛΙΩΣ_ΑΝ"):
            keyword = self.advance()
            condition = self.condition()
            self.expect_keyword("ΤΟΤΕ")
            branches.append(
                n.Branch(**self.pos_of(keyword), condition=condition, body=self.next_branch())
            )
        otherwise = None
        if self.accept("keyword", "ΑΛΛΙΩΣ"):
            otherwise = self.next_branch()
            if self.at_keyword("ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ"):
                raise self.fail("Το αλλιώς είναι το τελευταίο σκέλος του Αν.")
        self.close(opener, "ΤΕΛΟΣ_ΑΝ")
        return n.If(**self.pos_of(opener), branches=branches, otherwise=otherwise)

    def branch_body(self) -> tuple[list[n.Stmt], bool]:
        """The statements after τότε or αλλιώς, and whether they were on the same
        line (then it's one statement, and its line end is still to come)."""
        if self.at("newline") or self.at("eof"):
            self.end_of_line()
            return self.block(), False
        return [self.statement()], True

    def next_branch(self) -> list[n.Stmt]:
        """A later branch of an Αν that goes on: on to the line after it."""
        body, inline = self.branch_body()
        if inline:
            self.end_of_line()
        return body

    def if_goes_on(self, opener: Token) -> bool:
        """After a one-line Αν: whether the next line continues it. Moves to that
        line if so; otherwise stays at the end of the Αν's line."""
        ahead = 0
        while self.peek(ahead).kind == "newline":
            ahead += 1
        token = self.peek(ahead)
        goes_on = (
            token.kind == "keyword" and token.value in _IF_GOES_ON and token.column >= opener.column
        )
        if goes_on:
            self.end_of_line()
        return goes_on
