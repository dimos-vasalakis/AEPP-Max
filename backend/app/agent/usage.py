"""The agent's daily token limit, per student.

Every message is charged MESSAGE_TOKENS up front, in the same statement that
checks the limit, so parallel requests can't all slip past one stale total, and
a reply stopped before the model finishes still costs something (the SDK only
counts a response once it completes). After the run, what it used beyond that
(input + output, as the SDK counts them) is added. Days are Athens time.
A student can still go over: by what the replies already admitted use beyond
their up-front charge.
"""

import logging
import uuid

from agents import Usage
from sqlalchemy import Date, cast, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from app.models import AgentUsage

logger = logging.getLogger("uvicorn.error")

# Greek students' day: the limit resets at midnight in Greece, not UTC.
TODAY = cast(func.timezone("Europe/Athens", func.now()), Date)

# Charged for every message before it runs; about what a short reply costs.
MESSAGE_TOKENS = 1_000


async def reserve_message(db: AsyncSession, user_id: uuid.UUID, limit: int) -> bool:
    """Charge a message up front if today's total is still under `limit`.
    Atomic: the upsert locks the row, so concurrent messages see each other's
    charges. The caller's commit makes it count."""
    stmt = insert(AgentUsage).values(user_id=user_id, day=TODAY, tokens=MESSAGE_TOKENS, messages=1)
    stmt = stmt.on_conflict_do_update(
        index_elements=[AgentUsage.user_id, AgentUsage.day],
        set_={
            "tokens": AgentUsage.tokens + MESSAGE_TOKENS,
            "messages": AgentUsage.messages + 1,
        },
        where=AgentUsage.tokens < limit,
    ).returning(AgentUsage.tokens)
    return (await db.execute(stmt)).first() is not None


async def record_usage(user_id: uuid.UUID, reserved: int, usage: Usage) -> None:
    """Add what a run used beyond its up-front charge. Runs after the reply, in its
    own session (the request's is gone by then); a failure is logged, not raised."""
    extra = usage.input_tokens + usage.output_tokens - reserved
    if extra <= 0:
        return
    stmt = insert(AgentUsage).values(user_id=user_id, day=TODAY, tokens=extra)
    stmt = stmt.on_conflict_do_update(
        index_elements=[AgentUsage.user_id, AgentUsage.day],
        set_={"tokens": AgentUsage.tokens + stmt.excluded.tokens},
    )
    try:
        async with get_sessionmaker()() as db:
            await db.execute(stmt)
            await db.commit()
    except Exception:
        logger.exception("Could not record agent usage for user %s", user_id)
