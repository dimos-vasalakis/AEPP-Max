import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from agents import set_default_openai_key, set_tracing_disabled
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, IntegrityError, InterfaceError, OperationalError

from app.api.v1.router import api_router
from app.core.config import get_settings, is_unset
from app.core.db import get_engine

settings = get_settings()
logger = logging.getLogger("uvicorn.error")

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=os.environ.get("RENDER_GIT_COMMIT"),  # None = the SDK guesses
        # Stack traces and timings only. Request bodies, headers, local variables and the
        # agent's prompts and tool calls would carry students' code, chats and IPs.
        # Every key is listed: one left out falls back to the SDK's collect-everything default.
        data_collection={
            "user_info": False,
            "cookies": {"mode": "off"},
            "http_headers": {"request": {"mode": "off"}},
            "http_bodies": [],
            "url_query_params": {"mode": "off"},
            "gen_ai": {"inputs": False, "outputs": False},
            "database_query_data": False,
            "stack_frame_variables": False,
        },
        traces_sample_rate=1.0 if settings.environment == "development" else 0.1,
    )


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if is_unset(settings.database_url):
        logger.warning(
            "DATABASE_URL is not set (still the .env.example placeholder). "
            "Endpoints that need the database will return 503."
        )
    # The SDK only reads OPENAI_API_KEY from os.environ, not from backend/.env.
    if not is_unset(settings.openai_api_key):
        set_default_openai_key(settings.openai_api_key)
    # The SDK uploads every run (messages, code, tool output) to OpenAI's Traces
    # dashboard by default. Students' conversations stay out of it.
    set_tracing_disabled(True)
    yield
    if not is_unset(settings.database_url):
        await get_engine().dispose()


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(OperationalError)
@app.exception_handler(InterfaceError)
async def database_unavailable(_: Request, exc: DBAPIError) -> JSONResponse:
    # Can't reach Postgres (bad DATABASE_URL, Supabase paused, network). Return a
    # clear 503 instead of a bare 500; handled here so CORS headers are kept.
    logger.error("Database unavailable: %s", exc.orig)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


# Foreign-key failures that are the client's situation, not a bug (Postgres's
# default constraint names, migration 0001). A deleted account's token stays
# valid until it expires, so its inserts fail on user_id; a program deleted from
# another tab fails a new conversation's program_id.
FOREIGN_KEY_ERRORS = {
    "programs_user_id_fkey": (401, "Account no longer exists"),
    "conversations_user_id_fkey": (401, "Account no longer exists"),
    "conversations_program_id_fkey": (404, "Program not found"),
    # Postgres's default name: migration 0003 doesn't name it.
    "agent_usage_user_id_fkey": (401, "Account no longer exists"),
}


@app.exception_handler(IntegrityError)
async def integrity_error(_: Request, exc: IntegrityError) -> JSONResponse:
    constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
    if constraint not in FOREIGN_KEY_ERRORS:
        # A real bug. Answer here, not by re-raising, so the 500 keeps its CORS headers.
        logger.exception("Integrity error", exc_info=exc)
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
    status_code, detail = FOREIGN_KEY_ERRORS[constraint]
    return JSONResponse(status_code=status_code, content={"detail": detail})
