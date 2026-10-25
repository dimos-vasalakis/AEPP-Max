import uuid

from agents.extensions.memory import SQLAlchemySession

from app.core.db import get_engine


def conversation_session(conversation_id: uuid.UUID) -> SQLAlchemySession:
    """The SDK session holding a conversation's message history.

    Tables come from migration 0001 (see app/models/agent_session.py), so the
    SDK must not create them.
    """
    return SQLAlchemySession(str(conversation_id), engine=get_engine(), create_tables=False)
