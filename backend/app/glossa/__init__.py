"""ΓΛΩΣΣΑ interpreter: source text → tokens → AST → execution.

Pure Python, no I/O and no dependencies on the web app, so the /run endpoint,
the agent's tools and the tests all call the same `run()`. The language rules
it must follow are in docs/glossa.md.
"""

from app.glossa.errors import GlossaError
from app.glossa.interpreter import execute
from app.glossa.lexer import tokenize
from app.glossa.parser import parse
from app.glossa.result import ErrorInfo, RunLimits, RunResult, RunStatus, TraceStep

__all__ = [
    "ErrorInfo",
    "GlossaError",
    "RunLimits",
    "RunResult",
    "RunStatus",
    "TraceStep",
    "run",
]


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
    try:
        program = parse(tokenize(source))
    except GlossaError as exc:
        return RunResult(status="error", error=exc.info())
    return execute(program, inputs or [], limits=limits or RunLimits(), trace=trace)
