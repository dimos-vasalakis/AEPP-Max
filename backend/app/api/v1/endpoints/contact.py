import logging
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Response, status
from sentry_sdk import logger as sentry_logger
from sentry_sdk import metrics
from sqlalchemy import delete, func, select

from app.core.db import DbSession, get_sessionmaker, has_migration
from app.models import ContactMessage
from app.schemas.contact import ContactRequest

router = APIRouter(tags=["contact"])

# Spam limits without IP addresses (Render's proxy hides them, and we don't keep them):
# all senders together per hour and per day, so a bot can't fill the database
# (100 a day of at most MAX_MESSAGE_CHARS), and per email per day.
HOURLY_LIMIT = 30
DAILY_LIMIT = 100
DAILY_PER_EMAIL = 3
# Messages are deleted after a year (the privacy policy says so): on every message,
# and at startup (delete_expired), which Render's sleeping free tier makes frequent.
KEEP = timedelta(days=365)


def expired():
    return delete(ContactMessage).where(ContactMessage.created_at < func.now() - KEEP)


async def delete_expired() -> None:
    """At startup: a quiet year with no new message must still delete the old ones."""
    try:
        async with get_sessionmaker()() as db:
            if await has_migration(db, "0008"):
                await db.execute(expired())
                await db.commit()
    except Exception:
        logging.getLogger("uvicorn.error").warning("Couldn't delete expired contact messages")


@router.post("/contact", status_code=status.HTTP_204_NO_CONTENT)
async def send_message(body: ContactRequest, db: DbSession) -> Response:
    """The contact form: no account needed. Stored for the owner to read in Supabase."""
    if body.website:
        # A bot: it sees the same answer as a person, so it doesn't try another way.
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    if not await has_migration(db, "0008"):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Contact needs migration 0008")
    # One sender at a time, so the counts below can't let two through at a limit.
    await db.execute(select(func.pg_advisory_xact_lock(func.hashtext("contact_messages"))))
    await db.execute(expired())

    def since(ago: timedelta):
        return select(func.count()).where(ContactMessage.created_at > func.now() - ago)

    hour = await db.scalar(since(timedelta(hours=1)))
    day = await db.scalar(since(timedelta(days=1)))
    same_sender = await db.scalar(
        since(timedelta(days=1)).where(func.lower(ContactMessage.email) == body.email.lower())
    )
    if (
        (hour or 0) >= HOURLY_LIMIT
        or (day or 0) >= DAILY_LIMIT
        or (same_sender or 0) >= DAILY_PER_EMAIL
    ):
        await db.commit()  # the expired messages' delete, nothing else
        metrics.count("contact.limited", 1)
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many messages")
    db.add(ContactMessage(name=body.name, email=body.email, message=body.message))
    await db.commit()
    # Counts only, never the sender or the message: an alert on this says one arrived.
    metrics.count("contact.message", 1)
    sentry_logger.info("Contact message received")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
