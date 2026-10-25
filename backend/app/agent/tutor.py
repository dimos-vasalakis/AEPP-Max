from functools import lru_cache

from agents import Agent

from app.agent.context import AgentContext
from app.agent.instructions import instructions
from app.agent.tools import TOOLS
from app.core.config import get_settings


@lru_cache
def get_agent() -> Agent[AgentContext]:
    # One agent for both modes: instructions and write_code's is_enabled
    # read the mode from the run context.
    return Agent[AgentContext](
        name="AEPP-Max",
        instructions=instructions,
        model=get_settings().openai_model,
        tools=TOOLS,
    )
