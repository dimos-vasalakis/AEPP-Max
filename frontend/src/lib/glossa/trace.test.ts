import { describe, expect, it } from "vitest";
import {
  arrayOf,
  changeAt,
  conditionText,
  PART_MARKER,
  partStart,
  scopeGroups,
  screenAt,
  sourceLine,
  stepSummary,
  tableWindow,
  traceColumns,
  valuesAfter,
} from "./trace";
import type { TraceStep } from "./types";

const step = (
  line: number,
  changes: Record<string, string> = {},
  extra: Partial<TraceStep> = {},
): TraceStep => ({
  line,
  scope: "Κύριο",
  changes,
  output: [],
  lines: 0,
  condition: null,
  depth: 0,
  call: 0,
  copied: {},
  ...extra,
});

const names = (trace: TraceStep[]) => traceColumns(trace).map((c) => `${c.scope}.${c.name}`);

describe("traceColumns", () => {
  it("lists variables in the order they first get a value, once each", () => {
    const trace = [step(3, { x: "1" }), step(4, { y: "2" }), step(5, { x: "3" })];
    expect(names(trace)).toEqual(["Κύριο.x", "Κύριο.y"]);
  });

  it("keeps an array's elements side by side", () => {
    const trace = [step(3, { "Π[1]": "4" }), step(4, { i: "2" }), step(5, { "Π[2]": "5" })];
    expect(names(trace)).toEqual(["Κύριο.Π[1]", "Κύριο.Π[2]", "Κύριο.i"]);
  });

  it("gives a subprogram's variables their own columns, even with the same name", () => {
    const trace = [step(3, { x: "1" }), step(9, { x: "7" }, { scope: "Διπλάσιο" })];
    expect(names(trace)).toEqual(["Κύριο.x", "Διπλάσιο.x"]);
  });

  it("is empty without changes", () => {
    expect(traceColumns([step(3), step(4)])).toEqual([]);
  });
});

describe("arrayOf", () => {
  it("finds the array of an element", () => {
    expect(arrayOf("Π[2, 3]")).toBe("Π");
    expect(arrayOf("x")).toBeNull();
  });
});

describe("valuesAfter", () => {
  it("carries each value forward from the step that set it", () => {
    const trace = [step(3, { x: "1" }), step(4, { y: "2" }), step(5, { x: "3" })];
    const values = valuesAfter(trace, traceColumns(trace));
    expect(values).toEqual([
      ["1", undefined],
      ["1", "2"],
      ["3", "2"],
    ]);
  });

  it("only takes a change from the column's own unit", () => {
    const trace = [step(3, { x: "1" }), step(9, { x: "7" }, { scope: "Διπλάσιο" })];
    const columns = traceColumns(trace);
    expect(changeAt(trace[1], columns[0])).toBeUndefined();
    expect(valuesAfter(trace, columns).at(-1)).toEqual(["1", "7"]);
  });
});

describe("valuesAfter, for part of the table", () => {
  it("carries values from before the rows it returns", () => {
    const trace = [step(1, { x: "1" }), step(2, { y: "2" }), step(3, { x: "3" }), step(4)];
    const columns = traceColumns(trace);
    expect(valuesAfter(trace, columns, 2, 3)).toEqual([
      ["3", "2"],
      ["3", "2"],
    ]);
  });

  it("fills a 5,000 × 1,100 table's last rows at once", () => {
    const trace = Array.from({ length: 5000 }, (_, i) => step(1, { [`Α[${i % 1100}]`]: `${i}` }));
    const columns = traceColumns(trace);
    expect(columns).toHaveLength(1100);
    const started = performance.now();
    expect(valuesAfter(trace, columns, 4990, 4999)).toHaveLength(10);
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe("tableWindow", () => {
  const arrays = (rows: number, cells: number) =>
    Array.from({ length: rows }, (_, i) => step(1, { i: `${i}`, [`Α[${i % cells}]`]: `${i}` }));

  it("draws a small table whole", () => {
    const trace = arrays(50, 5);
    const columns = traceColumns(trace);
    expect(tableWindow(trace, columns, 49)).toEqual({ first: 0, columns, capped: false });
  });

  const variables = (rows: number, count: number) =>
    Array.from({ length: rows }, (_, i) =>
      step(1, Object.fromEntries(Array.from({ length: count }, (_, j) => [`v${j}`, `${i}`]))),
    );
  // Every cell of a row counts: the variables, and #, Γρ., Εντολή, Συνθήκη, Οθόνη.
  const cells = (rows: number, columns: number) => rows * (columns + 5);

  it("keeps a long table of a few variables to the rows that fit, its latest", () => {
    const trace = variables(5000, 3);
    const columns = traceColumns(trace);
    const window = tableWindow(trace, columns, 4999);
    expect(window.first).toBe(2500);
    expect(window.columns).toEqual(columns);
    expect(cells(5000 - window.first, columns.length)).toBeLessThanOrEqual(20_000);
  });

  it("keeps a table of many variables under the cap too, with all its columns", () => {
    const trace = variables(5000, 40);
    const columns = traceColumns(trace);
    const window = tableWindow(trace, columns, 4999);
    expect(window.first).toBeGreaterThan(0);
    expect(window.columns).toEqual(columns);
    expect(cells(5000 - window.first, columns.length)).toBeLessThanOrEqual(20_000);
  });

  it("leaves out array cells only past 60 columns", () => {
    const at = (count: number) => {
      const trace = Array.from({ length: count }, (_, i) => step(1, { [`Α[${i}]`]: "1" }));
      return tableWindow(trace, traceColumns(trace), 0).columns.length;
    };
    expect(at(60)).toBe(60);
    expect(at(61)).toBe(1);
  });

  it("stays under the cap when a procedure writes back a whole array", () => {
    const writeBack = Object.fromEntries(Array.from({ length: 2400 }, (_, i) => [`Α[${i}]`, "1"]));
    const trace = [...arrays(100, 3), step(9, writeBack), ...arrays(50, 3)];
    const columns = traceColumns(trace);
    expect(columns.length).toBeGreaterThan(2400);
    for (const at of [100, 110, 149]) {
      const window = tableWindow(trace, columns, at);
      expect(cells(at + 1 - window.first, window.columns.length)).toBeLessThanOrEqual(20_000);
      expect(window.first).toBeLessThanOrEqual(at);
    }
    // On that very step it is drawn, however many cells it changed.
    const onIt = tableWindow(trace, columns, 100);
    expect(onIt.first).toBeLessThanOrEqual(100);
    expect(onIt.columns.length).toBeGreaterThanOrEqual(2000);
  });

  it("cuts only the current row, says so, and never draws an older row without its cells", () => {
    const writeBack = Object.fromEntries(Array.from({ length: 2150 }, (_, i) => [`Β[${i}]`, "1"]));
    const trace = [...arrays(100, 3), step(9, writeBack), ...arrays(50, 3)];
    const columns = traceColumns(trace);

    // On the write-back: the first 2,000 of its cells, it alone, and the table says so.
    const onIt = tableWindow(trace, columns, 100);
    expect(onIt.capped).toBe(true);
    expect(onIt.first).toBe(100);

    // After it: the rows since, each with its cell, and the write-back left out whole.
    const after = tableWindow(trace, columns, 105);
    expect(after.capped).toBe(false);
    expect(after.first).toBe(101);
    for (const row of trace.slice(after.first, 106)) {
      for (const name of Object.keys(row.changes)) {
        expect(after.columns.map((c) => c.name)).toContain(name);
      }
    }
  });

  it("isn't capped at exactly 2,000 changed cells", () => {
    const writeBack = Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [`Α[${i}]`, "1"]));
    const trace = [step(9, writeBack)];
    expect(tableWindow(trace, traceColumns(trace), 0).capped).toBe(false);
  });

  it("past 60 columns draws only the elements the last rows changed, and every plain variable", () => {
    const trace = arrays(5000, 1100);
    const window = tableWindow(trace, traceColumns(trace), 4999);
    expect(window.first).toBe(4940);
    expect(window.columns.map((c) => c.name)).toContain("i");
    expect(window.columns).toHaveLength(61);
    expect((5000 - window.first) * window.columns.length).toBeLessThanOrEqual(20_000);
  });

  it("follows the step back", () => {
    const trace = arrays(5000, 1100);
    const window = tableWindow(trace, traceColumns(trace), 10);
    expect(window.first).toBe(0);
    expect(window.columns).toHaveLength(12);
  });
});

describe("partStart", () => {
  const code = ["ΑΡΧΗ", "  Χ <- 1", `  ${PART_MARKER}`, "  ΓΡΑΨΕ Χ"].join("\n");

  it("is the first step of an algorithm's own code", () => {
    expect(partStart(code, [step(2), step(2), step(4), step(2)])).toBe(2);
  });

  it("is the last step when the run stopped before it", () => {
    expect(partStart(code, [step(2), step(2)])).toBe(1);
  });

  it("is 0 without the marker, and for no steps at all", () => {
    expect(partStart("ΑΡΧΗ\n  ΓΡΑΨΕ 1", [step(2), step(2)])).toBe(0);
    expect(partStart(code, [])).toBe(0);
  });
});

describe("scopeGroups", () => {
  it("spans each unit's columns", () => {
    const trace = [step(3, { x: "1", y: "2" }), step(9, { α: "1" }, { scope: "Αντιμετάθεση" })];
    expect(scopeGroups(traceColumns(trace))).toEqual([
      { scope: "Κύριο", span: 2 },
      { scope: "Αντιμετάθεση", span: 1 },
    ]);
  });
});

describe("text", () => {
  it("writes conditions as the textbook does", () => {
    expect(conditionText(true)).toBe("ΑΛΗΘΗΣ");
    expect(conditionText(false)).toBe("ΨΕΥΔΗΣ");
    expect(conditionText(null)).toBe("");
  });

  it("takes a source line, trimmed", () => {
    expect(sourceLine("ΑΡΧΗ\n  x <- 1\nΤΕΛΟΣ", 2)).toBe("x <- 1");
    expect(sourceLine("ΑΡΧΗ", 5)).toBe("");
  });

  it("sums up a step for the editor", () => {
    expect(stepSummary(step(3, { x: "1", y: "2" }))).toBe("x = 1, y = 2");
    expect(stepSummary(step(3, { i: "1" }, { condition: true }))).toBe("i = 1 · ΑΛΗΘΗΣ");
    expect(stepSummary(step(3, {}, { condition: false }))).toBe("ΨΕΥΔΗΣ");
    expect(stepSummary(step(3))).toBe("");
  });
});

describe("screenAt", () => {
  // ΓΡΑΨΕ 'α ' · x <- 1 · ΓΡΑΨΕ 'β' · ΓΡΑΨΕ 'γ': the first line stays open for «β».
  const output = ["αβ", "γ"];
  const trace = [
    step(1, {}, { output: ["α"], lines: 1 }),
    step(2, { x: "1" }),
    step(3, {}, { output: ["β"], lines: 1 }),
    step(4, {}, { output: ["γ"], lines: 2 }),
  ];

  it("shows the screen as it was after each step", () => {
    expect([0, 1, 2, 3].map((i) => screenAt(output, trace, i))).toEqual([
      ["α"],
      ["α"],
      ["αβ"],
      ["αβ", "γ"],
    ]);
  });

  it("is empty before anything is written, and keeps empty lines", () => {
    expect(screenAt(output, [step(1)], 0)).toEqual([]);
    expect(screenAt(["", "x"], [step(1, {}, { output: [""], lines: 1 })], 0)).toEqual([""]);
  });
});
