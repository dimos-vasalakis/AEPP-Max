"""The agent's daily token limit, per student.

Every message is charged MESSAGE_TOKENS up front, in the same statement that
checks the limit, so parallel requests can't all slip past one stale total, and
a reply stopped before the model finishes still costs something (the SDK only
counts a response once it completes). After the run, what it used beyond that
(input + output, as the SDK counts them) is added. Days are Athens time.

A student has one reply running at a time (`start_reply`), and a reply stops
before its next model call once it has used what was left of the day (`Budget`).
So a student goes over by at most one model call's tokens.
"""

import logging
import time
import uuid
from datetime import datetime

from agents import Agent, RunContextWrapper, RunHooks, TResponseInputItem, Usage
from sqlalchemy import Date, cast, func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from app.models import AgentUsage

logger = logging.getLogger("uvicorn.error")

# Greek students' day: the limit resets at midnight in Greece, not UTC.
TODAY = cast(func.timezone("Europe/Athens", func.now()), Date)

# The next midnight in Greece, when TODAY's total stops counting (as a timestamptz).
NEXT_RESET = text(
    "timezone('Europe/Athens', date_trunc('day', timezone('Europe/Athens', now()))"
    " + interval '1 day')"
)

# Charged for every message before it runs; about what a short reply costs.
MESSAGE_TOKENS = 1_000


async def read_usage(db: AsyncSession, user_id: uuid.UUID) -> tuple[int, int, datetime]:
    """Today's tokens and messages for the student, and when they reset."""
    used = select(AgentUsage.tokens, AgentUsage.messages).where(
        AgentUsage.user_id == user_id, AgentUsage.day == TODAY
    )
    row = (await db.execute(used)).first()
    resets_at = await db.scalar(select(NEXT_RESET))
    tokens, messages = row if row is not None else (0, 0)
    return tokens, messages, resets_at


async def reserve_message(db: AsyncSession, user_id: uuid.UUID, limit: int) -> int | None:
    """Charge a message up front if today's total is still under `limit`, and return
    the new total (None: over the limit). Atomic: the upsert locks the row, so
    concurrent messages see each other's charges. The caller's commit makes it count."""
    stmt = insert(AgentUsage).values(user_id=user_id, day=TODAY, tokens=MESSAGE_TOKENS, messages=1)
    stmt = stmt.on_conflict_do_update(
        index_elements=[AgentUsage.user_id, AgentUsage.day],
        set_={
            "tokens": AgentUsage.tokens + MESSAGE_TOKENS,
            "messages": AgentUsage.messages + 1,
        },
        where=AgentUsage.tokens < limit,
    ).returning(AgentUsage.tokens)
    return await db.scalar(stmt)


async def record_usage(user_id: uuid.UUID, reserved: int, usage: Usage) -> None:
    """Add what a run used beyond its up-front charge. Runs after the reply, in its
    own session (the request's is gone by then); a failure is logged, not raised.
    Without a daily limit nothing was reserved, so the message is counted here."""
    extra = max(usage.input_tokens + usage.output_tokens - reserved, 0)
    messages = 1 if reserved == 0 else 0
    if extra == 0 and messages == 0:
        return
    stmt = insert(AgentUsage).values(user_id=user_id, day=TODAY, tokens=extra, messages=messages)
    stmt = stmt.on_conflict_do_update(
        index_elements=[AgentUsage.user_id, AgentUsage.day],
        set_={
            "tokens": AgentUsage.tokens + stmt.excluded.tokens,
            "messages": AgentUsage.messages + stmt.excluded.messages,
        },
    )
    try:
        async with get_sessionmaker()() as db:
            await db.execute(stmt)
            await db.commit()
    except Exception:
        logger.exception("Could not record agent usage for user %s", user_id)


# Students with a reply running, and since when. In memory: Render runs one process.
_replying: dict[uuid.UUID, float] = {}
# A backstop: stream_reply frees the slot however its stream ends, but if a slot is
# ever left behind, after this long it stops counting. No reply runs that long.
REPLY_SLOT_SECONDS = 600


def replying(user_id: uuid.UUID) -> bool:
    started = _replying.get(user_id)
    return started is not None and time.monotonic() - started < REPLY_SLOT_SECONDS


def start_reply(user_id: uuid.UUID) -> float | None:
    """Take the student's one reply slot: its token for `end_reply`, or None if a
    reply of theirs is still running (another tab, a script). One at a time, or
    parallel messages would each spend up to the day's limit before any is recorded."""
    if replying(user_id):
        return None
    _replying[user_id] = token = time.monotonic()
    return token


def end_reply(user_id: uuid.UUID, token: float) -> None:
    # Only its own slot: a stale one may have been taken over since.
    if _replying.get(user_id) == token:
        del _replying[user_id]


class OverBudget(Exception):
    """The reply has used what was left of the student's day."""


class Budget(RunHooks):
    """Stops a reply before its next model call once it has used `tokens`. A reply can
    make up to agent_max_turns calls, each re-sending the code and the history, so one
    reply could otherwise spend many times the daily limit."""

    def __init__(self, tokens: int) -> None:
        self.tokens = tokens

    async def on_llm_start(
        self,
        context: RunContextWrapper,
        agent: Agent,
        system_prompt: str | None,
        input_items: list[TResponseInputItem],
    ) -> None:
        if context.usage.input_tokens + context.usage.output_tokens >= self.tokens:
            raise OverBudget
