"""contact_messages: what people send through the contact form

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-28
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Raw SQL for the RLS and grants, like 0003. Backend only: the form posts to
# api/v1/endpoints/contact.py, which limits it; nobody reads the messages through the API.
UPGRADE_SQL = """
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index contact_messages_created_at_idx on public.contact_messages (created_at);

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
"""

DOWNGRADE_SQL = """
drop table public.contact_messages;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
