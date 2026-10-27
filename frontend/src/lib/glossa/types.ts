// Mirrors backend/app/glossa/result.py (the /run response). Change both together.

/** What the editor holds: a ΓΛΩΣΣΑ program (Πρόγραμμα) or a ψευδογλώσσα algorithm (Αλγόριθμος). */
export type Language = "glossa" | "pseudocode";

export type RunStatus = "ok" | "error" | "needs_input" | "limit";

export type ErrorInfo = {
  kind: "syntax" | "runtime";
  message: string;
  line: number | null;
  /** 1-based columns of the offending token on `line`; end is exclusive. */
  column: number | null;
  end_column: number | null;
};

export type TraceStep = {
  line: number;
  scope: string;
  changes: Record<string, string>;
  output: string[];
  /** With output: the screen's lines after this step (the last may still be open); 0 without. */
  lines: number;
  condition: boolean | null;
  /** How deep in calls (0: the program), and which call (0: the program, then in the order calls start). */
  depth: number;
  call: number;
  /** A call's first row: each array parameter → the caller's array it is a copy of. */
  copied: Record<string, string>;
};

/** A variable as Μεταβλητές shows it. */
export type Variable = {
  name: string;
  /** ΑΚΕΡΑΙΑ, …; null in ψευδογλώσσα, where nothing is declared. */
  type: string | null;
  /** As ΓΡΑΨΕ shows it; null while it has none, and for arrays. */
  value: string | null;
  /** An array's sizes; [] for a ψευδογλώσσα array (no size); null for a scalar. */
  dims: number[] | null;
  /** An array's elements that have a value, labelled as the trace does: "Π[2, 3]" → value. */
  cells: Record<string, string> | null;
  /** Too many to send: only the first ones are in `cells`. */
  cells_truncated: boolean;
};

/** A program unit's variables: one running call of it, or (RunResult.units) its declarations. */
export type Frame = {
  /** The unit's name, as TraceStep.scope. */
  scope: string;
  /** «ΠΡΟΓΡΑΜΜΑ Πρόσθεση», «ΣΥΝΑΡΤΗΣΗ Μέσος», «Αλγόριθμος Χ». */
  title: string;
  variables: Variable[];
};

export type RunResult = {
  status: RunStatus;
  output: string[];
  error: ErrorInfo | null;
  trace: TraceStep[] | null;
  trace_truncated: boolean;
  steps: number;
  /** needs_input: the line of the ΔΙΑΒΑΣΕ waiting for a value. */
  input_line: number | null;
  /** The calls running when it stopped, the program first, with their variables' values. */
  frames: Frame[];
  /** Traced runs only: each unit that ran, with its declared variables (no values). */
  units: Frame[];
};
