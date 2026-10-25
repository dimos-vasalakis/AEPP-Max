import asyncio

from fastapi import APIRouter

from app import glossa
from app.core.config import get_settings
from app.schemas.run import CheckRequest, CheckResult, RunRequest

router = APIRouter(tags=["run"])


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
    return await asyncio.to_thread(
        glossa.run,
        body.code,
        body.inputs,
        language=body.language,
        limits=limits,
        trace=body.trace,
    )


@router.post("/check", response_model=CheckResult)
async def check_program(body: CheckRequest) -> CheckResult:
    """The first syntax/static error, for the editor's live error marking (no AI)."""
    return CheckResult(error=await asyncio.to_thread(glossa.check, body.code, body.language))
