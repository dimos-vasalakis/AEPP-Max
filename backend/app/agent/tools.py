import json
from dataclasses import asdict

from agents import Agent, RunContextWrapper, function_tool

from app import glossa
from app.agent.context import AgentContext, CodeEdit
from app.core.config import get_settings
from app.core.interpreter_pool import in_interpreter
from app.glossa.nodes import Program
from app.glossa.parser import PLURAL_OF
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
    data = asdict(result)
    # What only the IDE's Μεταβλητές and slow run need: the model would pay tokens for it, and the
    # trace already has every value.
    del data["frames"], data["units"]
    for step in data["trace"] or []:
        del step["depth"], step["call"], step["copied"], step["lines"]
    return json.dumps(data, ensure_ascii=False)


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
    return await in_interpreter(_run, source, inputs, False, ctx.context.language, queue=False)


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
    return await in_interpreter(_run, source, inputs, True, ctx.context.language, queue=False)


def _agent_mode(ctx: RunContextWrapper[AgentContext], _: Agent[AgentContext]) -> bool:
    return ctx.context.mode == "agent"


def _split_declarations(program: Program) -> str | None:
    """A type declared on more than one line of a unit (ΑΚΕΡΑΙΕΣ: i, j and then
    ΑΚΕΡΑΙΕΣ: Α[10]). ΓΛΩΣΣΑ allows it, but exam answers group each type on one line."""
    for unit in [program, *program.subprograms]:
        lines: dict[str, set[int]] = {}
        for var in unit.variables:
            lines.setdefault(var.type, set()).add(var.declared_on)
        for type_name, where in lines.items():
            if len(where) > 1:
                plural = PLURAL_OF[type_name]
                numbers = ", ".join(str(line) for line in sorted(where))
                return (
                    f"Not written: {unit.name} declares {plural} on lines {numbers}. Declare each"
                    f" type once, all its variables and arrays on one line ({plural}: i, j,"
                    " Α[10]), then call write_code again. Only if the student's own message"
                    " asked for this layout, call it with split_declarations=true instead."
                )
    return None


def _allows_splits(context: AgentContext, asked: bool) -> bool:
    """Split declarations are written when the student asked, or splits their own."""
    return asked or context.student_splits


def _review(code: str, language: glossa.Language, allow_splits: bool = False) -> str | None:
    """Why write_code refuses this code (it doesn't compile, or its declarations
    would lose marks), or None. `allow_splits`: the student splits their own
    declarations, or asked for that. CPU-bound, like the runs above."""
    compiled = glossa.compile_source(code, language)
    if isinstance(compiled, glossa.ErrorInfo):
        where = f" (line {compiled.line})" if compiled.line else ""
        return (
            f"Not written, it doesn't compile{where}: {compiled.message}"
            " Fix it and call write_code again."
        )
    if not isinstance(compiled, Program) or allow_splits:
        return None
    return _split_declarations(compiled)


def _write(context: AgentContext, code: str, summary: str, refusal: str | None) -> str:
    """write_code's work, after its guardrails: nothing reaches the student's
    editor that is empty, too long, doesn't compile or splits its declarations
    (`refusal`, from _review). A refusal goes back to the model, so it can fix the
    code and try again."""
    if not code.strip():
        return "Not written: the code is empty. Send the complete program."
    if len(code) > MAX_SOURCE_CHARS:
        return f"Not written: the code is over {MAX_SOURCE_CHARS} characters."
    if context.writes >= MAX_EDITS_PER_REPLY:
        return (
            f"Not written: at most {MAX_EDITS_PER_REPLY} edits per reply. Stop editing and"
            " tell the student what you changed."
        )
    if refusal is not None:
        return refusal
    context.writes += 1
    context.edits.append(CodeEdit(code=code, summary=summary.strip()[:MAX_SUMMARY_CHARS]))
    # Later tool calls without `code` now run what the editor holds.
    context.code = code
    if context.approve:
        return "Η αλλαγή προτάθηκε· μπαίνει στον editor μόνο αν την εγκρίνει ο μαθητής."
    return "Ο κώδικας γράφτηκε στον editor του μαθητή."


@function_tool(is_enabled=_agent_mode)
async def write_code(
    ctx: RunContextWrapper[AgentContext], code: str, summary: str, split_declarations: bool = False
) -> str:
    """Replace the student's code in the editor with a new version. It is refused if
    it doesn't compile; then fix the error and call it again.

    Args:
        code: The complete new program (or algorithm), not a fragment, with `!` comments in Greek.
        summary: One sentence in Greek on what changes.
        split_declarations: True only if the student asked for a type declared on more than
            one line; exam answers declare each type once.
    """
    # The parser runs in a thread; the context changes back on the loop.
    refusal = None
    if code.strip() and len(code) <= MAX_SOURCE_CHARS:
        allow = _allows_splits(ctx.context, split_declarations)
        refusal = await in_interpreter(_review, code, ctx.context.language, allow, queue=False)
    return _write(ctx.context, code, summary, refusal)


TOOLS = [run_program, trace_program, write_code]
