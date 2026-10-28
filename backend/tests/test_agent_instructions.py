from types import SimpleNamespace

from app.agent.context import AgentContext
from app.agent.instructions import EXAMPLE, instructions
from app.agent.tools import _review


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


def test_the_example_program_passes_write_code() -> None:
    example = EXAMPLE.split("```\n")[1]
    assert example.startswith("ΠΡΟΓΡΑΜΜΑ") and _review(example, "glossa") is None


def test_only_the_agent_on_programs_sees_the_worked_example() -> None:
    # The Tutor gives hints before solutions, and an Αλγόριθμος isn't written this way.
    assert "ΠΡΟΓΡΑΜΜΑ Καταναλώσεις" in prompt(AgentContext(code="", mode="agent"))
    assert "Καταναλώσεις" not in prompt(AgentContext(code="", mode="ask"))
    algorithm = AgentContext(code="", mode="agent", language="pseudocode")
    assert "Καταναλώσεις" not in prompt(algorithm)
