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
 * Every column's value after each step from `first` to `end`, carried forward from the
 * step that set it (undefined until the first one), for «Όλες οι τιμές». It keeps only
 * those rows: a whole table can be 5,000 steps of 1,000 columns.
 */
export function valuesAfter(
  trace: TraceStep[],
  columns: TraceColumn[],
  first = 0,
  end = trace.length - 1,
): (string | undefined)[][] {
  const current = new Map<string, string>();
  const rows: (string | undefined)[][] = [];
  for (let i = 0; i <= end && i < trace.length; i++) {
    const step = trace[i];
    for (const [name, value] of Object.entries(step.changes)) {
      current.set(columnKey(step.scope, name), value);
    }
    if (i >= first) rows.push(columns.map((column) => current.get(column.key)));
  }
  return rows;
}

// What the table draws at most: every cell is a DOM node, and each step redraws them.
const MAX_CELLS = 20_000;
const MAX_COLUMNS = 60;
const WIDE_ROWS = 60;
/** One step can change thousands of cells: a procedure writing back a whole array. */
const MAX_CHANGED_CELLS = 2_000;
/** A row's cells besides the variables: #, Γρ., Εντολή, Συνθήκη, Οθόνη. */
const ROW_CELLS = 5;

/** The part of the table to draw at `step`. */
export type TableWindow = {
  /** The first row drawn; the rows before it are left out. */
  first: number;
  columns: TraceColumn[];
  /** The current step changed more array cells than the table draws: it shows the first ones. */
  capped: boolean;
};

/**
 * Which rows and columns the table draws at `step`, so a big one can't freeze the tab: the
 * latest rows that fit in MAX_CELLS. Past MAX_COLUMNS (big arrays) at most WIDE_ROWS rows, and
 * of the arrays only the elements that changed in them; the current row is always drawn.
 */
export function tableWindow(trace: TraceStep[], columns: TraceColumn[], step: number): TableWindow {
  if (columns.length <= MAX_COLUMNS) {
    const rows = Math.floor(MAX_CELLS / (columns.length + ROW_CELLS));
    return { first: Math.max(0, step + 1 - rows), columns, capped: false };
  }
  const plain = columns.filter((c) => arrayOf(c.name) === null).length;
  const changed = new Set<string>();
  let first = step;
  let capped = false;
  for (let i = step; i >= 0 && step - i < WIDE_ROWS; i--) {
    const s = trace[i];
    if (!s) continue;
    const fresh = Object.keys(s.changes)
      .filter((name) => arrayOf(name) !== null)
      .map((name) => columnKey(s.scope, name))
      .filter((key) => !changed.has(key));
    // An older row that doesn't fit whole stays out: drawn without its cells, it would seem to
    // have changed nothing. Only the current row, which is always drawn, can be cut.
    if (i < step && changed.size + fresh.length > MAX_CHANGED_CELLS) break;
    const rows = step - i + 1;
    const cells = rows * (plain + changed.size + fresh.length + ROW_CELLS);
    if (i < step && cells > MAX_CELLS) break;
    if (i === step) capped = fresh.length > MAX_CHANGED_CELLS;
    for (const key of fresh.slice(0, MAX_CHANGED_CELLS)) changed.add(key);
    first = i;
  }
  return {
    first,
    columns: columns.filter((c) => arrayOf(c.name) === null || changed.has(c.key)),
    capped,
  };
}

/** Marks where a framed algorithm's own code starts (algorithms.json): what comes before only prepares it. */
export const PART_MARKER = "! Το τμήμα προγράμματος:";

/**
 * The step a run should open on: 0, or for a framed algorithm the first step of its own
 * code, so a student doesn't sit through thousands of steps of sample values first. If the
 * run stopped before it (a ΔΙΑΒΑΣΕ in the frame), the last step, where it waits.
 */
export function partStart(code: string, trace: TraceStep[]): number {
  const marker = code.split("\n").findIndex((line) => line.trim() === PART_MARKER);
  if (marker === -1) return 0;
  const at = trace.findIndex((step) => step.line > marker + 1);
  return at === -1 ? Math.max(0, trace.length - 1) : at;
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
    lines = s.lines ?? lines; // missing from a backend older than the field
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
