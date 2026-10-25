"""agent_usage: tokens per student per day, for the agent's daily limit

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-25
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Raw SQL for the RLS and grants, like 0001. Backend only, as agent_sessions:
# students can't read or change their own count.
UPGRADE_SQL = """
create table public.agent_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  requests integer not null default 0,
  primary key (user_id, day)
);

alter table public.agent_usage enable row level security;
revoke all on public.agent_usage from anon, authenticated;
"""

DOWNGRADE_SQL = """
drop table public.agent_usage;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
