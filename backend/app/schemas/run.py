from pydantic import BaseModel, Field

from app.glossa import ErrorInfo, Language

MAX_SOURCE_CHARS = 50_000


class RunRequest(BaseModel):
    code: str = Field(max_length=MAX_SOURCE_CHARS)
    inputs: list[str] = Field(default_factory=list, max_length=1_000)
    trace: bool = False
    language: Language = "glossa"  # "pseudocode": the editor is on Αλγόριθμος


class CheckRequest(BaseModel):
    code: str = Field(max_length=MAX_SOURCE_CHARS)
    language: Language = "glossa"


class CheckResult(BaseModel):
    error: ErrorInfo | None  # the first error; None when the program is valid
