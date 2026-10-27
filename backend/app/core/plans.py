"""The two plans: Free, and Diamond ($5 a month through Stripe, api/v1/endpoints/
billing.py). frontend/src/lib/plan.ts mirrors the numbers, so change both together."""

import uuid
from dataclasses import dataclass
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import has_migration
from app.models import Subscription

PlanName = Literal["free", "diamond"]
# What /effort offers: how hard the model thinks (config.openai_reasoning_effort).
Effort = Literal["low", "medium", "high"]

# Stripe's statuses that keep Diamond on: past_due while Stripe retries the card.
DIAMOND_STATUSES = frozenset({"active", "trialing", "past_due"})


@dataclass(frozen=True)
class Plan:
    name: PlanName
    model: str  # the agent's OpenAI model
    daily_tokens: int  # the agent's, as agent/usage.py counts them; 0 = no limit
    max_programs: int  # saved programs and algorithms together
    max_themes: int  # custom themes (kept in the browser; the frontend enforces it)
    efforts: tuple[Effort, ...]  # what /effort may pick


def get_plan(name: PlanName) -> Plan:
    settings = get_settings()
    if name == "diamond":
        return Plan(
            "diamond",
            settings.openai_model_diamond,
            settings.agent_daily_tokens_diamond,
            max_programs=50,
            max_themes=20,
            efforts=("low", "medium", "high"),
        )
    return Plan(
        "free",
        settings.openai_model,
        settings.agent_daily_tokens,
        max_programs=5,
        max_themes=3,
        efforts=("low", "medium"),
    )


async def subscription_of(db: AsyncSession, user_id: uuid.UUID) -> Subscription | None:
    """The student's Stripe record; None before migration 0007 (everyone is Free then)."""
    if not await has_migration(db, "0007"):
        return None
    return await db.get(Subscription, user_id)


def is_diamond(subscription: Subscription | None) -> bool:
    return subscription is not None and subscription.status in DIAMOND_STATUSES


async def plan_for(db: AsyncSession, user_id: uuid.UUID) -> Plan:
    return get_plan("diamond" if is_diamond(await subscription_of(db, user_id)) else "free")
