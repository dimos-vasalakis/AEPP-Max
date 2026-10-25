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
  condition: boolean | null;
};

export type RunResult = {
  status: RunStatus;
  output: string[];
  error: ErrorInfo | null;
  trace: TraceStep[] | null;
  trace_truncated: boolean;
  steps: number;
};
