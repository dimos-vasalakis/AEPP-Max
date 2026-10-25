"""Tables of the OpenAI Agents SDK's SQLAlchemySession.

The SDK owns this schema (agents/extensions/memory/sqlalchemy_session.py); it is
mirrored here only so `alembic check` doesn't try to drop the tables. We create
them in a migration (with RLS on and no API grants) instead of letting the SDK
create them, so after an SDK upgrade, compare its Table definitions with these.
"""

from sqlalchemy import TIMESTAMP, Column, ForeignKey, Index, Integer, String, Table, Text, text

from app.models.base import Base

agent_sessions = Table(
    "agent_sessions",
    Base.metadata,
    Column("session_id", String, primary_key=True),
    Column("created_at", TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"), nullable=False),
    Column("updated_at", TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"), nullable=False),
)

agent_messages = Table(
    "agent_messages",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column(
        "session_id",
        String,
        ForeignKey("agent_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("message_data", Text, nullable=False),
    Column("created_at", TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"), nullable=False),
    Index("idx_agent_messages_session_time", "session_id", "created_at"),
)
