import re
from dataclasses import dataclass, field
from typing import Literal

from app.glossa import Language
from app.glossa.lexer import normalize
from app.glossa.parser import DECLARATION_TYPES

# Where a unit starts, and a declaration line: a type word, then `:`.
_UNIT_START = re.compile(r"\s*(ΠΡΟΓΡΑΜΜΑ|ΣΥΝΑΡΤΗΣΗ|ΔΙΑΔΙΚΑΣΙΑ)\b")
_TYPE_LINE = re.compile(rf"\s*({'|'.join(DECLARATION_TYPES)})\s*:")


def splits_declarations(code: str) -> bool:
    """Whether a unit declares a type on two lines (ΑΚΕΡΑΙΕΣ: i, j and then
    ΑΚΕΡΑΙΕΣ: Α[10]). A line scan, not the parser, so code with a syntax error
    still counts."""
    seen: set[str] = set()
    for line in code.splitlines():
        key = normalize(line)
        if _UNIT_START.match(key):
            seen = set()
        elif match := _TYPE_LINE.match(key):
            if match.group(1) in seen:
                return True
            seen.add(match.group(1))
    return False


# ask: tutor that explains and gives hints, never edits the editor.
# agent: may also write the student's program into the editor (write_code).
AgentMode = Literal["ask", "agent"]


@dataclass
class CodeEdit:
    code: str  # the whole new program
    summary: str


@dataclass
class AgentContext:
    """Per-request state. Tools read the editor from it and queue edits on it;
    it's never sent to the model."""

    code: str
    mode: AgentMode
    # glossa: a ΓΛΩΣΣΑ program; pseudocode: a ψευδογλώσσα algorithm (the editor's Αλγόριθμος).
    language: Language = "glossa"
    # Agent mode only: the student approves each edit (Ctrl+Enter) before it reaches the editor.
    approve: bool = False
    edits: list[CodeEdit] = field(default_factory=list)
    writes: int = 0  # write_code calls accepted in this reply (tools.MAX_EDITS_PER_REPLY)
    # The student splits a type's declarations themselves, a style write_code keeps. Read
    # once, from the code sent with the request, before an edit replaces it.
    student_splits: bool = field(init=False)

    def __post_init__(self) -> None:
        self.student_splits = splits_declarations(self.code)
