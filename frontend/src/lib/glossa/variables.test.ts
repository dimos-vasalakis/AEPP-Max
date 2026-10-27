import { describe, expect, it } from "vitest";
import type { Frame, TraceStep, Variable } from "./types";
import { framesAtStep, frameRows, MAX_ELEMENTS, snapshotFrames } from "./variables";

const scalar = (name: string, value: string | null = null): Variable => ({
  name,
  type: "ΑΚΕΡΑΙΑ",
  value,
  dims: null,
  cells: null,
  cells_truncated: false,
});

const array = (name: string, dims: number[], cells: Record<string, string> | null = null): Variable => ({
  name,
  type: "ΑΚΕΡΑΙΑ",
  value: null,
  dims,
  cells,
  cells_truncated: false,
});

const step = (
  scope: string,
  depth: number,
  call: number,
  changes: Record<string, string> = {},
  copied: Record<string, string> = {},
): TraceStep => ({ line: 1, scope, changes, output: [], condition: null, depth, call, copied });

describe("frameRows", () => {
  it("lists declared variables in order, blank until they get a value", () => {
    const rows = frameRows([scalar("α"), scalar("β")], new Map([["β", "2"]]));
    expect(rows.map((r) => [r.name, r.value])).toEqual([
      ["α", undefined],
      ["β", "2"],
    ]);
  });

  it("lists every element of a sized array, row by row", () => {
    const rows = frameRows([array("Π", [2, 2])], new Map([["Π[2, 1]", "7"]]));
    expect(rows[0].elements?.map((e) => [e.name, e.value])).toEqual([
      ["Π[1, 1]", undefined],
      ["Π[1, 2]", undefined],
      ["Π[2, 1]", "7"],
      ["Π[2, 2]", undefined],
    ]);
    expect(rows[0].more).toBe(false);
  });

  it("cuts a big array short and says so", () => {
    const rows = frameRows([array("Α", [1000])], new Map());
    expect(rows[0].elements).toHaveLength(MAX_ELEMENTS);
    expect(rows[0].more).toBe(true);
  });

  it("adds undeclared names and arrays without a size, elements in index order", () => {
    const values = new Map([
      ["x", "1"],
      ["Π[10]", "c"],
      ["Π[2]", "b"],
    ]);
    const rows = frameRows([], values, new Set(["Π[2]"]));
    expect(rows.map((r) => r.name)).toEqual(["x", "Π"]);
    expect(rows[1].elements?.map((e) => e.name)).toEqual(["Π[2]", "Π[10]"]);
    expect(rows[1].changed).toBe(true); // one of its elements changed
  });
});

describe("snapshotFrames", () => {
  it("reads values and cells, and marks arrays the server cut short", () => {
    const frames: Frame[] = [
      {
        scope: "Π",
        title: "ΠΡΟΓΡΑΜΜΑ Π",
        variables: [scalar("α", "5"), { ...array("Τ", [3], { "Τ[2]": "4" }), cells_truncated: true }],
      },
    ];
    const [view] = snapshotFrames(frames);
    expect(view.title).toBe("ΠΡΟΓΡΑΜΜΑ Π");
    expect(view.rows[0].value).toBe("5");
    expect(view.rows[1].elements?.[1].value).toBe("4");
    expect(view.rows[1].more).toBe(false);
    expect(view.rows[1].partial).toBe(true);
  });
});

describe("framesAtStep", () => {
  const units: Frame[] = [
    { scope: "Π", title: "ΠΡΟΓΡΑΜΜΑ Π", variables: [scalar("x")] },
    { scope: "Φ", title: "ΣΥΝΑΡΤΗΣΗ Φ", variables: [scalar("κ"), scalar("τ")] },
  ];
  // x <- Φ(1) + Φ(2): two calls of Φ at the same depth, then x on the program's line.
  const trace = [
    step("Π", 0, 0),
    step("Φ", 1, 1, { κ: "1" }),
    step("Φ", 1, 1, { τ: "9" }),
    step("Φ", 1, 2, { κ: "2" }),
    step("Π", 0, 0, { x: "3" }),
  ];

  it("shows the calls running at that step, the current one's changes marked", () => {
    const frames = framesAtStep(trace, 2, units);
    expect(frames.map((f) => f.title)).toEqual(["ΠΡΟΓΡΑΜΜΑ Π", "ΣΥΝΑΡΤΗΣΗ Φ"]);
    expect(frames[1].rows.map((r) => [r.name, r.value, r.changed])).toEqual([
      ["κ", "1", false],
      ["τ", "9", true],
    ]);
  });

  it("starts a new call with empty variables, even of the same unit", () => {
    const frames = framesAtStep(trace, 3, units);
    expect(frames[1].rows.map((r) => r.value)).toEqual(["2", undefined]);
  });

  it("drops a call once it returned", () => {
    const frames = framesAtStep(trace, 4, units);
    expect(frames).toHaveLength(1);
    expect(frames[0].rows[0]).toMatchObject({ name: "x", value: "3", changed: true });
  });

  it("starts an array parameter as a copy of the caller's array", () => {
    const withArrays: Frame[] = [
      { scope: "Π", title: "ΠΡΟΓΡΑΜΜΑ Π", variables: [array("Α", [2])] },
      { scope: "Τ", title: "ΔΙΑΔΙΚΑΣΙΑ Τ", variables: [array("Β", [2])] },
    ];
    const calls = [
      step("Π", 0, 0, { "Α[1]": "5", "Α[2]": "3" }),
      step("Τ", 1, 1, {}, { Β: "Α" }),
      step("Τ", 1, 1, { "Β[1]": "3", "Β[2]": "5" }),
      step("Π", 0, 0, { "Α[1]": "3", "Α[2]": "5" }), // written back
    ];
    const entry = framesAtStep(calls, 1, withArrays);
    expect(entry[1].rows[0].elements?.map((e) => e.value)).toEqual(["5", "3"]);
    const back = framesAtStep(calls, 3, withArrays);
    expect(back[0].rows[0].elements?.map((e) => e.value)).toEqual(["3", "5"]);
  });
});
