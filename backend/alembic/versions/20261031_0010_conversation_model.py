"""conversations.model: the model a conversation runs on

A plan change while the IDE stays open would otherwise continue the conversation
on the other plan's model, which may not read the first one's encrypted
reasoning. endpoints/agent.py starts a new conversation instead. Null for the
conversations from before this, which carry on as they did.

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-31
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("model", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("conversations", "model")
