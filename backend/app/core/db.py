import asyncio
import logging
from collections.abc import AsyncIterator
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from alembic.script import ScriptDirectory
from alembic.script.revision import ResolutionError
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
def _migrations() -> ScriptDirectory:
    return ScriptDirectory(str(Path(__file__).resolve().parents[2] / "alembic"))


def revision_includes(version: str | None, needed: str) -> bool:
    """Whether a database at `version` has run migration `needed`."""
    if version is None:
        return False
    try:
        return any(r.revision == needed for r in _migrations().iterate_revisions(version, "base"))
    except ResolutionError:
        # A revision this image doesn't know (a newer image, a stray stamp): can't
        # tell, so say no. The features behind this check guard privacy promises.
        logging.getLogger("uvicorn.error").warning(
            "Database is at unknown migration %s; treating %s as missing", version, needed
        )
        return False


async def has_migration(db: AsyncSession, needed: str) -> bool:
    """Migrations don't run on deploy, so a feature that relies on one checks first."""
    version = None
    # A database Alembic never ran on has no alembic_version table.
    if await db.scalar(text("select to_regclass('alembic_version') is not null")):
        version = await db.scalar(text("select version_num from alembic_version"))
    # Reading the migration files is blocking I/O (only the first time; it's cached).
    return await asyncio.to_thread(revision_includes, version, needed)
