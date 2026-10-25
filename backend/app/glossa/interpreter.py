from app.glossa.nodes import Program
from app.glossa.result import RunLimits, RunResult


def execute(program: Program, inputs: list[str], *, limits: RunLimits, trace: bool) -> RunResult:
    """Run a parsed program.

    - ΔΙΑΒΑΣΕ consumes `inputs` in order and converts each to the variable's
      type; once they run out, stop with status "needs_input" and the output
      so far.
    - Count steps and check the clock every few hundred steps; past
      limits.max_steps or limits.timeout_seconds stop with status "limit" (this
      runs in a worker thread that can't be killed, so the loop must stop itself).
    - With trace=True, record a TraceStep per executed statement, up to
      limits.max_trace_steps (then set trace_truncated and keep running).
    - Runtime errors (uninitialized variable, division by zero, index out of
      bounds, type mismatch, ...) end the run with status "error".
    """
    raise NotImplementedError("ΓΛΩΣΣΑ interpreter")
