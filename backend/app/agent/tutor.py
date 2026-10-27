from functools import lru_cache

from agents import Agent, ModelSettings
from openai.types.shared import Reasoning

from app.agent.context import AgentContext
from app.agent.instructions import instructions
from app.agent.tools import TOOLS
from app.core.config import get_settings


@lru_cache
def get_agent() -> Agent[AgentContext]:
    # One agent for both modes: instructions and write_code's is_enabled
    # read the mode from the run context.
    settings = get_settings()
    effort = settings.openai_reasoning_effort
    return Agent[AgentContext](
        name="AEPP-Max",
        instructions=instructions,
        model=settings.openai_model,
        tools=TOOLS,
        # Don't keep replies on OpenAI's side (the Responses API stores them by
        # default); our session sends the history each turn. Reasoning then has to
        # travel encrypted in that history, or the next turn can't refer to it.
        # One tool call at a time: two write_code calls in one turn would otherwise
        # race, and the editor could end up with the older version. max_tokens caps
        # a runaway reply (reasoning included). Reasoning lets it work an exam problem
        # through before writing (config.openai_reasoning_effort).
        model_settings=ModelSettings(
            reasoning=Reasoning(effort=effort) if effort else None,
            store=False,
            response_include=["reasoning.encrypted_content"],
            parallel_tool_calls=False,
            max_tokens=16_000,
        ),
    )
