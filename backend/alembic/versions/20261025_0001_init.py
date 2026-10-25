"""init: profiles, programs, conversations, agent session storage, RLS

Revision ID: 0001
Revises:
Create Date: 2026-10-25
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Raw SQL because RLS policies, grants and the auth.users trigger
# aren't expressible in SQLAlchemy models.
UPGRADE_SQL = """
-- Profiles: one row per auth user, created on sign-up
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update using ((select auth.uid()) = id);

-- A column-level revoke doesn't undo Supabase's table-level grant, so replace
-- the grant with an explicit allow-list of user-editable columns.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Saved ΓΛΩΣΣΑ programs
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null constraint programs_title_length_check
    check (char_length(title) between 1 and 120),
  code text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index programs_user_id_updated_at_idx on public.programs (user_id, updated_at);

alter table public.programs enable row level security;

create policy "Users manage own programs"
  on public.programs for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Agent chat threads (messages are in agent_messages)
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid references public.programs (id) on delete set null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_id_updated_at_idx
  on public.conversations (user_id, updated_at);

alter table public.conversations enable row level security;

create policy "Users can read own conversations"
  on public.conversations for select using ((select auth.uid()) = user_id);

-- OpenAI Agents SDK SQLAlchemySession storage. Must match the SDK's schema
-- (see app/models/agent_session.py). Backend only: RLS on, no policies, no grants.
create table public.agent_sessions (
  session_id varchar primary key,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp
);

create table public.agent_messages (
  id serial primary key,
  session_id varchar not null references public.agent_sessions (session_id) on delete cascade,
  message_data text not null,
  created_at timestamp not null default current_timestamp
);

create index idx_agent_messages_session_time on public.agent_messages (session_id, created_at);

alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;
revoke all on public.agent_sessions, public.agent_messages from anon, authenticated;
"""

DOWNGRADE_SQL = """
drop table if exists public.agent_messages;
drop table if exists public.agent_sessions;
drop table if exists public.conversations;
drop table if exists public.programs;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
