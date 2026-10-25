from collections.abc import AsyncIterator
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from alembic.script import ScriptDirectory
from fastapi import Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings, is_unset, sqlalchemy_url


@lru_cache
def get_engine() -> AsyncEngine:
    return create_async_engine(
        sqlalchemy_url(get_settings().database_url),
        pool_pre_ping=True,
        # Supavisor's transaction pooler doesn't support prepared statements.
        connect_args={"prepare_threshold": None},
    )


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=get_engine(), expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    if is_unset(get_settings().database_url):
        raise HTTPException(503, "Database unavailable: DATABASE_URL is not configured")
    async with get_sessionmaker()() as session:
        yield session


DbSession = Annotated[AsyncSession, Depends(get_db)]


@lru_cache
def latest_revision() -> str | None:
    """The newest migration in alembic/versions (read once; it ships with the image)."""
    return ScriptDirectory(str(Path(__file__).resolve().parents[2] / "alembic")).get_current_head()


async def schema_is_current(db: AsyncSession) -> bool:
    """Whether production ran the latest migration. Migrations don't run on deploy,
    so features that rely on one (account deletion on 0002's triggers) check first."""
    version = await db.scalar(text("select version_num from alembic_version"))
    return version == latest_revision()
