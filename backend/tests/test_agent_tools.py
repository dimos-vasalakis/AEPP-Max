from app import glossa
from app.agent.context import AgentContext
from app.agent.tools import MAX_EDITS_PER_REPLY, _write

GOOD = "ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\n  ΓΡΑΨΕ 1 ! ένα\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"
BAD = "ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\n  x = 1\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"


def write(context: AgentContext, code: str, summary: str = "Αλλαγή.") -> str:
    return _write(context, code, summary, glossa.check(code, context.language))


def test_write_code_reaches_the_editor() -> None:
    context = AgentContext(code="", mode="agent")
    assert "γράφτηκε" in write(context, GOOD)
    assert context.code == GOOD
    assert [edit.code for edit in context.edits] == [GOOD]


def test_write_code_refuses_code_that_does_not_compile() -> None:
    context = AgentContext(code="παλιό", mode="agent")
    reply = write(context, BAD)
    assert reply.startswith("Not written, it doesn't compile (line 3)")
    assert context.edits == [] and context.code == "παλιό"


def test_write_code_refuses_empty_code_and_follows_the_language() -> None:
    context = AgentContext(code="", mode="agent")
    assert "empty" in write(context, "  \n")
    # A ΓΛΩΣΣΑ program isn't an algorithm.
    algorithm = AgentContext(code="", mode="agent", language="pseudocode")
    assert write(algorithm, GOOD).startswith("Not written")
    assert context.edits == [] and algorithm.edits == []


def test_write_code_caps_the_edits_in_one_reply() -> None:
    context = AgentContext(code="", mode="agent")
    for _ in range(MAX_EDITS_PER_REPLY):
        write(context, GOOD)
    assert "at most" in write(context, GOOD)
    assert len(context.edits) == MAX_EDITS_PER_REPLY
