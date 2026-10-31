import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.glossa import Language
from app.schemas.run import MAX_SOURCE_CHARS
from app.schemas.text import StoredText


class ProgramCreate(BaseModel):
    title: StoredText = Field(min_length=1, max_length=120)
    code: StoredText = Field(default="", max_length=MAX_SOURCE_CHARS)
    language: Language = "glossa"  # fixed once saved: the IDE opens it in that mode


class ProgramUpdate(BaseModel):
    title: StoredText | None = Field(default=None, min_length=1, max_length=120)
    code: StoredText | None = Field(default=None, max_length=MAX_SOURCE_CHARS)


class ProgramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    language: Language
    updated_at: datetime


class ProgramOut(ProgramSummary):
    code: str
    created_at: datetime
