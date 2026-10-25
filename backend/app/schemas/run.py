from pydantic import BaseModel, Field

MAX_SOURCE_CHARS = 50_000


class RunRequest(BaseModel):
    code: str = Field(max_length=MAX_SOURCE_CHARS)
    inputs: list[str] = Field(default_factory=list, max_length=1_000)
    trace: bool = False
