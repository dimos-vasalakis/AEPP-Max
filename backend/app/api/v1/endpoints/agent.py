from functools import partial
from typing import Annotated

from agents import ModelSettings, RunConfig
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openai.types.shared import Reasoning
from sentry_sdk import logger as sentry_logger
from sentry_sdk import metrics
from sqlalchemy import func, select

from app.agent.context import AgentContext
from app.agent.session import conversation_session
from app.agent.stream import stream_reply
from app.agent.usage import MESSAGE_TOKENS, read_usage, record_usage, reserve_message
from app.api.v1.endpoints.programs import owned_program
from app.core.config import get_settings, is_unset
from app.core.db import DbSession, has_migration
from app.core.plans import plan_for
from app.core.security import CurrentUserDep
from app.models import Conversation
from app.schemas.agent import AgentUsageOut, ChatRequest

router = APIRouter(prefix="/agent", tags=["agent"])


async def require_agent() -> None:
    if is_unset(get_settings().openai_api_key):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Agent is not configured")


# Dependencies run in parameter order: auth (401), then this (503), then the DB.
AgentReady = Annotated[None, Depends(require_agent)]


@router.get("/usage")
async def usage(user: CurrentUserDep, db: DbSession) -> AgentUsageOut:
    """Today's agent use and the daily limit, for the student's Ρυθμίσεις."""
    if not await has_migration(db, "0003"):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Agent needs migration 0003")
    tokens, messages, resets_at = await read_usage(db, user.id)
    limit = (await plan_for(db, user.id)).daily_tokens
    return AgentUsageOut(tokens=tokens, messages=messages, limit=limit, resets_at=resets_at)


@router.post("/chat")
async def chat(
    body: ChatRequest, user: CurrentUserDep, _: AgentReady, db: DbSession
) -> StreamingResponse:
    """Send a message to the agent; the reply streams back as SSE (app/agent/stream.py)."""
    # The daily limit's table (agent/usage.py); migrations don't run on deploy.
    if not await has_migration(db, "0003"):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Agent needs migration 0003")
    # The plan sets the limit, the model and how hard /effort may make it think.
    plan = await plan_for(db, user.id)
    if body.effort is not None and body.effort not in plan.efforts:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Effort not in your plan")
    limit = plan.daily_tokens
    reserved = MESSAGE_TOKENS if limit > 0 else 0
    # Committed with the conversation below; an error before that refunds it.
    if reserved and not await reserve_message(db, user.id, limit):
        # How often each plan's limit is hit, to tune AGENT_DAILY_TOKENS.
        metrics.count("agent.limit_reached", 1, attributes={"plan": plan.name})
        sentry_logger.info(
            "Daily agent limit reached on the {plan} plan",
            plan=plan.name,
            attributes={"user.id": str(user.id), "agent.daily_tokens": limit},
        )
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

    context = AgentContext(
        code=body.code, mode=body.mode, approve=body.approve, language=body.language
    )
    run_config = RunConfig(
        model=plan.model,
        # Over the agent's own (tutor.py): only what the student picked.
        model_settings=ModelSettings(reasoning=Reasoning(effort=body.effort))
        if body.effort
        else None,
        tracing_disabled=True,  # as main.py: students' messages never go to OpenAI's Traces
    )
    return StreamingResponse(
        stream_reply(
            conversation.id,
            body.message,
            context,
            conversation_session(conversation.id),
            on_usage=partial(record_usage, user.id, reserved),
            run_config=run_config,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
