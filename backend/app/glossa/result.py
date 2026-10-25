"""What a run returns. These dataclasses are the API's response shape too
(frontend/src/lib/glossa/types.ts mirrors them), so change both together."""

from dataclasses import dataclass, field
from typing import Literal

ErrorKind = Literal["syntax", "runtime"]

# ok: reached ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ.
# error: syntax or runtime error (see `error`).
# needs_input: ΔΙΑΒΑΣΕ ran out of inputs. The client asks the student for a
#   value and runs again with it appended (programs are deterministic).
# limit: a RunLimits bound was hit, usually an infinite loop.
RunStatus = Literal["ok", "error", "needs_input", "limit"]


@dataclass(frozen=True)
class RunLimits:
    max_steps: int = 200_000
    max_output_lines: int = 2_000
    max_trace_steps: int = 5_000
    timeout_seconds: float = 3.0


@dataclass
class ErrorInfo:
    kind: ErrorKind
    message: str
    line: int | None = None


@dataclass
class TraceStep:
    """One executed statement, for step-by-step mode and the πίνακας τιμών."""

    line: int
    scope: str  # program, procedure or function name
    changes: dict[str, str] = field(default_factory=dict)  # name (or Π[2,3]) → new value
    output: list[str] = field(default_factory=list)  # lines ΓΡΑΨΕ wrote at this step
    condition: bool | None = None  # value of the condition, for ΑΝ/ΟΣΟ/ΜΕΧΡΙΣ_ΟΤΟΥ/ΓΙΑ


@dataclass
class RunResult:
    status: RunStatus
    output: list[str] = field(default_factory=list)
    error: ErrorInfo | None = None
    trace: list[TraceStep] | None = None  # only when requested
    trace_truncated: bool = False
    steps: int = 0
