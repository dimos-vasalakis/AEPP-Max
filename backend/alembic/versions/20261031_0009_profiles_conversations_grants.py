"""profiles, conversations: explicit grants instead of Supabase's defaults

0001 only replaced the update grant on profiles and left conversations alone, so
anon kept everything on both and authenticated kept insert, delete, truncate,
references and trigger (and update on conversations). RLS has no policy for those
today, but truncate ignores RLS. Replace them with allow-lists, as 0006 did for
programs.

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-31
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UPGRADE_SQL = """
revoke all on public.profiles, public.conversations from anon, authenticated;
grant select on public.profiles, public.conversations to authenticated;
grant update (display_name) on public.profiles to authenticated;
"""

# Back to what 0001 left: Supabase's default grant, with profiles' update replaced.
DOWNGRADE_SQL = """
grant all on public.profiles, public.conversations to anon, authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
