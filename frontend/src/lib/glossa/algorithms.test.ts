import { describe, expect, it } from "vitest";
import { ALGORITHM_GROUPS, algorithmCode, algorithmProgram } from "./algorithms";
import { formatCode } from "./format";
import { PART_MARKER } from "./trace";

const ALL = ALGORITHM_GROUPS.flatMap((group) => group.algorithms);

describe("the algorithm library", () => {
  it("has every topic, in the book's order", () => {
    expect(ALGORITHM_GROUPS.map((group) => group.name)).toEqual([
      "Επαναλήψεις",
      "Πίνακες – Μονοδιάστατοι",
      "Πίνακες – Δυσδιάστατοι",
      "Πίνακες – Ταξινομήσεις",
      "Πίνακες – Αναζήτηση",
      "Στοίβες",
      "Ουρές",
    ]);
  });

  it("has unique titles", () => {
    const titles = ALL.map((algorithm) => algorithm.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it.each(ALL.map((algorithm) => [algorithm.title, algorithm] as const))(
    "opens already tidied, so a run moves nothing: %s",
    (_title, algorithm) => {
      const program = algorithmProgram(algorithm);
      expect(formatCode(program)).toBe(program);
    },
  );

  it.each(ALL.map((algorithm) => [algorithm.title, algorithm] as const))(
    "uses Latin letters only in TOP, FRONT, REAR, MOD and DIV: %s",
    (_title, algorithm) => {
      const words = algorithmProgram(algorithm).match(/[\p{L}\p{N}_]*[A-Za-z][\p{L}\p{N}_]*/gu) ?? [];
      expect(words.filter((word) => !["TOP", "FRONT", "REAR", "MOD", "DIV"].includes(word))).toEqual([]);
    },
  );

  it("marks where a framed algorithm's own code starts, so a run can open there", () => {
    for (const algorithm of ALL.filter((a) => a.frame)) {
      const lines = algorithmProgram(algorithm).split("\n");
      const marker = lines.findIndex((line) => line.trim() === PART_MARKER);
      expect(lines[marker + 1]).toBe(`  ${algorithm.code[0]}`);
    }
  });

  it("wraps a part of a program, indented, in a whole one", () => {
    const part = ALL.find((algorithm) => algorithm.title.startsWith("Εξαγωγή ενός"));
    expect(part?.frame).toBeDefined();
    const program = algorithmProgram(part!);
    expect(program.startsWith("ΠΡΟΓΡΑΜΜΑ ")).toBe(true);
    expect(program.trimEnd().endsWith("ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ")).toBe(true);
    expect(program).toContain("  ΑΝ FRONT = 0 ΚΑΙ REAR = 0 ΤΟΤΕ\n    ΓΡΑΨΕ 'ΟΥΡΑ ΑΔΕΙΑ'\n");
    expect(algorithmCode(part!).startsWith("ΑΝ FRONT = 0 ΚΑΙ REAR = 0 ΤΟΤΕ\n")).toBe(true);
  });

  it("opens a whole program as it shows it", () => {
    const whole = ALL.find((algorithm) => algorithm.frame === undefined);
    expect(algorithmProgram(whole!)).toBe(`${algorithmCode(whole!)}\n`);
  });
});
