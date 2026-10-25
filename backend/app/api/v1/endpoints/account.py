from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select

from app.core.config import get_settings, is_unset
from app.core.db import DbSession
from app.core.security import CurrentUserDep
from app.models import Conversation, Program, agent_sessions

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
    """Delete the user from Supabase Auth (Admin API). That cascades to profiles."""
    settings = get_settings()
    key = settings.supabase_secret_key
    async with httpx.AsyncClient(transport=transport, timeout=10) as client:
        res = await client.delete(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
        )
    # 404: already gone (e.g. a retry after a timeout), which is what we wanted.
    if res.status_code != status.HTTP_404_NOT_FOUND and res.is_error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not delete the account")


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(user: CurrentUserDep, _: AdminReady, db: DbSession) -> Response:
    """Delete everything the user has, then the account itself."""
    # agent_sessions has no foreign key to conversations (the SDK owns it), so
    # the cascade from auth.users wouldn't reach it: delete it by id first.
    conversation_ids = await db.scalars(
        select(Conversation.id).where(Conversation.user_id == user.id)
    )
    session_ids = [str(i) for i in conversation_ids]
    if session_ids:
        await db.execute(delete(agent_sessions).where(agent_sessions.c.session_id.in_(session_ids)))
    await db.execute(delete(Conversation).where(Conversation.user_id == user.id))
    await db.execute(delete(Program).where(Program.user_id == user.id))
    await db.commit()
    await delete_auth_user(str(user.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
