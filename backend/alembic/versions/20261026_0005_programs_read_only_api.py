"""programs: read-only through Supabase's Data API

Saving goes through the backend (/programs), which enforces MAX_PROGRAMS and the
code size. With Supabase's default table grants and a `for all` policy, a signed-in
user could insert or update rows directly at /rest/v1/programs and skip both.

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-26
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Raw SQL, like 0001: grants and policies aren't models.
UPGRADE_SQL = """
revoke insert, update, delete on public.programs from anon, authenticated;

drop policy "Users manage own programs" on public.programs;
create policy "Users can read own programs"
  on public.programs for select
  using ((select auth.uid()) = user_id);
"""

DOWNGRADE_SQL = """
drop policy "Users can read own programs" on public.programs;
create policy "Users manage own programs"
  on public.programs for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant insert, update, delete on public.programs to anon, authenticated;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
