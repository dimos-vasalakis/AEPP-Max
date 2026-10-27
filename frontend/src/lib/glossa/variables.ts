// Μεταβλητές: each running call's variables and their values, where a run stopped
// (RunResult.frames) or at a step of the πίνακας τιμών (rebuilt from the trace).
import { arrayOf } from "./trace";
import type { Frame, TraceStep, Variable } from "./types";

/** A variable's row; an array's elements are rows of their own under it. */
export type VariableRow = {
  name: string;
  type: string | null;
  /** undefined: no value yet (and for an array). */
  value: string | undefined;
  /** The step on screen gave it (or, for an array, one of its elements) its value. */
  changed: boolean;
  /** An array's sizes ([] when it has none, in ψευδογλώσσα) and elements. */
  dims?: number[];
  elements?: VariableRow[];
  /** Elements left out: past MAX_ELEMENTS. */
  more?: boolean;
  /** The server didn't send every value: an element shown blank may have one. */
  partial?: boolean;
};

/** One running call: the «Κλήσεις» list's entry and its rows. */
export type FrameView = {
  /** Stable while the call runs, so a picked call stays picked. */
  key: string;
  title: string;
  rows: VariableRow[];
};

/** Elements listed per array; a bigger one says the rest are left out. */
export const MAX_ELEMENTS = 500;

/** `Π[2, 3]`, as the interpreter labels elements. */
export function elementLabel(name: string, indices: number[]): string {
  return `${name}[${indices.join(", ")}]`;
}

/** An element label's indices: `Π[2, 3]` → [2, 3]. */
function indicesOf(label: string): number[] {
  return label
    .slice(label.indexOf("[") + 1, -1)
    .split(",")
    .map(Number);
}

function compareIndices(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

/** The labels of an array of size `dims`, row by row, at most MAX_ELEMENTS of them. */
function labels(name: string, dims: number[]): string[] {
  const out: string[] = [];
  const at = dims.map(() => 1);
  while (out.length < MAX_ELEMENTS) {
    out.push(elementLabel(name, at));
    let d = dims.length - 1;
    while (d >= 0 && at[d] === dims[d]) at[d--] = 1;
    if (d < 0) break;
    at[d]++;
  }
  return out;
}

/**
 * The rows of one call: the declared variables first, in their order, then any
 * other name that got a value (all of them in ψευδογλώσσα, which declares nothing).
 */
export function frameRows(
  declared: Variable[],
  values: Map<string, string>,
  changed: ReadonlySet<string> = new Set(),
  truncated: ReadonlySet<string> = new Set(),
): VariableRow[] {
  const rows: VariableRow[] = [];
  const arrays = new Map<string, VariableRow>();
  const element = (label: string): VariableRow => ({
    name: label,
    type: null,
    value: values.get(label),
    changed: changed.has(label),
  });

  for (const v of declared) {
    if (v.dims === null) {
      const value = values.get(v.name);
      rows.push({ name: v.name, type: v.type, value, changed: changed.has(v.name) });
      continue;
    }
    const size = v.dims.reduce((a, b) => a * b, 1);
    const elements = v.dims.length > 0 ? labels(v.name, v.dims).map(element) : [];
    const row: VariableRow = {
      name: v.name,
      type: v.type,
      value: undefined,
      changed: false,
      dims: v.dims,
      elements,
      more: v.dims.length > 0 && size > MAX_ELEMENTS,
      partial: truncated.has(v.name),
    };
    rows.push(row);
    // A sized array has all its elements already; one without a size gets them below.
    if (v.dims.length === 0) arrays.set(v.name, row);
  }

  const listed = new Set(declared.map((v) => v.name));
  for (const name of values.keys()) {
    const array = arrayOf(name);
    if (array === null) {
      if (!listed.has(name)) {
        listed.add(name);
        rows.push({ name, type: null, value: values.get(name), changed: changed.has(name) });
      }
      continue;
    }
    let row = arrays.get(array);
    if (row === undefined) {
      if (listed.has(array)) continue; // a sized array: its element is already there
      listed.add(array);
      row = { name: array, type: null, value: undefined, changed: false, dims: [], elements: [] };
      arrays.set(array, row);
      rows.push(row);
    }
    row.elements!.push(element(name));
  }

  for (const row of arrays.values()) {
    row.elements!.sort((a, b) => compareIndices(indicesOf(a.name), indicesOf(b.name)));
    if (row.elements!.length > MAX_ELEMENTS) {
      row.elements!.length = MAX_ELEMENTS;
      row.more = true;
    }
  }
  for (const row of rows) {
    if (row.elements?.some((e) => e.changed)) row.changed = true;
  }
  return rows;
}

/** The calls running where the run stopped, from the server's snapshot. */
export function snapshotFrames(frames: Frame[]): FrameView[] {
  return frames.map((frame, depth) => {
    const values = new Map<string, string>();
    const truncated = new Set<string>();
    for (const v of frame.variables) {
      if (v.value !== null) values.set(v.name, v.value);
      for (const [label, value] of Object.entries(v.cells ?? {})) values.set(label, value);
      if (v.cells_truncated) truncated.add(v.name);
    }
    return {
      key: `${depth}:${frame.scope}`,
      title: frame.title,
      rows: frameRows(frame.variables, values, undefined, truncated),
    };
  });
}

/**
 * The calls running after trace step `step`, rebuilt from the steps up to it: each
 * step belongs to the call `depth` levels deep, and a new `call` number there is a
 * new call (its variables start empty). `units` lists each unit's declarations.
 */
export function framesAtStep(trace: TraceStep[], step: number, units: Frame[]): FrameView[] {
  type Running = { scope: string; call: number; values: Map<string, string> };
  const stack: Running[] = [];
  const last = Math.min(step, trace.length - 1);
  for (let i = 0; i <= last; i++) {
    const s = trace[i];
    const here = stack[s.depth];
    if (here === undefined || here.call !== s.call) {
      const values = new Map<string, string>();
      // An array parameter starts as a copy of the caller's array.
      const caller = stack[s.depth - 1];
      for (const [param, source] of Object.entries(s.copied ?? {})) {
        for (const [label, value] of caller?.values ?? []) {
          if (arrayOf(label) === source) values.set(param + label.slice(source.length), value);
        }
      }
      stack[s.depth] = { scope: s.scope, call: s.call, values };
    }
    stack.length = s.depth + 1;
    for (const [name, value] of Object.entries(s.changes)) stack[s.depth].values.set(name, value);
  }
  const current = trace[last];
  return stack
    .filter((running) => running !== undefined)
    .map((running) => {
      const unit = units.find((u) => u.scope === running.scope);
      const isCurrent = current !== undefined && running.call === current.call;
      const changed = new Set(isCurrent ? Object.keys(current.changes) : []);
      return {
        key: `${running.call}`,
        title: unit?.title ?? running.scope,
        rows: frameRows(unit?.variables ?? [], running.values, changed),
      };
    });
}

/** The way a declared type reads next to a variable: ΑΚΕΡΑΙΑ → ακέραια. */
export const TYPE_WORD: Record<string, string> = {
  ΑΚΕΡΑΙΑ: "ακέραια",
  ΠΡΑΓΜΑΤΙΚΗ: "πραγματική",
  ΧΑΡΑΚΤΗΡΑΣ: "χαρακτήρες",
  ΛΟΓΙΚΗ: "λογική",
};
