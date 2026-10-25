"""agent sessions live and die with their conversation

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-25
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# agent_sessions.session_id is a conversation's id as text, but the SDK owns that
# table (text, not uuid), so it can't have a real foreign key. These triggers
# stand in for one: deleting a conversation (also by the cascade from auth.users
# when an account is deleted) deletes its session and messages, and a session
# can't be created, or re-created by a reply still streaming, without one.
UPGRADE_SQL = """
create function public.agent_session_requires_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- FOR KEY SHARE: a conversation deleted meanwhile waits for this insert,
  -- then its own trigger deletes the new session. The uuid check first, so a
  -- non-uuid id is a foreign key violation too, not a cast error.
  if new.session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    perform 1 from public.conversations
      where id = new.session_id::uuid
      for key share;
  end if;
  if not found then  -- also when the check above skipped the lookup
    raise foreign_key_violation
      using message = 'agent session ' || new.session_id || ' has no conversation';
  end if;
  return new;
end;
$$;

create trigger agent_sessions_require_conversation
  before insert on public.agent_sessions
  for each row execute function public.agent_session_requires_conversation();

-- security definer: it also fires inside the cascade from auth.users, run by
-- Supabase Auth's own role, which has no rights on our tables (like
-- handle_new_user in 0001).
create function public.delete_agent_session()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from public.agent_sessions where session_id = old.id::text;
  return old;
end;
$$;

create trigger conversations_delete_agent_session
  after delete on public.conversations
  for each row execute function public.delete_agent_session();

-- Sessions left behind before these triggers existed.
delete from public.agent_sessions s
  where not exists (select 1 from public.conversations c where c.id::text = s.session_id);
"""

DOWNGRADE_SQL = """
drop trigger conversations_delete_agent_session on public.conversations;
drop function public.delete_agent_session();
drop trigger agent_sessions_require_conversation on public.agent_sessions;
drop function public.agent_session_requires_conversation();
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
