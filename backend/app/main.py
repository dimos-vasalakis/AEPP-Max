import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from agents import set_default_openai_key, set_tracing_disabled
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sentry_sdk.integrations.logging import (
    LoggingIntegration,
    ignore_logger,
    ignore_logger_for_sentry_logs,
)
from sentry_sdk.types import Hint, Log, Metric, SamplingContext
from sqlalchemy.exc import DBAPIError, IntegrityError, InterfaceError, OperationalError

from app.api.v1.router import api_router
from app.core.config import get_settings, is_unset
from app.core.db import get_engine

settings = get_settings()
logger = logging.getLogger("uvicorn.error")


def strip_user_agent[T: (Log, Metric)](item: T, _: Hint) -> T:
    # The SDK puts the request's User-Agent on every log and metric, whatever
    # data_collection says.
    item["attributes"].pop("user_agent.original", None)
    return item


API_PREFIX = "/api/v1"
TRACES_RATE = 1.0 if settings.environment == "development" else 0.1
# The editor sends /check 500 ms after every pause in typing: a sampled page would
# otherwise trace (and profile) all of them.
CHECK_RATE = 1.0 if settings.environment == "development" else 0.01
HEALTH_PATH = API_PREFIX + api_router.url_path_for("health")
CHECK_PATH = API_PREFIX + api_router.url_path_for("check_program")


def sample_traces(context: SamplingContext) -> float:
    path = (context.get("asgi_scope") or {}).get("path")
    # Render's health check (render.yaml) is worth neither a trace nor a profile.
    if path == HEALTH_PATH:
        return 0.0
    if path == CHECK_PATH:
        return CHECK_RATE
    parent = context.get("parent_sampled")  # the browser's trace, when it sent one
    return float(parent) if parent is not None else TRACES_RATE


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
        traces_sampler=sample_traces,
        # Continuous profiling while a sampled trace runs (the traces rate above bounds
        # it; it samples every thread meanwhile): which of our functions take the time,
        # the interpreter's above all. Frames only; stack_frame_variables is off.
        profile_session_sample_rate=1.0,
        profile_lifecycle="trace",
        # The SDK's default, kept on purpose: while Sentry can't keep up (rate limits, a
        # full queue) it halves the traces rate again every 10 s, and goes back once it
        # recovers, instead of piling up.
        enable_backpressure_handling=True,
        # Sentry Logs: what `sentry_sdk.logger` writes (structured: the agent's replies,
        # its daily limit, Stripe's events) and the stdlib loggers' warnings and errors.
        # Not INFO: uvicorn's INFO lines (a WebSocket refused) carry the client's address.
        enable_logs=True,
        integrations=[LoggingIntegration(sentry_logs_level=logging.WARNING)],
        before_send_log=strip_user_agent,
        # Metrics (sentry_sdk.metrics, on by default): counts and timings with
        # low-cardinality attributes only, never a user id.
        before_send_metric=strip_user_agent,
    )
    # The SDK hooks every logger. uvicorn.access writes each request's client IP and
    # query string: neither a log nor a breadcrumb on errors.
    ignore_logger("uvicorn.access")
    ignore_logger_for_sentry_logs("uvicorn.access")


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

app.include_router(api_router, prefix=API_PREFIX)


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
    "subscriptions_user_id_fkey": (401, "Account no longer exists"),  # 0007's, unnamed too
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
