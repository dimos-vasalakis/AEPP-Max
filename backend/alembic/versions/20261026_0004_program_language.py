"""programs.language: a saved program is ΓΛΩΣΣΑ or ψευδογλώσσα

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-26
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Raw SQL, like 0001. Rows saved before this are ΓΛΩΣΣΑ: the IDE had no Αλγόριθμος then.
UPGRADE_SQL = """
alter table public.programs
  add column language text not null default 'glossa'
  constraint programs_language_check check (language in ('glossa', 'pseudocode'));
"""

DOWNGRADE_SQL = """
alter table public.programs drop column language;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
