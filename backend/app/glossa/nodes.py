"""AST node types. Every node carries the source line it came from, so runtime
errors and trace steps can point at it.

Only the root is defined so far; add statement/expression nodes with the parser.
"""

from dataclasses import dataclass, field


@dataclass
class Node:
    line: int


@dataclass
class Program(Node):
    """ΠΡΟΓΡΑΜΜΑ name ... ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ, plus the subprograms after it."""

    name: str
    constants: list[Node] = field(default_factory=list)
    variables: list[Node] = field(default_factory=list)
    body: list[Node] = field(default_factory=list)
    subprograms: list[Node] = field(default_factory=list)
