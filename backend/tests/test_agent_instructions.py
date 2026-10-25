from types import SimpleNamespace

from app.agent.context import AgentContext
from app.agent.instructions import instructions


def prompt(context: AgentContext) -> str:
    return instructions(SimpleNamespace(context=context), None)  # type: ignore[arg-type]


def test_tutor_points_to_the_switch_command() -> None:
    assert "/switch" in prompt(AgentContext(code="", mode="ask"))


def test_agent_says_whether_edits_wait_for_approval() -> None:
    direct = prompt(AgentContext(code="", mode="agent"))
    approve = prompt(AgentContext(code="", mode="agent", approve=True))
    assert "goes straight into their editor" in direct
    assert "approve it (Ctrl+Enter)" in approve
    assert "goes straight" not in approve
