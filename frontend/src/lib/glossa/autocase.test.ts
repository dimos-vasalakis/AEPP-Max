import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { glossaAutocase, keywordFix } from "./autocase";

/** Type `text` at the end of `doc` the way the editor does, and return the result. */
function type(doc: string, text: string, userEvent = "input.type"): string {
  const state = EditorState.create({ doc, extensions: glossaAutocase });
  return state.update({ changes: { from: doc.length, insert: text }, userEvent }).state.doc.toString();
}

describe("keywordFix", () => {
  it("capitalizes the reserved word before the cursor", () => {
    expect(keywordFix("  γραψε", 7)).toEqual({ from: 2, to: 7, insert: "ΓΡΑΨΕ" });
    expect(keywordFix("αλλιώς_αν", 9)?.insert).toBe("ΑΛΛΙΩΣ_ΑΝ");
    expect(keywordFix("x div", 5)?.insert).toBe("DIV");
    expect(keywordFix("α ή", 3)?.insert).toBe("Η");
  });

  it("leaves names, finished capitals, strings and comments alone", () => {
    expect(keywordFix("σύνολο", 6)).toBeNull();
    expect(keywordFix("ΓΡΑΨΕ", 5)).toBeNull();
    expect(keywordFix("ΓΡΑΨΕ 'γραψε", 12)).toBeNull();
    expect(keywordFix("x <- 1 ! αν", 11)).toBeNull();
  });

  it("doesn't split a word the cursor is inside", () => {
    expect(keywordFix("ανθρωπος", 2)).toBeNull();
  });
});

describe("glossaAutocase", () => {
  it("capitalizes on space, Enter and punctuation", () => {
    expect(type("  γραψε", " ")).toBe("  ΓΡΑΨΕ ");
    expect(type("για i απο", " ")).toBe("για i ΑΠΟ ");
    expect(type("τέλος_αν", "\n", "input")).toBe("ΤΕΛΟΣ_ΑΝ\n");
    expect(type("x <- τ_ρ", "(")).toBe("x <- Τ_Ρ(");
  });

  it("doesn't touch letters, names or pastes", () => {
    expect(type("γραψ", "ε")).toBe("γραψε");
    expect(type("σύνολο", " ")).toBe("σύνολο ");
    expect(type("γραψε", " x", "input.paste")).toBe("γραψε x");
  });
});
