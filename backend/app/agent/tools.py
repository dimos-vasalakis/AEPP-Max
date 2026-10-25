import asyncio
import json
from dataclasses import asdict

from agents import Agent, RunContextWrapper, function_tool

from app import glossa
from app.agent.context import AgentContext, ProposedEdit
from app.core.config import get_settings

# The model reads tool output as text; this many trace steps is plenty to
# answer a πίνακας τιμών question without flooding the context.
AGENT_TRACE_STEPS = 300


def _run(code: str, inputs: list[str], trace: bool) -> str:
    settings = get_settings()
    limits = glossa.RunLimits(
        max_steps=settings.run_max_steps,
        max_output_lines=settings.run_max_output_lines,
        max_trace_steps=AGENT_TRACE_STEPS,
        timeout_seconds=settings.run_timeout_seconds,
    )
    try:
        result = glossa.run(code, inputs, limits=limits, trace=trace)
    except NotImplementedError:
        return json.dumps(
            {"status": "unavailable", "message": "Ο διερμηνευτής δεν είναι έτοιμος."},
            ensure_ascii=False,
        )
    return json.dumps(asdict(result), ensure_ascii=False)


@function_tool
async def run_program(
    ctx: RunContextWrapper[AgentContext], inputs: list[str], code: str | None = None
) -> str:
    """Run a ΓΛΩΣΣΑ program on the interpreter and return its status, output and error.

    Args:
        inputs: Values for ΔΙΑΒΑΣΕ, in the order the program reads them, one per value.
        code: The complete program to run. Omit it to run the student's editor.
    """
    source = ctx.context.code if code is None else code
    return await asyncio.to_thread(_run, source, inputs, False)


@function_tool
async def trace_program(
    ctx: RunContextWrapper[AgentContext], inputs: list[str], code: str | None = None
) -> str:
    """Run a ΓΛΩΣΣΑ program and return every executed line with the variables it changed.

    Args:
        inputs: Values for ΔΙΑΒΑΣΕ, in the order the program reads them, one per value.
        code: The complete program to run. Omit it to trace the student's editor.
    """
    source = ctx.context.code if code is None else code
    return await asyncio.to_thread(_run, source, inputs, True)


def _agent_mode(ctx: RunContextWrapper[AgentContext], _: Agent[AgentContext]) -> bool:
    return ctx.context.mode == "agent"


@function_tool(is_enabled=_agent_mode)
def propose_edit(ctx: RunContextWrapper[AgentContext], code: str, summary: str) -> str:
    """Propose a new version of the student's program. They see a diff and accept or reject it.

    Args:
        code: The complete new program, not a fragment.
        summary: One sentence in Greek on what changes.
    """
    ctx.context.proposed_edits.append(ProposedEdit(code=code, summary=summary))
    return "Ο μαθητής βλέπει την πρόταση. Δεν ξέρεις ακόμα αν θα την αποδεχτεί."


TOOLS = [run_program, trace_program, propose_edit]
