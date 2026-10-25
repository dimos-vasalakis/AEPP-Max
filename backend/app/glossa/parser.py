from app.glossa.lexer import Token
from app.glossa.nodes import Program


def parse(tokens: list[Token]) -> Program:
    """Build the AST (recursive descent) and run the static checks.

    Static checks belong here, not at runtime, so they are reported even in code
    that never runs: undeclared or doubly declared names, assigning to a
    constant, calling an undefined subprogram, wrong argument count, a function
    that never assigns its own name. Raise GlossaError(kind="syntax").
    """
    raise NotImplementedError("ΓΛΩΣΣΑ parser")
