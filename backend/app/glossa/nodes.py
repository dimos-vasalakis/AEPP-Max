"""AST node types. Every node keeps the position of its first token, so errors
and trace steps can point at it. Names keep the student's spelling; compare
them with `.key` (normalized like keywords)."""

from dataclasses import dataclass, field

from app.glossa.lexer import normalize

TypeName = str  # "ΑΚΕΡΑΙΑ" | "ΠΡΑΓΜΑΤΙΚΗ" | "ΧΑΡΑΚΤΗΡΑΣ" | "ΛΟΓΙΚΗ"


@dataclass(kw_only=True)
class Node:
    line: int
    column: int
    end_column: int


class Named:
    name: str

    @property
    def key(self) -> str:
        return normalize(self.name)


# Expressions


@dataclass(kw_only=True)
class Expr(Node):
    pass


@dataclass(kw_only=True)
class Literal(Expr):
    value: int | float | str | bool


@dataclass(kw_only=True)
class Name(Expr, Named):
    """A variable or constant (or a whole array, as a subprogram argument)."""

    name: str


@dataclass(kw_only=True)
class Index(Expr, Named):
    """An array element: Π[i] or Μ[i, j]."""

    name: str
    indices: list[Expr]


@dataclass(kw_only=True)
class Call(Expr, Named):
    """A function call, built-in or user-defined."""

    name: str
    args: list[Expr]


@dataclass(kw_only=True)
class Unary(Expr):
    op: str  # "-", "+", "ΟΧΙ"
    operand: Expr


@dataclass(kw_only=True)
class Binary(Expr):
    op: str  # + - * / ^ DIV MOD = <> < > <= >= ΚΑΙ Η
    left: Expr
    right: Expr


Target = Name | Index


# Statements


@dataclass(kw_only=True)
class Stmt(Node):
    pass


@dataclass(kw_only=True)
class Assign(Stmt):
    target: Target
    value: Expr


@dataclass(kw_only=True)
class Read(Stmt):
    targets: list[Target]


@dataclass(kw_only=True)
class Write(Stmt):
    values: list[Expr]


@dataclass(kw_only=True)
class Branch(Node):
    condition: Expr
    body: list[Stmt]


@dataclass(kw_only=True)
class If(Stmt):
    branches: list[Branch]  # ΑΝ, then each ΑΛΛΙΩΣ_ΑΝ
    otherwise: list[Stmt] | None


@dataclass(kw_only=True)
class CaseValue(Node):
    value: Expr


@dataclass(kw_only=True)
class CaseRange(Node):
    low: Expr
    high: Expr


@dataclass(kw_only=True)
class CaseCompare(Node):
    op: str  # = <> < > <= >=
    value: Expr


CaseCondition = CaseValue | CaseRange | CaseCompare


@dataclass(kw_only=True)
class Case(Node):
    conditions: list[CaseCondition]
    body: list[Stmt]


@dataclass(kw_only=True)
class Select(Stmt):
    subject: Expr
    cases: list[Case]
    otherwise: list[Stmt] | None


@dataclass(kw_only=True)
class While(Stmt):
    condition: Expr
    body: list[Stmt]


@dataclass(kw_only=True)
class RepeatUntil(Stmt):
    body: list[Stmt]
    condition: Expr


@dataclass(kw_only=True)
class For(Stmt):
    counter: Name
    start: Expr
    end: Expr
    step: Expr | None
    body: list[Stmt]


@dataclass(kw_only=True)
class CallProcedure(Stmt, Named):
    """ΚΑΛΕΣΕ: a procedure, or in ψευδογλώσσα another algorithm."""

    name: str
    args: list[Expr]


@dataclass(kw_only=True)
class Swap(Stmt):
    """Αντιμετάθεσε a, b (ψευδογλώσσα only): the two exchange values."""

    first: Target
    second: Target


# Declarations and program units


@dataclass(kw_only=True)
class Constant(Node, Named):
    name: str
    value: Expr


@dataclass(kw_only=True)
class Variable(Node, Named):
    name: str
    type: TypeName
    dimensions: list[Expr]  # empty for a simple variable


@dataclass(kw_only=True)
class Param(Node, Named):
    name: str


@dataclass(kw_only=True)
class Unit(Node, Named):
    """What a program, function and procedure share."""

    name: str
    constants: list[Constant]
    variables: list[Variable]
    body: list[Stmt]


@dataclass(kw_only=True)
class Function(Unit):
    params: list[Param]
    return_type: TypeName


@dataclass(kw_only=True)
class Procedure(Unit):
    params: list[Param]


@dataclass(kw_only=True)
class Program(Unit):
    """ΠΡΟΓΡΑΜΜΑ name ... ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ, plus the subprograms after it."""

    subprograms: list[Function | Procedure]


@dataclass(kw_only=True)
class Algorithm(Unit):
    """Αλγόριθμος name ... Τέλος name, in ψευδογλώσσα. Nothing is declared
    (`constants` and `variables` stay empty): a variable holds whatever value it
    was last given, and a name used with [...] is an array.

    The first algorithm in the editor is the one that runs: it reads its
    Δεδομένα as input and shows its Αποτελέσματα at the end. The algorithms after
    it are its `subprograms`, called with Κάλεσε or inside an expression.
    """

    data: list[Name]  # Δεδομένα // ... //
    results: list[Name]  # Αποτελέσματα // ... //
    subprograms: list["Algorithm"] = field(default_factory=list)
    # Filled by algorithm_checker: array name (key) → number of indices.
    arrays: dict[str, int] = field(default_factory=dict)

    @property
    def params(self) -> list[Name]:
        """What a caller passes, in order: the Δεδομένα, then the Αποτελέσματα
        that aren't also Δεδομένα (those return through their own argument)."""
        keys = {name.key for name in self.data}
        return self.data + [name for name in self.results if name.key not in keys]

    def is_result(self, key: str) -> bool:
        return any(name.key == key for name in self.results)
