"""Turns an agent run into Server-Sent Events for the IDE.

Events (frontend/src/lib/api/agent.ts parses them):
  conversation {id}         first event, so the client can continue the thread
  text {delta}              streamed answer text
  tool {name}               the agent called a tool (shown as activity)
  edit {code, summary}      write_code's new program, written into the editor
  error {message}           the run failed; the stream ends
  done {}                   the run finished
"""

import contextlib
import json
import logging
import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import asdict

import anyio
from agents import RunConfig, Runner, RunResultStreaming, Usage
from agents.memory import Session
from openai.types.responses import ResponseTextDeltaEvent
from sentry_sdk import logger as sentry_logger
from sentry_sdk import metrics

from app.agent.context import AgentContext
from app.agent.tutor import get_agent
from app.agent.usage import Budget, OverBudget
from app.core.config import get_settings

logger = logging.getLogger("uvicorn.error")

USAGE_WRITE_SECONDS = 5

LIMIT_MESSAGE = (
    "Η απάντηση σταμάτησε εδώ: έφτασες το όριο του agent για σήμερα. "
    "Θα είναι ξανά διαθέσιμος από τα μεσάνυχτα."
)


def sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def report_reply(
    outcome: str, context: AgentContext, usage: Usage, run_config: RunConfig | None, started: float
) -> None:
    """A Sentry log and metrics per reply, to see what replies cost, how long they take
    and how they end. Counts and timings only: never the message, the code or the
    reply (/privacy)."""
    model = run_config.model if run_config is not None else None
    duration_ms = round((time.monotonic() - started) * 1000)
    # Few values each, so the metrics can be grouped by any of them.
    tags = {
        "outcome": outcome,
        "mode": context.mode,
        "gen_ai.request.model": model if isinstance(model, str) else "default",
    }
    metrics.count("agent.reply", 1, attributes=tags)
    metrics.distribution("agent.reply.duration", duration_ms, "millisecond", tags)
    metrics.distribution("agent.reply.input_tokens", usage.input_tokens, "none", tags)
    metrics.distribution("agent.reply.output_tokens", usage.output_tokens, "none", tags)
    sentry_logger.info(
        "Agent reply {outcome} in {mode} mode",
        outcome=outcome,
        mode=context.mode,
        attributes={
            "gen_ai.request.model": tags["gen_ai.request.model"],
            "gen_ai.usage.input_tokens": usage.input_tokens,
            "gen_ai.usage.output_tokens": usage.output_tokens,
            "gen_ai.usage.reasoning.output_tokens": usage.output_tokens_details.reasoning_tokens,
            "agent.model_requests": usage.requests,
            "agent.code_writes": context.writes,
            "agent.language": context.language,
            "agent.approve": context.approve,
            "duration_ms": duration_ms,
        },
    )


async def stream_reply(
    conversation_id: uuid.UUID,
    message: str,
    context: AgentContext,
    session: Session,
    on_usage: Callable[[Usage], Awaitable[None]] | None = None,
    run_config: RunConfig | None = None,
    budget: int | None = None,
) -> AsyncIterator[str]:
    """`budget`: the tokens left of the student's day (None: no limit). Once the reply
    has used them it stops before its next model call (agent/usage.py)."""
    started = time.monotonic()
    outcome = "cancelled"  # unless it gets to the end: the student left or pressed Esc
    result: RunResultStreaming | None = None
    # Everything inside the try, the first event too: the finally below must run however
    # the stream ends, since on_usage also frees the student's reply slot (agent/usage.py).
    try:
        yield sse("conversation", {"id": str(conversation_id)})
        result = Runner.run_streamed(
            get_agent(),
            message,
            context=context,
            session=session,
            max_turns=get_settings().agent_max_turns,
            run_config=run_config,
            hooks=Budget(budget) if budget is not None else None,
        )
        async for event in result.stream_events():
            if event.type == "raw_response_event" and isinstance(
                event.data, ResponseTextDeltaEvent
            ):
                yield sse("text", {"delta": event.data.delta})
            elif event.type == "run_item_stream_event":
                if event.name == "tool_called":
                    yield sse("tool", {"name": getattr(event.item.raw_item, "name", "")})
                elif event.name == "tool_output":
                    for edit in context.edits:
                        yield sse("edit", asdict(edit))
                    context.edits.clear()
        # Before the usage write below: the reply is over for the student.
        outcome = "done"
        yield sse("done", {})
    except OverBudget:
        outcome = "limit"
        yield sse("error", {"message": LIMIT_MESSAGE})
    except Exception:
        outcome = "error"
        # The 200 and the first events are already sent, so report it in-stream.
        logger.exception("Agent run failed (conversation %s)", conversation_id)
        yield sse("error", {"message": "Ο βοηθός αντιμετώπισε πρόβλημα. Δοκίμασε ξανά."})
    finally:
        usage = Usage() if result is None else result.context_wrapper.usage
        if result is not None:
            # Also runs when the client disconnects: stop paying for an unread answer.
            result.cancel()
            # Never in the way of the usage write below (an SDK upgrade renaming a field).
            with contextlib.suppress(Exception):
                report_reply(outcome, context, usage, run_config, started)
        if on_usage is not None:
            # Count what was spent, even on a disconnect: shielded, or the cancelled
            # request would cancel this write too. Bounded, so a stuck database
            # can't hold the stream open.
            with anyio.move_on_after(USAGE_WRITE_SECONDS, shield=True):
                await on_usage(usage)
