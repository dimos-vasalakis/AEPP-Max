import { describe, expect, it } from "vitest";
import { completionOptions, inCommentOrString, namesIn } from "./completion";

const labels = (typed: string, atLineStart: boolean, names: string[] = []) =>
  completionOptions(typed, atLineStart, names).map((o) => o.label);

describe("completionOptions", () => {
  it("offers ΠΡΟΓΡΑΜΜΑ for «πρ», ignoring case and accents", () => {
    expect(labels("πρ", true)[0]).toBe("ΠΡΟΓΡΑΜΜΑ");
    expect(labels("Πρό", true)[0]).toBe("ΠΡΟΓΡΑΜΜΑ");
  });

  it("offers whole blocks at the start of a line", () => {
    expect(labels("αν", true)).toEqual(["ΑΝ", "ΑΝ … ΑΛΛΙΩΣ"]);
    // The block stays on offer even once the keyword is fully typed.
    expect(labels("ΑΝ", true)).toEqual(["ΑΝ", "ΑΝ … ΑΛΛΙΩΣ"]);
  });

  it("offers mid-line keywords after something on the line", () => {
    expect(labels("το", false)).toEqual(["ΤΟΤΕ"]);
    expect(labels("τε", false)).not.toContain("ΤΕΛΟΣ_ΑΝ");
    expect(labels("τε", true)).toContain("ΤΕΛΟΣ_ΑΝ");
  });

  it("doesn't offer a word that's already fully typed", () => {
    expect(labels("ΤΟΤΕ", false)).toEqual([]);
  });

  it("completes declaration types with the colon", () => {
    const option = completionOptions("ακ", true, []).find((o) => o.label === "ΑΚΕΡΑΙΕΣ");
    expect(option?.apply).toBe("ΑΚΕΡΑΙΕΣ: ");
  });

  it("offers the student's own names in both positions", () => {
    expect(labels("σ", false, ["Σύνολο", "x"])).toContain("Σύνολο");
    expect(labels("συν", true, ["Σύνολο"])).toContain("Σύνολο");
  });
});

describe("namesIn", () => {
  it("collects names once, skipping keywords and the word being typed", () => {
    const text = "ΑΚΕΡΑΙΕΣ: Σύνολο, i\nΣΥΝΟΛΟ <- i + Τ_Ρ(4)\nσυ";
    expect(namesIn(text, text.lastIndexOf("συ"))).toEqual(["Σύνολο", "i"]);
  });
});

describe("inCommentOrString", () => {
  it("detects comments and open strings", () => {
    expect(inCommentOrString("x <- 1 ! σχόλ")).toBe(true);
    expect(inCommentOrString("ΓΡΑΨΕ 'Γει")).toBe(true);
    expect(inCommentOrString("ΓΡΑΨΕ 'α!', ")).toBe(false);
    expect(inCommentOrString("  ΑΝ x > ")).toBe(false);
  });
});
