import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, deferred, mapped_column

from app.models.base import Base


class Conversation(Base):
    """An agent chat thread. Its messages live in agent_messages under
    session_id = str(conversation.id) (see app/agent/session.py)."""

    __tablename__ = "conversations"
    __table_args__ = (Index("conversations_user_id_updated_at_idx", "user_id", "updated_at"),)
    # Server defaults aren't read back on insert: RETURNING would name `model`,
    # which doesn't exist before migration 0010. Nothing reads them after one.
    __mapper_args__ = {"eager_defaults": False}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE")
    )
    program_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("programs.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(Text)
    # The model it runs on (migration 0010): another model can't read its encrypted
    # reasoning. Until that migration runs, nothing may name it: deferred, so no
    # SELECT does, and a server default, so an INSERT without it leaves it out.
    model: Mapped[str | None] = deferred(mapped_column(Text, server_default=text("null")))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
