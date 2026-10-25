from functools import lru_cache

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
    openai_model: str = "gpt-5.6-sol"
    agent_max_turns: int = 12

    # ΓΛΩΣΣΑ interpreter limits, per run. Hitting one ends the run with status "limit".
    run_max_steps: int = 200_000
    run_max_output_lines: int = 2_000
    run_max_trace_steps: int = 5_000
    run_timeout_seconds: float = 3.0


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
