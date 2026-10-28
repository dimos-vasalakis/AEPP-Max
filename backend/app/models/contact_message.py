import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ContactMessage(Base):
    """A message sent through the contact form (api/v1/endpoints/contact.py), read in
    Supabase's table editor. Not tied to an account: anyone may write. Backend only:
    RLS on, no API grants (migration 0008)."""

    __tablename__ = "contact_messages"
    __table_args__ = (Index("contact_messages_created_at_idx", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text)
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
