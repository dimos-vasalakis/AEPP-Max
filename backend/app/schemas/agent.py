import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.agent.context import AgentMode
from app.core.plans import Effort
from app.glossa import Language
from app.schemas.run import MAX_SOURCE_CHARS


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID | None = None  # None starts a new conversation
    program_id: uuid.UUID | None = None  # the saved program being edited, if any
    message: str = Field(min_length=1, max_length=4_000)
    code: str = Field(max_length=MAX_SOURCE_CHARS)  # the editor's current content
    language: Language = "glossa"  # the editor's: Πρόγραμμα or Αλγόριθμος
    mode: AgentMode = "ask"
    approve: bool = False  # Agent mode: edits wait for the student's approval
    effort: Effort | None = None  # the student's /effort; None = the server's default


class AgentUsageOut(BaseModel):
    """Today's agent use against the daily limit (agent/usage.py)."""

    tokens: int
    messages: int
    limit: int  # tokens a day; 0 means no limit
    resets_at: datetime  # the next midnight, Athens time
