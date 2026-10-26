import { describe, expect, it } from "vitest";
import {
  arrayOf,
  changeAt,
  conditionText,
  scopeGroups,
  sourceLine,
  stepSummary,
  traceColumns,
  valuesAfter,
} from "./trace";
import type { TraceStep } from "./types";

const step = (
  line: number,
  changes: Record<string, string> = {},
  extra: Partial<TraceStep> = {},
): TraceStep => ({ line, scope: "Κύριο", changes, output: [], condition: null, ...extra });

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
