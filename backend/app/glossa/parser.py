"""Recursive-descent parser for ΓΛΩΣΣΑ (grammar in docs/glossa.md).

Reports the first error only, in Greek, pointing at the offending token.
Where a common student mistake is recognizable (= instead of <-, ΤΕΛΟΣ ΑΝ
without the underscore, 0 < x < 10, ...), the message says how to fix it.
"""

import math
from collections.abc import Callable

from app.glossa import nodes as n
from app.glossa.checker import check_program
from app.glossa.errors import GlossaError
from app.glossa.interpreter import MAX_INTEGER
from app.glossa.lexer import KEYWORDS, WORD_OPERATORS, Token, normalize

DECLARATION_TYPES = {
    "ΑΚΕΡΑΙΕΣ": "ΑΚΕΡΑΙΑ",
    "ΠΡΑΓΜΑΤΙΚΕΣ": "ΠΡΑΓΜΑΤΙΚΗ",
    "ΧΑΡΑΚΤΗΡΕΣ": "ΧΑΡΑΚΤΗΡΑΣ",
    "ΛΟΓΙΚΕΣ": "ΛΟΓΙΚΗ",
}
PLURAL_OF = {single: plural for plural, single in DECLARATION_TYPES.items()}
COMPARISONS = frozenset({"=", "<>", "<", ">", "<=", ">="})

# A block of statements stops at any of these; the construct that opened it
# then checks that it's the keyword it needs.
BLOCK_END = frozenset(
    {
        "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΤΕΛΟΣ_ΑΝ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
        "ΠΕΡΙΠΤΩΣΗ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ", "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ",
        "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ", "ΣΥΝΑΡΤΗΣΗ", "ΔΙΑΔΙΚΑΣΙΑ",
    }
)  # fmt: skip


def parse(tokens: list[Token]) -> n.Program:
    """Build the AST, then run the static checks (app/glossa/checker.py).

    Raises GlossaError(kind="syntax") at the first problem.
    """
    program = _Parser(tokens).program()
    check_program(program)
    return program


def describe(token: Token) -> str:
    """How a token is named in error messages."""
    if token.kind == "newline":
        return "τέλος γραμμής"
    if token.kind == "eof":
        return "το τέλος του προγράμματος"
    if token.kind == "string":
        return f"το κείμενο '{token.value}'"
    return f"«{token.value}»"


def _joined(first: Token, second: Token, keywords: frozenset[str]) -> str | None:
    """`ΤΕΛΟΣ ΑΝ` written for `ΤΕΛΟΣ_ΑΝ`: the keyword the two words make, if any."""
    words = ("identifier", "keyword")
    if first.kind in words and second.kind in words and first.line == second.line:
        candidate = f"{normalize(first.value)}_{normalize(second.value)}"
        if candidate in keywords:
            return candidate
    return None


class _Parser:
    # What a subclass for another notation (algorithm_parser.py) changes.
    KEYWORDS = KEYWORDS
    BLOCK_END = BLOCK_END
    LANGUAGE = "της ΓΛΩΣΣΑΣ"  # "... είναι δεσμευμένη λέξη της ΓΛΩΣΣΑΣ"

    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0

    def spell(self, keyword: str) -> str:
        """How messages write a keyword: ΓΛΩΣΣΑ's are in capitals, as normalized."""
        return keyword

    # Token helpers

    @property
    def tok(self) -> Token:
        return self.tokens[self.pos]

    def peek(self, offset: int = 1) -> Token:
        return self.tokens[min(self.pos + offset, len(self.tokens) - 1)]

    def advance(self) -> Token:
        token = self.tok
        if token.kind != "eof":
            self.pos += 1
        return token

    def at(self, kind: str, value: str | None = None) -> bool:
        return self.tok.kind == kind and (value is None or self.tok.value == value)

    def at_keyword(self, *words: str) -> bool:
        return self.tok.kind == "keyword" and self.tok.value in words

    def accept(self, kind: str, value: str) -> Token | None:
        return self.advance() if self.at(kind, value) else None

    def describe(self, token: Token) -> str:
        if token.kind == "keyword":
            return f"«{self.spell(token.value)}»"
        return describe(token)

    def fail(self, message: str, token: Token | None = None) -> GlossaError:
        return GlossaError.at(token or self.tok, message)

    def unexpected(self, expected: str) -> GlossaError:
        pairs = [(self.tok, self.peek())]
        if self.pos > 0:
            pairs.insert(0, (self.tokens[self.pos - 1], self.tok))
        for first, second in pairs:
            if keyword := _joined(first, second, self.KEYWORDS):
                return self.fail(f"Γράψε {self.spell(keyword)} με κάτω παύλα (_).", first)
        return self.fail(f"Περίμενα {expected}, αλλά βρέθηκε {self.describe(self.tok)}.")

    def expect(self, kind: str, value: str, expected: str | None = None) -> Token:
        if self.at(kind, value):
            return self.advance()
        raise self.unexpected(expected or (self.spell(value) if kind == "keyword" else value))

    def expect_keyword(self, word: str) -> Token:
        return self.expect("keyword", word)

    def expect_name(self, what: str) -> Token:
        if self.tok.kind == "identifier":
            return self.advance()
        reserved = self.tok.kind in ("keyword", "boolean") or (
            self.tok.kind == "operator" and self.tok.value in WORD_OPERATORS
        )
        if reserved:
            raise self.fail(
                f"Το {self.spell(self.tok.value)} είναι δεσμευμένη λέξη {self.LANGUAGE} "
                "και δεν γίνεται όνομα."
            )
        raise self.unexpected(what)

    def skip_newlines(self) -> None:
        while self.at("newline"):
            self.advance()

    def end_of_line(self) -> None:
        if self.at("eof"):
            return
        if not self.at("newline"):
            raise self.unexpected("τέλος γραμμής")
        self.skip_newlines()

    def close(self, opener: Token, word: str) -> Token:
        """Expect the keyword that closes the construct `opener` started."""
        if self.at_keyword(word):
            return self.advance()
        what, end = self.spell(opener.value), self.spell(word)
        if self.at("eof"):
            raise self.fail(f"Το {what} δεν κλείνει: λείπει το {end}.", opener)
        if _joined(self.tok, self.peek(), self.KEYWORDS) == word:
            raise self.fail(f"Γράψε {end} με κάτω παύλα (_).")
        raise self.fail(
            f"Περίμενα {end} (για το {what} της γραμμής {opener.line}), "
            f"αλλά βρέθηκε {self.describe(self.tok)}."
        )

    @staticmethod
    def pos_of(token: Token) -> dict[str, int]:
        return {"line": token.line, "column": token.column, "end_column": token.end_column}

    # Program units

    def program(self) -> n.Program:
        self.skip_newlines()
        if self.at("identifier") and normalize(self.tok.value) == "ΑΛΓΟΡΙΘΜΟΣ":
            raise self.fail(
                "Αυτός είναι αλγόριθμος σε ψευδογλώσσα. Για να τον εκτελέσεις, "
                "διάλεξε «Αλγόριθμος» στον διακόπτη πάνω αριστερά."
            )
        if not self.at_keyword("ΠΡΟΓΡΑΜΜΑ"):
            raise self.fail("Το πρόγραμμα ξεκινά με ΠΡΟΓΡΑΜΜΑ και το όνομά του.")
        opener = self.advance()
        name = self.expect_name("το όνομα του προγράμματος")
        self.end_of_line()
        constants, variables = self.declarations()
        body = self.unit_body()
        self.close(opener, "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ")
        if self.at("identifier"):
            end_name = self.advance()
            if normalize(end_name.value) != normalize(name.value):
                raise self.fail(
                    f"Το πρόγραμμα λέγεται {name.value}, όχι {end_name.value}.", end_name
                )
        self.end_of_line()

        subprograms: list[n.Function | n.Procedure] = []
        while not self.at("eof"):
            if self.at_keyword("ΣΥΝΑΡΤΗΣΗ"):
                subprograms.append(self.function())
            elif self.at_keyword("ΔΙΑΔΙΚΑΣΙΑ"):
                subprograms.append(self.procedure())
            else:
                raise self.fail(
                    "Μετά το ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ επιτρέπονται μόνο ΣΥΝΑΡΤΗΣΗ και ΔΙΑΔΙΚΑΣΙΑ."
                )
        return n.Program(
            **self.pos_of(name),
            name=name.value,
            constants=constants,
            variables=variables,
            body=body,
            subprograms=subprograms,
        )

    def function(self) -> n.Function:
        opener = self.advance()
        name = self.expect_name("το όνομα της συνάρτησης")
        self.expect("punct", "(")
        params = self.params()
        self.expect("punct", ")")
        self.expect("punct", ":", ": και τον τύπο της συνάρτησης")
        if self.at("keyword") and self.tok.value in PLURAL_OF.values():
            single = DECLARATION_TYPES[self.tok.value]
            raise self.fail(f"Ο τύπος της συνάρτησης γράφεται στον ενικό: {single}.")
        if not (self.at("keyword") and self.tok.value in PLURAL_OF):
            raise self.unexpected("τύπο: ΑΚΕΡΑΙΑ, ΠΡΑΓΜΑΤΙΚΗ, ΧΑΡΑΚΤΗΡΑΣ ή ΛΟΓΙΚΗ")
        return_type = self.advance().value
        self.end_of_line()
        constants, variables = self.declarations()
        body = self.unit_body()
        self.close(opener, "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ")
        self.end_of_line()
        return n.Function(
            **self.pos_of(name),
            name=name.value,
            params=params,
            return_type=return_type,
            constants=constants,
            variables=variables,
            body=body,
        )

    def procedure(self) -> n.Procedure:
        opener = self.advance()
        name = self.expect_name("το όνομα της διαδικασίας")
        params: list[n.Param] = []
        if self.accept("punct", "("):
            params = self.params()
            self.expect("punct", ")")
        self.end_of_line()
        constants, variables = self.declarations()
        body = self.unit_body()
        self.close(opener, "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ")
        self.end_of_line()
        return n.Procedure(
            **self.pos_of(name),
            name=name.value,
            params=params,
            constants=constants,
            variables=variables,
            body=body,
        )

    def params(self) -> list[n.Param]:
        if self.at("punct", ")"):
            return []
        params = []
        while True:
            token = self.expect_name("όνομα παραμέτρου")
            params.append(n.Param(**self.pos_of(token), name=token.value))
            if not self.accept("punct", ","):
                return params

    def unit_body(self) -> list[n.Stmt]:
        if not self.at_keyword("ΑΡΧΗ"):
            raise self.unexpected("ΑΡΧΗ")
        self.advance()
        self.end_of_line()
        return self.block()

    def declarations(self) -> tuple[list[n.Constant], list[n.Variable]]:
        constants: list[n.Constant] = []
        variables: list[n.Variable] = []
        if self.accept("keyword", "ΣΤΑΘΕΡΕΣ"):
            self.end_of_line()
            while self.at("identifier"):
                name = self.advance()
                if self.at("operator", "<-"):
                    raise self.fail("Οι σταθερές παίρνουν τιμή με =, π.χ. π = 3.14.")
                self.expect("operator", "=")
                value = self.expression()
                constants.append(n.Constant(**self.pos_of(name), name=name.value, value=value))
                self.end_of_line()
        if self.accept("keyword", "ΜΕΤΑΒΛΗΤΕΣ"):
            self.end_of_line()
            while not self.at_keyword("ΑΡΧΗ") and not self.at("eof"):
                variables.extend(self.declaration_line())
                self.end_of_line()
        if self.at_keyword("ΣΤΑΘΕΡΕΣ"):
            raise self.fail("Οι ΣΤΑΘΕΡΕΣ δηλώνονται πριν από τις ΜΕΤΑΒΛΗΤΕΣ.")
        return constants, variables

    def declaration_line(self) -> list[n.Variable]:
        if self.at_keyword("ΣΤΑΘΕΡΕΣ"):
            raise self.fail("Οι ΣΤΑΘΕΡΕΣ δηλώνονται πριν από τις ΜΕΤΑΒΛΗΤΕΣ.")
        starts_statement = (
            self.at("keyword") and self.tok.value not in DECLARATION_TYPES | PLURAL_OF
        ) or (self.at("identifier") and self.peek().value == "<-")
        if starts_statement:
            raise self.unexpected("ΑΡΧΗ")
        if self.at("keyword") and self.tok.value in PLURAL_OF:
            raise self.fail(
                f"Στις δηλώσεις ο τύπος γράφεται στον πληθυντικό: {PLURAL_OF[self.tok.value]}."
            )
        if not (self.at("keyword") and self.tok.value in DECLARATION_TYPES):
            raise self.fail(
                "Κάθε γραμμή δηλώσεων ξεκινά με τύπο: "
                "ΑΚΕΡΑΙΕΣ, ΠΡΑΓΜΑΤΙΚΕΣ, ΧΑΡΑΚΤΗΡΕΣ ή ΛΟΓΙΚΕΣ, και μετά :"
            )
        type_token = self.advance()
        type_name = DECLARATION_TYPES[type_token.value]
        self.expect("punct", ":")
        variables = []
        while True:
            name = self.expect_name("όνομα μεταβλητής")
            dimensions: list[n.Expr] = []
            if self.accept("punct", "["):
                dimensions = self.expression_list()
                self.expect("punct", "]")
            variables.append(
                n.Variable(
                    **self.pos_of(name),
                    name=name.value,
                    type=type_name,
                    dimensions=dimensions,
                    declared_on=type_token.line,
                )
            )
            if not self.accept("punct", ","):
                return variables

    # Statements

    def block(self) -> list[n.Stmt]:
        body: list[n.Stmt] = []
        while not (self.at("eof") or self.at_keyword(*self.BLOCK_END)):
            body.append(self.statement())
            self.end_of_line()
        return body

    def statement_handlers(self) -> dict[str, Callable[[], n.Stmt]]:
        """The keywords that start a statement."""
        return {
            "ΔΙΑΒΑΣΕ": self.read,
            "ΓΡΑΨΕ": self.write,
            "ΑΝ": self.if_,
            "ΕΠΙΛΕΞΕ": self.select,
            "ΟΣΟ": self.while_,
            "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ": self.repeat,
            "ΓΙΑ": self.for_,
            "ΚΑΛΕΣΕ": self.call,
        }

    def call_without_keyword(self, name: Token) -> GlossaError:
        """A line that starts `name(`: a call written without ΚΑΛΕΣΕ."""
        return self.fail(
            f"Οι διαδικασίες καλούνται με ΚΑΛΕΣΕ: ΚΑΛΕΣΕ {name.value}(...). "
            "Οι συναρτήσεις χρησιμοποιούνται μέσα σε έκφραση."
        )

    def statement(self) -> n.Stmt:
        token = self.tok
        if keyword := _joined(token, self.peek(), self.KEYWORDS):
            raise self.fail(f"Γράψε {self.spell(keyword)} με κάτω παύλα (_).")
        if token.kind == "identifier":
            if self.peek().kind == "punct" and self.peek().value == "(":
                raise self.call_without_keyword(token)
            return self.assignment()
        if token.kind == "keyword":
            if handler := self.statement_handlers().get(token.value):
                return handler()
            raise self.fail(f"Το {self.spell(token.value)} δεν μπορεί να ξεκινά εντολή εδώ.")
        raise self.unexpected("εντολή")

    def assignment(self) -> n.Assign:
        target = self.target()
        if self.at("operator", "="):
            raise self.fail("Η εκχώρηση γράφεται με <- (το = είναι σύγκριση).")
        self.expect("operator", "<-", "<- (εκχώρηση)")
        value = self.expression()
        return n.Assign(
            line=target.line,
            column=target.column,
            end_column=target.end_column,
            target=target,
            value=value,
        )

    def target(self) -> n.Target:
        name = self.expect_name("όνομα μεταβλητής")
        if self.accept("punct", "["):
            indices = self.expression_list()
            self.expect("punct", "]")
            return n.Index(**self.pos_of(name), name=name.value, indices=indices)
        return n.Name(**self.pos_of(name), name=name.value)

    def read(self) -> n.Read:
        keyword = self.advance()
        targets = [self.target()]
        while self.accept("punct", ","):
            targets.append(self.target())
        return n.Read(**self.pos_of(keyword), targets=targets)

    def write(self) -> n.Write:
        keyword = self.advance()
        values = [] if self.at("newline") or self.at("eof") else self.expression_list()
        return n.Write(**self.pos_of(keyword), values=values)

    def condition(self) -> n.Expr:
        expr = self.expression()
        if self.at("operator", "<-"):
            raise self.fail("Στη συνθήκη η ισότητα γράφεται με =, όχι <-.")
        return expr

    def if_(self) -> n.If:
        opener = self.advance()
        branches = [self.branch(opener, "ΤΟΤΕ")]
        while self.at_keyword("ΑΛΛΙΩΣ_ΑΝ"):
            branches.append(self.branch(self.advance(), "ΤΟΤΕ"))
        otherwise = None
        if self.accept("keyword", "ΑΛΛΙΩΣ"):
            self.end_of_line()
            otherwise = self.block()
            if self.at_keyword("ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ"):
                raise self.fail("Το ΑΛΛΙΩΣ είναι το τελευταίο σκέλος του ΑΝ.")
        self.close(opener, "ΤΕΛΟΣ_ΑΝ")
        return n.If(**self.pos_of(opener), branches=branches, otherwise=otherwise)

    def branch(self, keyword: Token, then: str) -> n.Branch:
        condition = self.condition()
        self.expect_keyword(then)
        self.end_of_line()
        return n.Branch(**self.pos_of(keyword), condition=condition, body=self.block())

    def select(self) -> n.Select:
        opener = self.advance()
        subject = self.expression()
        self.end_of_line()
        cases: list[n.Case] = []
        otherwise = None
        while self.at_keyword("ΠΕΡΙΠΤΩΣΗ"):
            keyword = self.advance()
            if self.accept("keyword", "ΑΛΛΙΩΣ"):
                self.end_of_line()
                otherwise = self.block()
                if self.at_keyword("ΠΕΡΙΠΤΩΣΗ"):
                    case, other = self.spell("ΠΕΡΙΠΤΩΣΗ"), self.spell("ΑΛΛΙΩΣ")
                    raise self.fail(f"Η {case} {other} είναι η τελευταία περίπτωση.")
                break
            conditions = [self.case_condition()]
            while self.accept("punct", ","):
                conditions.append(self.case_condition())
            self.end_of_line()
            cases.append(n.Case(**self.pos_of(keyword), conditions=conditions, body=self.block()))
        if not cases and otherwise is None and not self.at("eof"):
            raise self.unexpected("ΠΕΡΙΠΤΩΣΗ")
        self.close(opener, "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ")
        return n.Select(**self.pos_of(opener), subject=subject, cases=cases, otherwise=otherwise)

    def case_condition(self) -> n.CaseCondition:
        start = self.tok
        if self.at("operator") and self.tok.value in COMPARISONS:
            op = self.advance().value
            return n.CaseCompare(**self.pos_of(start), op=op, value=self.expression())
        low = self.expression()
        if self.accept("punct", ".."):
            return n.CaseRange(**self.pos_of(start), low=low, high=self.expression())
        return n.CaseValue(**self.pos_of(start), value=low)

    def while_(self) -> n.While:
        opener = self.advance()
        condition = self.condition()
        self.expect_keyword("ΕΠΑΝΑΛΑΒΕ")
        self.end_of_line()
        body = self.block()
        self.close(opener, "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ")
        return n.While(**self.pos_of(opener), condition=condition, body=body)

    def repeat(self) -> n.RepeatUntil:
        opener = self.advance()
        self.end_of_line()
        body = self.block()
        self.close(opener, "ΜΕΧΡΙΣ_ΟΤΟΥ")
        return n.RepeatUntil(**self.pos_of(opener), body=body, condition=self.condition())

    def for_(self) -> n.For:
        opener = self.advance()
        counter = self.expect_name("τον μετρητή του ΓΙΑ")
        if self.at("punct", "["):
            raise self.fail("Ο μετρητής του ΓΙΑ είναι απλή μεταβλητή, όχι στοιχείο πίνακα.")
        self.expect_keyword("ΑΠΟ")
        start = self.expression()
        self.expect_keyword("ΜΕΧΡΙ")
        end = self.expression()
        step = self.expression() if self.accept("keyword", "ΜΕ_ΒΗΜΑ") else None
        self.end_of_line()
        body = self.block()
        self.close(opener, "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ")
        return n.For(
            **self.pos_of(opener),
            counter=n.Name(**self.pos_of(counter), name=counter.value),
            start=start,
            end=end,
            step=step,
            body=body,
        )

    def call(self) -> n.CallProcedure:
        keyword = self.advance()
        name = self.expect_name("το όνομα της διαδικασίας")
        args: list[n.Expr] = []
        if self.accept("punct", "("):
            if not self.at("punct", ")"):
                args = self.expression_list()
            self.expect("punct", ")")
        return n.CallProcedure(**self.pos_of(keyword), name=name.value, args=args)

    # Expressions, lowest precedence first: Η, ΚΑΙ, ΟΧΙ, comparison, + -, * / DIV MOD,
    # unary + -, ^.

    def expression_list(self) -> list[n.Expr]:
        values = [self.expression()]
        while self.accept("punct", ","):
            values.append(self.expression())
        return values

    def expression(self) -> n.Expr:
        return self.binary_level(("Η",), self.and_)

    def and_(self) -> n.Expr:
        return self.binary_level(("ΚΑΙ",), self.not_)

    def binary_level(self, ops: tuple[str, ...], operand: Callable[[], n.Expr]) -> n.Expr:
        left = operand()
        while self.at("operator") and self.tok.value in ops:
            op = self.advance()
            right = operand()
            left = n.Binary(**self.pos_of(op), op=op.value, left=left, right=right)
        return left

    def not_(self) -> n.Expr:
        if self.at("operator", "ΟΧΙ"):
            op = self.advance()
            return n.Unary(**self.pos_of(op), op="ΟΧΙ", operand=self.not_())
        return self.comparison()

    def comparison(self) -> n.Expr:
        left = self.additive()
        if self.at("operator") and self.tok.value in COMPARISONS:
            op = self.advance()
            left = n.Binary(**self.pos_of(op), op=op.value, left=left, right=self.additive())
            if self.at("operator") and self.tok.value in COMPARISONS:
                and_ = self.spell("ΚΑΙ")
                raise self.fail(
                    "Δύο συγκρίσεις στη σειρά δεν επιτρέπονται. "
                    f"Γράψε τες με {and_}, π.χ. 0 < x {and_} x < 10."
                )
        return left

    def additive(self) -> n.Expr:
        return self.binary_level(("+", "-"), self.multiplicative)

    def multiplicative(self) -> n.Expr:
        return self.binary_level(("*", "/", "DIV", "MOD"), self.unary)

    def unary(self) -> n.Expr:
        if self.at("operator", "-") or self.at("operator", "+"):
            op = self.advance()
            return n.Unary(**self.pos_of(op), op=op.value, operand=self.unary())
        return self.power()

    def power(self) -> n.Expr:
        left = self.primary()
        while self.at("operator", "^"):
            op = self.advance()
            left = n.Binary(**self.pos_of(op), op="^", left=left, right=self.unary())
        return left

    def primary(self) -> n.Expr:
        token = self.tok
        if token.kind in ("integer", "real", "string", "boolean"):
            self.advance()
            value: int | float | str | bool
            if token.kind == "integer":
                # Checked before int(), which refuses past 4300 digits.
                digits = token.value.lstrip("0")
                if len(digits) > len(str(MAX_INTEGER)) or int(digits or "0") > MAX_INTEGER:
                    raise GlossaError.at(token, "Ο αριθμός είναι πολύ μεγάλος.")
                value = int(digits or "0")
            elif token.kind == "real":
                value = float(token.value)
                if not math.isfinite(value):
                    raise GlossaError.at(token, "Ο αριθμός είναι πολύ μεγάλος.")
            elif token.kind == "boolean":
                value = token.value == "ΑΛΗΘΗΣ"
            else:
                value = token.value
            return n.Literal(**self.pos_of(token), value=value)
        if self.accept("punct", "("):
            expr = self.expression()
            self.expect("punct", ")")
            return expr
        if token.kind == "identifier":
            self.advance()
            if self.accept("punct", "("):
                args = [] if self.at("punct", ")") else self.expression_list()
                self.expect("punct", ")")
                return n.Call(**self.pos_of(token), name=token.value, args=args)
            if self.accept("punct", "["):
                indices = self.expression_list()
                self.expect("punct", "]")
                return n.Index(**self.pos_of(token), name=token.value, indices=indices)
            return n.Name(**self.pos_of(token), name=token.value)
        if token.kind == "keyword":
            raise self.fail(
                f"Περίμενα τιμή ή έκφραση, αλλά βρέθηκε η λέξη {self.spell(token.value)}."
            )
        raise self.unexpected("τιμή ή έκφραση")
