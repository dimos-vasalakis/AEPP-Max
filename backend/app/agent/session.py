import uuid

from agents import SessionSettings
from agents.extensions.memory import SQLAlchemySession

from app.core.db import get_engine

# What a reply sends of the history: the latest items (messages, tool calls and
# their output), so a long conversation can't make every model call huge. The SDK
# drops a tool output whose call fell outside it.
HISTORY_ITEMS = 60


def conversation_session(conversation_id: uuid.UUID) -> SQLAlchemySession:
    """The SDK session holding a conversation's message history.

    Tables come from migration 0001 (see app/models/agent_session.py), so the
    SDK must not create them.
    """
    return SQLAlchemySession(
        str(conversation_id),
        engine=get_engine(),
        create_tables=False,
        session_settings=SessionSettings(limit=HISTORY_ITEMS),
    )
