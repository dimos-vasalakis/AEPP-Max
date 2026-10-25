import uuid

from pydantic import BaseModel, Field

from app.agent.context import AgentMode
from app.schemas.run import MAX_SOURCE_CHARS


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID | None = None  # None starts a new conversation
    program_id: uuid.UUID | None = None  # the saved program being edited, if any
    message: str = Field(min_length=1, max_length=4_000)
    code: str = Field(max_length=MAX_SOURCE_CHARS)  # the editor's current content
    mode: AgentMode = "ask"
    approve: bool = False  # Agent mode: edits wait for the student's approval
