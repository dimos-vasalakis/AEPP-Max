"""ΓΛΩΣΣΑ interpreter: source text → tokens → AST (+ static checks) → execution.

Pure Python, no I/O and no dependencies on the web app, so the /run and /check
endpoints, the agent's tools and the tests all share this code. The language
rules it must follow are in docs/glossa.md.
"""

from app.glossa.algorithm_interpreter import execute_algorithms
from app.glossa.algorithm_parser import parse_algorithms
from app.glossa.errors import GlossaError
from app.glossa.interpreter import execute
from app.glossa.lexer import Language, tokenize
from app.glossa.nodes import Algorithm, Program
from app.glossa.parser import parse
from app.glossa.result import ErrorInfo, RunLimits, RunResult, RunStatus, TraceStep

__all__ = [
    "ErrorInfo",
    "GlossaError",
    "Language",
    "RunLimits",
    "RunResult",
    "RunStatus",
    "TraceStep",
    "check",
    "compile_source",
    "run",
]

_TOO_DEEP = ErrorInfo(
    kind="syntax", message="Το πρόγραμμα έχει υπερβολικά πολλά φωλιασμένα επίπεδα."
)


def compile_source(source: str, language: Language = "glossa") -> Program | Algorithm | ErrorInfo:
    """The checked AST, or the first syntax or static error."""
    try:
        tokens = tokenize(source, language)
        return parse(tokens) if language == "glossa" else parse_algorithms(tokens)
    except GlossaError as exc:
        return exc.info()
    except RecursionError:
        return _TOO_DEEP


def check(source: str, language: Language = "glossa") -> ErrorInfo | None:
    """The first syntax or static error in the program, without running it."""
    compiled = compile_source(source, language)
    return compiled if isinstance(compiled, ErrorInfo) else None


def run(
    source: str,
    inputs: list[str] | None = None,
    *,
    language: Language = "glossa",
    limits: RunLimits | None = None,
    trace: bool = False,
) -> RunResult:
    """Run a ΓΛΩΣΣΑ program, or a ψευδογλώσσα algorithm with language="pseudocode".
    `inputs` feed ΔΙΑΒΑΣΕ (and an algorithm's Δεδομένα) in order.

    Never raises for mistakes in the student's program: syntax and runtime
    errors come back as status "error" with a Greek message and line number.
    CPU-bound, so async callers must use asyncio.to_thread.
    """
    compiled = compile_source(source, language)
    if isinstance(compiled, ErrorInfo):
        return RunResult(status="error", error=compiled)
    run_with = execute_algorithms if isinstance(compiled, Algorithm) else execute
    return run_with(compiled, inputs or [], limits=limits or RunLimits(), trace=trace)  # type: ignore[arg-type]
