from functools import partial
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select

from app.agent.context import AgentContext
from app.agent.session import conversation_session
from app.agent.stream import stream_reply
from app.agent.usage import record_usage, tokens_today
from app.api.v1.endpoints.programs import owned_program
from app.core.config import get_settings, is_unset
from app.core.db import DbSession
from app.core.security import CurrentUserDep
from app.models import Conversation
from app.schemas.agent import ChatRequest

router = APIRouter(prefix="/agent", tags=["agent"])


async def require_agent() -> None:
    if is_unset(get_settings().openai_api_key):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Agent is not configured")


# Dependencies run in parameter order: auth (401), then this (503), then the DB.
AgentReady = Annotated[None, Depends(require_agent)]


@router.post("/chat")
async def chat(
    body: ChatRequest, user: CurrentUserDep, _: AgentReady, db: DbSession
) -> StreamingResponse:
    """Send a message to the agent; the reply streams back as SSE (app/agent/stream.py)."""
    limit = get_settings().agent_daily_tokens
    if limit and await tokens_today(db, user.id) >= limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Daily agent limit reached")
    if body.program_id is not None:
        await owned_program(db, user, body.program_id)

    if body.conversation_id is None:
        conversation = Conversation(
            user_id=user.id, program_id=body.program_id, title=body.message[:80]
        )
        db.add(conversation)
    else:
        conversation = await db.scalar(
            select(Conversation).where(
                Conversation.id == body.conversation_id, Conversation.user_id == user.id
            )
        )
        if conversation is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
        conversation.updated_at = func.now()
    await db.commit()

    context = AgentContext(code=body.code, mode=body.mode)
    return StreamingResponse(
        stream_reply(
            conversation.id,
            body.message,
            context,
            conversation_session(conversation.id),
            on_usage=partial(record_usage, user.id),
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
