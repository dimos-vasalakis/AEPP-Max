import { EditorState, Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { glossaAutocase, keywordFix, symbolFix } from "./autocase";
import { editorLanguage } from "./editorLanguage";

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

describe("keywordFix with the keyboard on English", () => {
  it("turns the Greek layout's keys and greeklish into the keyword", () => {
    expect(keywordFix("  grace", 7)?.insert).toBe("ΓΡΑΨΕ");
    expect(keywordFix("grapse", 6)?.insert).toBe("ΓΡΑΨΕ");
    expect(keywordFix("diavase", 7)?.insert).toBe("ΔΙΑΒΑΣΕ");
    expect(keywordFix("an", 2)?.insert).toBe("ΑΝ");
    expect(keywordFix("gia", 3)?.insert).toBe("ΓΙΑ");
    expect(keywordFix("x > 0 tote", 10)?.insert).toBe("ΤΟΤΕ");
    expect(keywordFix("telos_an", 8)?.insert).toBe("ΤΕΛΟΣ_ΑΝ");
    expect(keywordFix("TELOS_EPANALHCHS", 16)?.insert).toBe("ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ");
    expect(keywordFix("telos_epanalipsis", 17)?.insert).toBe("ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ");
    expect(keywordFix("metavlhtes", 10)?.insert).toBe("ΜΕΤΑΒΛΗΤΕΣ");
    expect(keywordFix("akeraies", 8)?.insert).toBe("ΑΚΕΡΑΙΕΣ");
    expect(keywordFix("x kai", 5)?.insert).toBe("ΚΑΙ");
  });

  it("writes ψευδογλώσσα's words as the textbook does", () => {
    expect(keywordFix("algorithmos", 11, "pseudocode")?.insert).toBe("Αλγόριθμος");
    expect(keywordFix("algoriumos", 10, "pseudocode")?.insert).toBe("Αλγόριθμος");
    expect(keywordFix("an", 2, "pseudocode")?.insert).toBe("Αν");
    expect(keywordFix("dedomena", 8, "pseudocode")?.insert).toBe("Δεδομένα");
  });

  it("leaves Latin names, one letter words and built-in functions alone", () => {
    for (const name of ["i", "h", "e", "x", "max", "sum", "temp", "count", "telos", "log", "syn", "x1"]) {
      expect(keywordFix(name, name.length), name).toBeNull();
    }
    expect(keywordFix("algorithmos", 11)).toBeNull(); // no Αλγόριθμος in ΓΛΩΣΣΑ
    expect(keywordFix("telos", 5, "pseudocode")).toBeNull(); // «telos ← n»
    expect(keywordFix("ΓΡΑΨΕ 'grace", 12)).toBeNull();
    expect(keywordFix("x <- 1 ! an", 11)).toBeNull();
  });
});

describe("Latin names that spell a keyword", () => {
  it("stay names in declarations and once used elsewhere", () => {
    expect(keywordFix("  ΑΚΕΡΑΙΕΣ: apo", 15)).toBeNull();
    expect(keywordFix("  ΑΚΕΡΑΙΕΣ: x, oso", 18)).toBeNull();
    const doc = Text.of(["ΜΕΤΑΒΛΗΤΕΣ", "  ΑΚΕΡΑΙΕΣ: apo", "ΑΡΧΗ", "  apo"]);
    expect(keywordFix("  apo", 5, "glossa", doc, doc.line(4).from)).toBeNull();
    // Only in a comment or a string: still the keyword.
    const other = Text.of(["! apo", "x apo"]);
    expect(keywordFix("x apo", 5, "glossa", other, other.line(2).from)?.insert).toBe("ΑΠΟ");
  });

  it("make ΑΡΧΗ only alone on a line, finished with Enter", () => {
    expect(keywordFix("arxh", 4)?.insert).toBe("ΑΡΧΗ");
    expect(keywordFix("arxi ", 4)).toBeNull(); // a space: «arxi <- 1» may follow
    expect(keywordFix("mesi <- (arxi", 13)).toBeNull();
  });
});

describe("glossaAutocase", () => {
  it("capitalizes on space, Enter and punctuation", () => {
    expect(type("  γραψε", " ")).toBe("  ΓΡΑΨΕ ");
    expect(type("για i απο", " ")).toBe("για i ΑΠΟ ");
    expect(type("τέλος_αν", "\n", "input")).toBe("ΤΕΛΟΣ_ΑΝ\n");
    expect(type("x <- τ_ρ", "(")).toBe("x <- Τ_Ρ(");
    expect(type("  grace", " ")).toBe("  ΓΡΑΨΕ ");
    expect(type("ΑΚΕΡΑΙΕΣ: kai\nΑΡΧΗ\n  kai", " ")).toBe("ΑΚΕΡΑΙΕΣ: kai\nΑΡΧΗ\n  kai ");
  });

  it("doesn't touch letters, names or pastes", () => {
    expect(type("γραψ", "ε")).toBe("γραψε");
    expect(type("σύνολο", " ")).toBe("σύνολο ");
    expect(type("γραψε", " x", "input.paste")).toBe("γραψε x");
  });
});

describe("ψευδογλώσσα's symbols", () => {
  /** Type `text` at the end of `doc` in the Αλγόριθμος editor. */
  function typeAlgorithm(doc: string, text: string, userEvent = "input.type"): string {
    const state = EditorState.create({
      doc,
      extensions: [editorLanguage.of("pseudocode"), glossaAutocase],
    });
    return state.update({ changes: { from: doc.length, insert: text }, userEvent }).state.doc.toString();
  }

  it("become the textbook's ← ≤ ≥ ≠ as they're typed", () => {
    expect(typeAlgorithm("x <", "-")).toBe("x ←");
    expect(typeAlgorithm("Αν x <", "=")).toBe("Αν x ≤");
    expect(typeAlgorithm("Αν x >", "=")).toBe("Αν x ≥");
    expect(typeAlgorithm("Αν x <", ">")).toBe("Αν x ≠");
  });

  it("stay as typed in ΓΛΩΣΣΑ, strings, comments and pastes", () => {
    expect(type("x <", "-")).toBe("x <-");
    expect(typeAlgorithm("Γράψε '<", "=")).toBe("Γράψε '<=");
    expect(typeAlgorithm("x ← 1 ! <", ">")).toBe("x ← 1 ! <>");
    expect(typeAlgorithm("x ", "<-", "input.paste")).toBe("x <-");
    expect(symbolFix("x <=", 4, "glossa")).toBeNull();
  });
});
