from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.config import get_settings, is_unset
from app.core.db import DbSession, schema_is_current
from app.core.security import CurrentUserDep

router = APIRouter(prefix="/account", tags=["account"])


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
    if not await schema_is_current(db):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Account deletion needs the latest migrations"
        )
    # Release the pooled connection: the Admin API call can take seconds.
    await db.close()
    await delete_auth_user(str(user.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
