"""What a run returns. These dataclasses are the API's response shape too
(frontend/src/lib/glossa/types.ts mirrors them), so change both together."""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Literal

ErrorKind = Literal["syntax", "runtime"]

# ok: reached ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ.
# error: syntax or runtime error (see `error`).
# needs_input: ΔΙΑΒΑΣΕ ran out of inputs. The client asks the student for a
#   value and runs again with it appended (programs are deterministic).
# limit: a bound was hit, usually an infinite loop (see `limit`).
RunStatus = Literal["ok", "error", "needs_input", "limit"]
# Which bound: the RunLimits' steps, time or output, or MAX_INPUTS.
LimitReason = Literal["steps", "time", "output", "inputs"]

# ΔΙΑΒΑΣΕ values in one run, typed or made up: each is re-sent with the next, and /run takes
# no more (schemas/run.py). The read past them ends the run, so the client never sends a 1001st.
MAX_INPUTS = 1_000


@dataclass(frozen=True)
class RunLimits:
    max_steps: int = 200_000
    max_output_lines: int = 2_000
    max_trace_steps: int = 5_000
    # Characters, so a long string printed in a loop can't fill the server's memory.
    max_output_chars: int = 200_000
    max_trace_chars: int = 1_000_000  # the trace's values and output; then it stops, truncated
    timeout_seconds: float = 10.0  # as core/config.py's run_timeout_seconds
    # Asked with the clock: true once nobody waits for the result (endpoints/run.py).
    stop: Callable[[], bool] | None = None


@dataclass
class ErrorInfo:
    kind: ErrorKind
    message: str
    line: int | None = None
    # 1-based columns of the offending token on `line`; end is exclusive.
    column: int | None = None
    end_column: int | None = None


@dataclass
class TraceStep:
    """One executed statement, for step-by-step mode and the πίνακας τιμών."""

    line: int
    scope: str  # program, procedure or function name
    changes: dict[str, str] = field(default_factory=dict)  # name (or Π[2,3]) → new value
    output: list[str] = field(default_factory=list)  # lines ΓΡΑΨΕ wrote at this step
    # With output: how many lines the screen had after this step (its last one may still
    # be open, a ΓΡΑΨΕ ending in a space), so the IDE's slow run can show the screen at
    # any step: `output`'s text continues the line or starts new ones. 0 without output.
    lines: int = 0
    condition: bool | None = None  # value of the condition, for ΑΝ/ΟΣΟ/ΜΕΧΡΙΣ_ΟΤΟΥ/ΓΙΑ
    # Where the step ran, for Μεταβλητές step by step: how deep in calls (0: the
    # program), and which call (0: the program, then numbered as calls start).
    depth: int = 0
    call: int = 0
    # A call's first row: each array parameter → the caller's array it is a copy of, so
    # Μεταβλητές can show its elements (the changes leave arrays out: too many cells).
    copied: dict[str, str] = field(default_factory=dict)


@dataclass
class Variable:
    """A variable as Μεταβλητές shows it."""

    name: str  # the declared spelling
    type: str | None = None  # ΑΚΕΡΑΙΑ, …; None in ψευδογλώσσα, where nothing is declared
    value: str | None = None  # as ΓΡΑΨΕ shows it; None while it has none, and for arrays
    dims: list[int] | None = None  # an array's sizes; [] for a ψευδογλώσσα array (no size)
    # An array's elements that have a value, labelled as the trace does: "Π[2, 3]" → value.
    cells: dict[str, str] | None = None
    cells_truncated: bool = False  # too many to send: only the first ones are in `cells`


@dataclass
class Frame:
    """A program unit's variables: one running call of it, or (RunResult.units) its declarations."""

    scope: str  # the unit's name, as TraceStep.scope
    title: str  # "ΠΡΟΓΡΑΜΜΑ Πρόσθεση", "ΣΥΝΑΡΤΗΣΗ Μέσος", "Αλγόριθμος Χ"
    variables: list[Variable] = field(default_factory=list)


@dataclass
class AutoInput:
    """A value Αυτόματες τιμές gave a ΔΙΑΒΑΣΕ."""

    value: str
    output: int  # how many output lines existed when it was read
    step: int  # traced runs: the trace step of its ΔΙΑΒΑΣΕ (a played run shows it from there)


@dataclass
class RunResult:
    status: RunStatus
    output: list[str] = field(default_factory=list)
    error: ErrorInfo | None = None
    trace: list[TraceStep] | None = None  # only when requested
    trace_truncated: bool = False
    steps: int = 0
    input_line: int | None = None  # needs_input: the line of the ΔΙΑΒΑΣΕ waiting for a value
    limit: LimitReason | None = None  # status "limit": which bound
    # The calls running when it stopped, the program first, with their variables' values.
    frames: list[Frame] = field(default_factory=list)
    # Traced runs only: each unit that ran, with its declared variables (no values), so
    # Μεταβλητές can list them all at any step.
    units: list[Frame] = field(default_factory=list)
    # autofill=True: the values it gave, in order, after the `inputs` it was given.
    auto_inputs: list[AutoInput] = field(default_factory=list)
