from agents import RunConfig, Usage

from app.agent.context import AgentContext, splits_declarations
from app.agent.stream import report_reply
from app.agent.tools import MAX_EDITS_PER_REPLY, _allows_splits, _review, _write

GOOD = "ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\n  ΓΡΑΨΕ 1 ! ένα\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"
BAD = "ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\n  x = 1\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"


def write(context: AgentContext, code: str, summary: str = "Αλλαγή.", asked: bool = False) -> str:
    allow = _allows_splits(context, asked)
    return _write(context, code, summary, _review(code, context.language, allow))


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


def test_write_code_refuses_a_type_declared_on_two_lines() -> None:
    split = (
        "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i, j\n  ΠΡΑΓΜΑΤΙΚΕΣ: μ\n  ΑΚΕΡΑΙΕΣ: Κ[3]\n"
        "ΑΡΧΗ\n  i <- 1\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"
    )
    context = AgentContext(code="", mode="agent")
    assert write(context, split).startswith("Not written: Α declares ΑΚΕΡΑΙΕΣ on lines 3, 5.")
    assert context.edits == []
    # One line per type in each unit; a subprogram may repeat the main program's types.
    grouped = (
        "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i, j, Κ[3]\nΑΡΧΗ\n  i <- Δ(1)\n"
        "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n\nΣΥΝΑΡΤΗΣΗ Δ(x): ΑΚΕΡΑΙΑ\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x\n"
        "ΑΡΧΗ\n  Δ <- x\nΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ"
    )
    assert "γράφτηκε" in write(context, grouped)
    # A list that goes on after & is still one declaration.
    continued = (
        "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i, j,\n  & Κ[3]\nΑΡΧΗ\n  i <- 1\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"
    )
    assert "γράφτηκε" in write(context, continued)
    # The student's own split declarations are their style to keep.
    student = AgentContext(code=split, mode="agent")
    assert "γράφτηκε" in write(student, split.replace("i <- 1", "i <- 2"))
    # Also while their program has an error the agent is asked to fix.
    broken = AgentContext(code=split.replace("i <- 1", "i = 1"), mode="agent")
    assert broken.student_splits and "γράφτηκε" in write(broken, split)
    # Or when they asked for that layout.
    assert "split_declarations=true" in write(AgentContext(code="", mode="agent"), split)
    assert "γράφτηκε" in write(AgentContext(code="", mode="agent"), split, asked=True)


def test_split_declarations_are_counted_per_unit() -> None:
    # A subprogram may repeat the main program's types; accents and case don't matter.
    assert not splits_declarations(
        "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\n"
        "ΔΙΑΔΙΚΑΣΙΑ Β(x)\nΜΕΤΑΒΛΗΤΕΣ\n  ακέραιες: x\nΑΡΧΗ\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ"
    )
    assert splits_declarations("ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i\n  ακέραιες : Κ[3]")
    # A comment that mentions a type isn't a declaration.
    assert not splits_declarations("ΠΡΟΓΡΑΜΜΑ Α\n  ΑΚΕΡΑΙΕΣ: i\n  ! ΑΚΕΡΑΙΕΣ: Κ[3]")


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


def test_the_reply_log_reads_fields_that_exist() -> None:
    # stream_reply logs every reply before charging it; an SDK upgrade must not break this.
    report_reply("done", AgentContext(code="", mode="ask"), Usage(), RunConfig(model="m"), 0.0)
