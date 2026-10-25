import { type Diagnostic, linter, setDiagnosticsEffect } from "@codemirror/lint";
import { RangeSet, type Text, StateField } from "@codemirror/state";
import { GutterMarker, lineNumberMarkers } from "@codemirror/view";
import { apiFetch } from "@/lib/api/client";
import { editorLanguage } from "./editorLanguage";
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

class ErrorLineMarker extends GutterMarker {
  elementClass = "cm-errorLineNumber";
}
const errorLineMarker = new ErrorLineMarker();

/** Turns the number of a line with an error red (styled in globals.css). */
const errorLineNumbers = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(markers, tr) {
    markers = markers.map(tr.changes);
    for (const effect of tr.effects) {
      if (!effect.is(setDiagnosticsEffect)) continue;
      const starts = new Set(
        effect.value.map((d) => tr.newDoc.lineAt(Math.min(d.from, tr.newDoc.length)).from),
      );
      markers = RangeSet.of([...starts].sort((a, b) => a - b).map((from) => errorLineMarker.range(from)));
    }
    return markers;
  },
  provide: (field) => lineNumberMarkers.from(field),
});

/**
 * Marks syntax errors while the student types. Half a second after they stop,
 * the code goes to the backend's parser (POST /check), the same one /run uses,
 * so the editor and Εκτέλεση never disagree. No AI is involved.
 */
export const glossaLinter = [
  errorLineNumbers,
  linter(
    async (view) => {
      const doc = view.state.doc;
      // The editor starts blank: an empty program isn't a mistake worth a red mark.
      if (!doc.toString().trim()) return [];
      try {
        const { error } = await apiFetch<{ error: ErrorInfo | null }>("/check", {
          method: "POST",
          body: JSON.stringify({
            code: doc.toString(),
            language: view.state.facet(editorLanguage),
          }),
        });
        const diagnostic = error && toDiagnostic(doc, error);
        return diagnostic ? [diagnostic] : [];
      } catch {
        return []; // backend unreachable: show nothing rather than a false error
      }
    },
    { delay: 500 },
  ),
];
