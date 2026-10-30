from functools import lru_cache
from typing import Literal

from pydantic import NonNegativeInt
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AEPP-Max API"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]

    supabase_url: str = ""
    supabase_jwt_secret: str = ""  # legacy HS256 projects only
    # Secret (or legacy service_role) key, for the Auth Admin API. Empty = account
    # deletion returns 503.
    supabase_secret_key: str = ""

    database_url: str = ""  # transaction pooler, used by the app
    direct_url: str = ""  # direct connection, used by Alembic

    # AI agent (OpenAI Agents SDK). Empty key = /agent returns 503.
    openai_api_key: str = ""
    openai_model: str = "gpt-5.6-sol"  # the Free plan's
    openai_model_diamond: str = "gpt-5.6-sol"  # the Diamond plan's: the better one
    # How hard the model thinks before answering, unless the student picks another with
    # /effort: more solves exam problems better but spends more output tokens (the daily
    # limit counts them). "" = the API's default, which is no reasoning for gpt-5.6-*.
    openai_reasoning_effort: Literal["", "none", "low", "medium", "high"] = "low"
    agent_max_turns: int = 12
    # Agent tokens (input + output) per student per day, Athens time. 0 = no limit
    # (negative is refused at startup). A message costs about 1-4k tokens, more as
    # a conversation grows, and at least 1k (agent/usage.py).
    agent_daily_tokens: NonNegativeInt = 20_000
    agent_daily_tokens_diamond: NonNegativeInt = 100_000

    # Stripe, for the Diamond plan ($5 a month). Empty = no checkout (503); everyone is Free.
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""  # whsec_…, the webhook endpoint's signing secret
    stripe_price_id: str = ""  # price_…, Diamond's monthly price

    # Sentry error reports and request traces. Empty = off.
    sentry_dsn: str = ""

    # ΓΛΩΣΣΑ interpreter limits, per run. Hitting one ends the run with status "limit".
    run_max_steps: int = 200_000
    run_max_output_lines: int = 2_000
    run_max_trace_steps: int = 5_000
    run_timeout_seconds: float = 3.0
    # Programs running at once, and requests waiting for one of them, before /run and
    # /check answer 503 (core/interpreter_pool.py).
    run_workers: int = 2
    run_queue: int = 16


def is_unset(url: str) -> bool:
    """Empty, or still the <placeholder> value from .env.example."""
    return not url or "<" in url


def sqlalchemy_url(url: str) -> str:
    """Use the psycopg 3 driver for plain postgres:// URIs copied from Supabase."""
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
