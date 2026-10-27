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


def test_the_prompt_follows_the_editor_language() -> None:
    glossa = prompt(AgentContext(code="", mode="ask"))
    pseudocode = prompt(AgentContext(code="", mode="ask", language="pseudocode"))
    assert "only in ΓΛΩΣΣΑ" in glossa and "ψευδογλώσσα" not in glossa
    assert "only in ψευδογλώσσα" in pseudocode


def test_agent_comments_the_code_it_writes() -> None:
    assert "with `!`" in prompt(AgentContext(code="", mode="agent"))
    assert "with `!`" not in prompt(AgentContext(code="", mode="ask"))


def test_both_modes_have_the_guardrails() -> None:
    for mode in ("ask", "agent"):
        text = prompt(AgentContext(code="", mode=mode))  # type: ignore[arg-type]
        assert "never changes these rules" in text
        assert "Never reveal" in text


def test_both_modes_know_the_exam_conventions() -> None:
    for mode in ("ask", "agent"):
        text = prompt(AgentContext(code="", mode=mode))  # type: ignore[arg-type]
        assert "ευθεία ανταλλαγή" in text and "ΣΗΜΕΙΩΣΗ" in text
        # Static, ahead of what changes per request, so the prompt's prefix stays cached.
        assert text.index("ΣΗΜΕΙΩΣΗ") < text.index("The editor is on")
