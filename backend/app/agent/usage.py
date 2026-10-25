"""The agent's daily token limit, per student.

Each run's tokens (input + output, as the SDK counts them) are added to the
student's row for today, Athens time. A new message is refused once today's
total reaches AGENT_DAILY_TOKENS. The check comes before the run, so the run
that crosses the limit finishes: a student can go over by at most one reply.
"""

import logging
import uuid

from agents import Usage
from sqlalchemy import Date, cast, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from app.models import AgentUsage

logger = logging.getLogger("uvicorn.error")

# Greek students' day: the limit resets at midnight in Greece, not UTC.
TODAY = cast(func.timezone("Europe/Athens", func.now()), Date)


async def tokens_today(db: AsyncSession, user_id: uuid.UUID) -> int:
    used = await db.scalar(
        select(AgentUsage.input_tokens + AgentUsage.output_tokens).where(
            AgentUsage.user_id == user_id, AgentUsage.day == TODAY
        )
    )
    return used or 0


async def record_usage(user_id: uuid.UUID, usage: Usage) -> None:
    """Add a run's tokens to today's row. Runs after the reply streamed, in its
    own session (the request's is gone by then); a failure is logged, not raised."""
    if usage.requests == 0:
        return
    stmt = insert(AgentUsage).values(
        user_id=user_id,
        day=TODAY,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        requests=usage.requests,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[AgentUsage.user_id, AgentUsage.day],
        set_={
            "input_tokens": AgentUsage.input_tokens + stmt.excluded.input_tokens,
            "output_tokens": AgentUsage.output_tokens + stmt.excluded.output_tokens,
            "requests": AgentUsage.requests + stmt.excluded.requests,
        },
    )
    try:
        async with get_sessionmaker()() as db:
            await db.execute(stmt)
            await db.commit()
    except Exception:
        logger.exception("Could not record agent usage for user %s", user_id)
