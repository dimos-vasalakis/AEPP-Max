import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import InterfaceError, OperationalError

from app.core.config import get_settings, is_unset
from app.core.db import DbSession, has_migration
from app.core.security import CurrentUserDep
from app.models import auth_users

router = APIRouter(prefix="/account", tags=["account"])
logger = logging.getLogger("uvicorn.error")


async def require_admin() -> None:
    settings = get_settings()
    if is_unset(settings.supabase_url) or is_unset(settings.supabase_secret_key):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Account deletion is not configured"
        )


# Dependencies run in parameter order: auth (401), then this (503), then the DB.
AdminReady = Annotated[None, Depends(require_admin)]


async def delete_auth_user(user_id: str, transport: httpx.AsyncBaseTransport | None = None) -> None:
    """Delete the user from Supabase Auth (Admin API)."""
    settings = get_settings()
    key = settings.supabase_secret_key
    try:
        async with httpx.AsyncClient(transport=transport, timeout=10) as client:
            res = await client.delete(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}",
                headers={"apikey": key, "Authorization": f"Bearer {key}"},
            )
    except httpx.HTTPError as err:  # unreachable or timed out
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not delete the account") from err
    # 404: already gone (e.g. a retry after a timeout), which is what we wanted.
    if res.status_code != status.HTTP_404_NOT_FOUND and res.is_error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not delete the account")


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(user: CurrentUserDep, _: AdminReady, db: DbSession) -> Response:
    """Delete the account and everything it owns, in one step that either happens
    or doesn't: auth.users cascades to profiles, programs and conversations, and
    deleting a conversation deletes its agent session (migration 0002)."""
    # Without 0002's triggers the chat history would stay behind.
    if not await has_migration(db, "0002"):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Account deletion needs migration 0002"
        )
    # Release the pooled connection: the Admin API call can take seconds.
    await db.close()
    await delete_auth_user(str(user.id))
    # The privacy page promises the data is gone. A soft delete (or a 404 for a
    # user Supabase only hides) would leave the row, and so everything it owns.
    try:
        still_there = await db.scalar(select(auth_users.c.id).where(auth_users.c.id == user.id))
    except (OperationalError, InterfaceError):
        # Supabase said it's deleted; only the double check failed. Don't tell the
        # student it failed (they'd keep a session for an account that's gone).
        logger.warning("Deleted user %s, but couldn't check auth.users afterwards", user.id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    if still_there is not None:
        # Retrying won't help (e.g. soft-deleted, or SUPABASE_URL is another
        # project): someone has to look, so say which user.
        logger.error("Admin API deleted user %s, but auth.users still has it", user.id)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not delete the account")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
