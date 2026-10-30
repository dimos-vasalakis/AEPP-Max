import time

from fastapi import APIRouter, HTTPException
from sentry_sdk import metrics

from app import glossa
from app.core.config import get_settings
from app.core.interpreter_pool import in_interpreter
from app.schemas.run import CheckRequest, CheckResult, RunRequest

router = APIRouter(tags=["run"])


def timed_run(body: RunRequest, limits: glossa.RunLimits) -> tuple[glossa.RunResult, float]:
    """The run and its milliseconds, timed in the worker: not the wait for a thread."""
    started = time.monotonic()
    result = glossa.run(
        body.code, body.inputs, language=body.language, limits=limits, trace=body.trace
    )
    return result, (time.monotonic() - started) * 1000


@router.post("/run", response_model=glossa.RunResult)
async def run_program(body: RunRequest) -> glossa.RunResult:
    """Run a program. No account needed; only the agent costs money."""
    settings = get_settings()
    limits = glossa.RunLimits(
        max_steps=settings.run_max_steps,
        max_output_lines=settings.run_max_output_lines,
        max_trace_steps=settings.run_max_trace_steps,
        timeout_seconds=settings.run_timeout_seconds,
    )
    try:
        result, elapsed = await in_interpreter(timed_run, body, limits)
    except HTTPException:
        raise  # the interpreter is busy (core/interpreter_pool.py): not a crash
    except Exception:
        # An interpreter bug: the 500 reaches Sentry as an error too.
        metrics.count("glossa.run", 1, attributes={"status": "crash", "language": body.language})
        raise
    # How runs end (ok, error, needs_input, limit) and how long the interpreter takes,
    # to tune RunLimits and see whether students hit them. Per request: each value a
    # ΔΙΑΒΑΣΕ asks for re-runs the program, so needs_input counts those re-runs.
    tags = {"status": result.status, "language": body.language, "trace": body.trace}
    metrics.count("glossa.run", 1, attributes=tags)
    metrics.distribution("glossa.run.duration", elapsed, "millisecond", tags)
    return result


@router.post("/check", response_model=CheckResult)
async def check_program(body: CheckRequest) -> CheckResult:
    """The first syntax/static error, for the editor's live error marking (no AI)."""
    return CheckResult(error=await in_interpreter(glossa.check, body.code, body.language))
