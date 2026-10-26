import asyncio
import json
from dataclasses import asdict

from agents import Agent, RunContextWrapper, function_tool

from app import glossa
from app.agent.context import AgentContext, CodeEdit
from app.core.config import get_settings
from app.schemas.run import MAX_SOURCE_CHARS

# The model reads tool output as text; this many trace steps is plenty to
# answer a πίνακας τιμών question without flooding the context.
AGENT_TRACE_STEPS = 300
# The same for characters: a run's output and trace go into the model's context.
AGENT_OUTPUT_CHARS = 20_000

# write_code's guardrails: a few edits per reply, a one-line summary.
MAX_EDITS_PER_REPLY = 3
MAX_SUMMARY_CHARS = 300


def _run(code: str, inputs: list[str], trace: bool, language: glossa.Language) -> str:
    settings = get_settings()
    limits = glossa.RunLimits(
        max_steps=settings.run_max_steps,
        max_output_lines=settings.run_max_output_lines,
        max_trace_steps=AGENT_TRACE_STEPS,
        max_output_chars=AGENT_OUTPUT_CHARS,
        max_trace_chars=AGENT_OUTPUT_CHARS,
        timeout_seconds=settings.run_timeout_seconds,
    )
    result = glossa.run(code, inputs, language=language, limits=limits, trace=trace)
    return json.dumps(asdict(result), ensure_ascii=False)


@function_tool
async def run_program(
    ctx: RunContextWrapper[AgentContext], inputs: list[str], code: str | None = None
) -> str:
    """Run code on the interpreter and return its status, output and error. It runs
    ΓΛΩΣΣΑ or ψευδογλώσσα, whichever the student's editor is set to.

    Args:
        inputs: Values for ΔΙΑΒΑΣΕ (and an algorithm's Δεδομένα), in the order read, one per value.
        code: The complete program or algorithm to run. Omit it to run the student's editor.
    """
    source = ctx.context.code if code is None else code
    return await asyncio.to_thread(_run, source, inputs, False, ctx.context.language)


@function_tool
async def trace_program(
    ctx: RunContextWrapper[AgentContext], inputs: list[str], code: str | None = None
) -> str:
    """Run code and return every executed line with the variables it changed. It runs
    ΓΛΩΣΣΑ or ψευδογλώσσα, whichever the student's editor is set to. Two kinds of row
    are not statements running again: a call adds one on the subprogram's first line with
    what its parameters were given, and one back on the calling line, after the
    subprogram's rows, with what the call changed there (values returned, a condition).

    Args:
        inputs: Values for ΔΙΑΒΑΣΕ (and an algorithm's Δεδομένα), in the order read, one per value.
        code: The complete program or algorithm to run. Omit it to trace the student's editor.
    """
    source = ctx.context.code if code is None else code
    return await asyncio.to_thread(_run, source, inputs, True, ctx.context.language)


def _agent_mode(ctx: RunContextWrapper[AgentContext], _: Agent[AgentContext]) -> bool:
    return ctx.context.mode == "agent"


def _write(context: AgentContext, code: str, summary: str, error: glossa.ErrorInfo | None) -> str:
    """write_code's work, after its guardrails: nothing reaches the student's
    editor that is empty, too long or doesn't compile (`error`, from glossa.check).
    A refusal goes back to the model, so it can fix the code and try again."""
    if not code.strip():
        return "Not written: the code is empty. Send the complete program."
    if len(code) > MAX_SOURCE_CHARS:
        return f"Not written: the code is over {MAX_SOURCE_CHARS} characters."
    if context.writes >= MAX_EDITS_PER_REPLY:
        return (
            f"Not written: at most {MAX_EDITS_PER_REPLY} edits per reply. Stop editing and"
            " tell the student what you changed."
        )
    if error is not None:
        where = f" (line {error.line})" if error.line else ""
        return (
            f"Not written, it doesn't compile{where}: {error.message}"
            " Fix it and call write_code again."
        )
    context.writes += 1
    context.edits.append(CodeEdit(code=code, summary=summary.strip()[:MAX_SUMMARY_CHARS]))
    # Later tool calls without `code` now run what the editor holds.
    context.code = code
    if context.approve:
        return "Η αλλαγή προτάθηκε· μπαίνει στον editor μόνο αν την εγκρίνει ο μαθητής."
    return "Ο κώδικας γράφτηκε στον editor του μαθητή."


@function_tool(is_enabled=_agent_mode)
async def write_code(ctx: RunContextWrapper[AgentContext], code: str, summary: str) -> str:
    """Replace the student's code in the editor with a new version. It is refused if
    it doesn't compile; then fix the error and call it again.

    Args:
        code: The complete new program (or algorithm), not a fragment, with `!` comments in Greek.
        summary: One sentence in Greek on what changes.
    """
    # The parser is CPU-bound, like the runs above; the context changes back on the loop.
    error = None
    if code.strip() and len(code) <= MAX_SOURCE_CHARS:
        error = await asyncio.to_thread(glossa.check, code, ctx.context.language)
    return _write(ctx.context, code, summary, error)


TOOLS = [run_program, trace_program, write_code]
