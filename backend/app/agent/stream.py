"""Turns an agent run into Server-Sent Events for the IDE.

Events (frontend/src/lib/api/agent.ts parses them):
  conversation {id}         first event, so the client can continue the thread
  text {delta}              streamed answer text
  tool {name}               the agent called a tool (shown as activity)
  edit {code, summary}      write_code's new program, written into the editor
  error {message}           the run failed; the stream ends
  done {}                   the run finished
"""

import json
import logging
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import asdict

import anyio
from agents import Runner, Usage
from agents.memory import Session
from openai.types.responses import ResponseTextDeltaEvent

from app.agent.context import AgentContext
from app.agent.tutor import get_agent
from app.core.config import get_settings

logger = logging.getLogger("uvicorn.error")


def sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def stream_reply(
    conversation_id: uuid.UUID,
    message: str,
    context: AgentContext,
    session: Session,
    on_usage: Callable[[Usage], Awaitable[None]] | None = None,
) -> AsyncIterator[str]:
    yield sse("conversation", {"id": str(conversation_id)})
    result = Runner.run_streamed(
        get_agent(),
        message,
        context=context,
        session=session,
        max_turns=get_settings().agent_max_turns,
    )
    try:
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
    except Exception:
        # The 200 and the first events are already sent, so report it in-stream.
        logger.exception("Agent run failed (conversation %s)", conversation_id)
        yield sse("error", {"message": "Ο βοηθός αντιμετώπισε πρόβλημα. Δοκίμασε ξανά."})
        return
    finally:
        # Also runs when the client disconnects: stop paying for an unread answer.
        result.cancel()
        if on_usage is not None:
            # Count what was spent, even on a disconnect. Shielded: the cancelled
            # request would otherwise cancel this write too.
            with anyio.CancelScope(shield=True):
                await on_usage(result.context_wrapper.usage)
    yield sse("done", {})
