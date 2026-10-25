from dataclasses import dataclass, field
from typing import Literal

# ask: tutor that explains and gives hints, never edits the editor.
# agent: may also propose edits to the student's program (Cursor-style diff).
AgentMode = Literal["ask", "agent"]


@dataclass
class ProposedEdit:
    code: str  # the whole new program
    summary: str


@dataclass
class AgentContext:
    """Per-request state. Tools read the editor from it and queue edit
    proposals on it; it's never sent to the model."""

    code: str
    mode: AgentMode
    proposed_edits: list[ProposedEdit] = field(default_factory=list)
