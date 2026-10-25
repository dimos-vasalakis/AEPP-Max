import { type Diagnostic, linter, lintGutter } from "@codemirror/lint";
import type { Text } from "@codemirror/state";
import { apiFetch } from "@/lib/api/client";
import type { ErrorInfo } from "./types";

/**
 * Where to draw an error. Columns come from the backend's lexer (1-based code
 * points); for Greek text that equals CodeMirror's UTF-16 offsets.
 */
export function toDiagnostic(doc: Text, error: ErrorInfo): Diagnostic | null {
  if (error.line === null || error.line < 1) return null;
  const line = doc.line(Math.min(error.line, doc.lines));
  const clamp = (pos: number) => Math.max(line.from, Math.min(pos, line.to));
  let from = clamp(line.from + (error.column ?? 1) - 1);
  let to = clamp(line.from + (error.end_column ?? error.column ?? 1) - 1);
  if (to <= from) {
    // The error points at the end of the line (e.g. a missing ΤΟΤΕ): mark the line's text.
    from = line.from + (line.text.length - line.text.trimStart().length);
    to = line.to;
  }
  return { from, to, severity: "error", message: error.message, source: "ΓΛΩΣΣΑ" };
}

/**
 * Marks syntax errors while the student types. Half a second after they stop,
 * the code goes to the backend's parser (POST /check), the same one /run uses,
 * so the editor and Εκτέλεση never disagree. No AI is involved.
 */
export const glossaLinter = [
  linter(
    async (view) => {
      const doc = view.state.doc;
      try {
        const { error } = await apiFetch<{ error: ErrorInfo | null }>("/check", {
          method: "POST",
          body: JSON.stringify({ code: doc.toString() }),
        });
        const diagnostic = error && toDiagnostic(doc, error);
        return diagnostic ? [diagnostic] : [];
      } catch {
        return []; // backend unreachable: show nothing rather than a false error
      }
    },
    { delay: 500 },
  ),
  lintGutter(),
];
