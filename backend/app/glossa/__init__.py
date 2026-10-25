"""ΓΛΩΣΣΑ interpreter: source text → tokens → AST (+ static checks) → execution.

Pure Python, no I/O and no dependencies on the web app, so the /run and /check
endpoints, the agent's tools and the tests all share this code. The language
rules it must follow are in docs/glossa.md.
"""

from app.glossa.errors import GlossaError
from app.glossa.interpreter import execute
from app.glossa.lexer import tokenize
from app.glossa.nodes import Program
from app.glossa.parser import parse
from app.glossa.result import ErrorInfo, RunLimits, RunResult, RunStatus, TraceStep

__all__ = [
    "ErrorInfo",
    "GlossaError",
    "RunLimits",
    "RunResult",
    "RunStatus",
    "TraceStep",
    "check",
    "run",
]

_TOO_DEEP = ErrorInfo(
    kind="syntax", message="Το πρόγραμμα έχει υπερβολικά πολλά φωλιασμένα επίπεδα."
)


def _compile(source: str) -> Program | ErrorInfo:
    try:
        return parse(tokenize(source))
    except GlossaError as exc:
        return exc.info()
    except RecursionError:
        return _TOO_DEEP


def check(source: str) -> ErrorInfo | None:
    """The first syntax or static error in the program, without running it."""
    compiled = _compile(source)
    return compiled if isinstance(compiled, ErrorInfo) else None


def run(
    source: str,
    inputs: list[str] | None = None,
    *,
    limits: RunLimits | None = None,
    trace: bool = False,
) -> RunResult:
    """Run a ΓΛΩΣΣΑ program. `inputs` feed ΔΙΑΒΑΣΕ in order.

    Never raises for mistakes in the student's program: syntax and runtime
    errors come back as status "error" with a Greek message and line number.
    CPU-bound, so async callers must use asyncio.to_thread.
    """
    compiled = _compile(source)
    if isinstance(compiled, ErrorInfo):
        return RunResult(status="error", error=compiled)
    return execute(compiled, inputs or [], limits=limits or RunLimits(), trace=trace)
