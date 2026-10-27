// The πίνακας τιμών (trace table) built from a traced run's steps (/run with trace: true).
import type { TraceStep } from "./types";

/** One variable (or array element, `Π[2, 3]`) of one program unit: a column of the table. */
export type TraceColumn = {
  key: string;
  scope: string;
  name: string;
};

const columnKey = (scope: string, name: string) => `${scope}\u0000${name}`;

/** `Π[2, 3]` → `Π`; a plain name stays as it is. */
export function arrayOf(name: string): string | null {
  const bracket = name.indexOf("[");
  return bracket > 0 ? name.slice(0, bracket) : null;
}

/**
 * The table's variable columns, in the order they first get a value, as a student
 * adds them on paper. An array's elements stay side by side: a new element goes
 * right after the last one of the same array.
 */
export function traceColumns(trace: TraceStep[]): TraceColumn[] {
  const columns: TraceColumn[] = [];
  const seen = new Set<string>();
  for (const step of trace) {
    for (const name of Object.keys(step.changes)) {
      const key = columnKey(step.scope, name);
      if (seen.has(key)) continue;
      seen.add(key);
      const column = { key, scope: step.scope, name };
      const array = arrayOf(name);
      let at = -1;
      if (array !== null) {
        columns.forEach((c, i) => {
          if (c.scope === step.scope && arrayOf(c.name) === array) at = i;
        });
      }
      if (at === -1) columns.push(column);
      else columns.splice(at + 1, 0, column);
    }
  }
  return columns;
}

/** The value a step gave each column, or undefined where it left it unchanged. */
export function changeAt(step: TraceStep, column: TraceColumn): string | undefined {
  return step.scope === column.scope ? step.changes[column.name] : undefined;
}

/**
 * Every column's value after each step, carried forward from the step that set
 * it (undefined until the first one), for «Όλες οι τιμές» and the current values.
 */
export function valuesAfter(trace: TraceStep[], columns: TraceColumn[]): (string | undefined)[][] {
  const current: (string | undefined)[] = columns.map(() => undefined);
  return trace.map((step) => {
    columns.forEach((column, i) => {
      const value = changeAt(step, column);
      if (value !== undefined) current[i] = value;
    });
    return [...current];
  });
}

/** The program units the columns belong to, in order, with how many columns each spans. */
export function scopeGroups(columns: TraceColumn[]): { scope: string; span: number }[] {
  const groups: { scope: string; span: number }[] = [];
  for (const column of columns) {
    const last = groups.at(-1);
    if (last && last.scope === column.scope) last.span++;
    else groups.push({ scope: column.scope, span: 1 });
  }
  return groups;
}

/** A condition's value as the table writes it. */
export function conditionText(condition: boolean | null): string {
  if (condition === null) return "";
  return condition ? "ΑΛΗΘΗΣ" : "ΨΕΥΔΗΣ";
}

/** Line `line` (1-based) of `code`, trimmed, for the table's «Εντολή» column. */
export function sourceLine(code: string, line: number): string {
  return (code.split("\n")[line - 1] ?? "").trim();
}

/**
 * The screen as it was after `step` (the slow run shows it growing): the run's `output`
 * cut to the lines written so far, the last one to the characters written so far
 * (a ΓΡΑΨΕ ending in a space keeps its line open for the next).
 */
export function screenAt(output: string[], trace: TraceStep[], step: number): string[] {
  let lines = 0;
  let chars = 0;
  for (const s of trace.slice(0, step + 1)) {
    if (s.output.length === 0) continue;
    lines = s.lines;
    for (const text of s.output) chars += text.length;
  }
  const screen = output.slice(0, lines);
  const before = screen.slice(0, -1).reduce((sum, line) => sum + line.length, 0);
  if (screen.length > 0) screen[screen.length - 1] = screen[screen.length - 1].slice(0, chars - before);
  return screen;
}

/** What a step did, in short, for the editor's inline note: «x = 5, y = 2 · ΑΛΗΘΗΣ». */
export function stepSummary(step: TraceStep): string {
  const changes = Object.entries(step.changes).map(([name, value]) => `${name} = ${value}`);
  return [changes.join(", "), conditionText(step.condition)].filter(Boolean).join(" · ");
}
