"""programs: only select for signed-in users, nothing for anon

0005 revoked insert, update and delete, which left the rest of Supabase's
default grant (truncate, references, trigger, and select for anon). Replace it
with an explicit allow-list, as CLAUDE.md asks.

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-26
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UPGRADE_SQL = """
revoke all on public.programs from anon, authenticated;
grant select on public.programs to authenticated;
"""

# Back to what 0005 left: Supabase's default grant minus the writes.
DOWNGRADE_SQL = """
grant all on public.programs to anon, authenticated;
revoke insert, update, delete on public.programs from anon, authenticated;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
