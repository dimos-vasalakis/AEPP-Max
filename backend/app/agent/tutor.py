from functools import lru_cache

from agents import Agent, ModelSettings

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
        # Don't keep replies on OpenAI's side (the Responses API stores them by
        # default); our session sends the history each turn. Reasoning then has to
        # travel encrypted in that history, or the next turn can't refer to it.
        model_settings=ModelSettings(store=False, response_include=["reasoning.encrypted_content"]),
    )
