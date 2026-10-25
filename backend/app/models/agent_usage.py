import uuid
from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Integer, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AgentUsage(Base):
    """Agent tokens a student used on one day (Athens time), for the daily limit
    (app/agent/usage.py). Backend only: RLS on, no API grants (migration 0003)."""

    __tablename__ = "agent_usage"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), primary_key=True
    )
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    input_tokens: Mapped[int] = mapped_column(BigInteger, server_default=text("0"))
    output_tokens: Mapped[int] = mapped_column(BigInteger, server_default=text("0"))
    requests: Mapped[int] = mapped_column(Integer, server_default=text("0"))
