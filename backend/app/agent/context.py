from dataclasses import dataclass, field
from typing import Literal

from app.glossa import Language

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
