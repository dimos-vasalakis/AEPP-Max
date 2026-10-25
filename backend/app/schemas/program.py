import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.run import MAX_SOURCE_CHARS


class ProgramCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    code: str = Field(default="", max_length=MAX_SOURCE_CHARS)


class ProgramUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    code: str | None = Field(default=None, max_length=MAX_SOURCE_CHARS)


class ProgramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    updated_at: datetime


class ProgramOut(ProgramSummary):
    code: str
    created_at: datetime
