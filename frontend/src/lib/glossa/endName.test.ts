import { undo, history } from "@codemirror/commands";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { editorLanguage } from "./editorLanguage";
import { glossaEndName } from "./endName";
import type { Language } from "./types";

function editor(doc: string, language: Language = "pseudocode") {
  let state = EditorState.create({
    doc,
    extensions: [editorLanguage.of(language), glossaEndName, history()],
  });
  return {
    get text() {
      return state.doc.toString();
    },
    edit(spec: TransactionSpec) {
      state = state.update({ userEvent: "input.type", ...spec }).state;
    },
    /** Types `text` at the end of the first occurrence of `after`. */
    typeAfter(after: string, text: string) {
      const at = state.doc.toString().indexOf(after) + after.length;
      this.edit({ changes: { from: at, insert: text } });
    },
    undo() {
      undo({ state, dispatch: (tr) => (state = tr.state) });
    },
  };
}

describe("an algorithm's name after Τέλος", () => {
  it("follows the header when it is renamed", () => {
    const e = editor("Αλγόριθμος Μέγ\nx ← 1\nΤέλος Μέγ");
    e.typeAfter("Αλγόριθμος Μέγ", "ιστο");
    expect(e.text).toBe("Αλγόριθμος Μέγιστο\nx ← 1\nΤέλος Μέγιστο");
  });

  it("leads the header when Τέλος's name is renamed", () => {
    const e = editor("Αλγόριθμος Α\nx ← 1\nΤέλος Α");
    const at = e.text.lastIndexOf("Α");
    e.edit({ changes: { from: at, to: at + 1, insert: "Β" } });
    expect(e.text).toBe("Αλγόριθμος Β\nx ← 1\nΤέλος Β");
  });

  it("is deleted and typed again with the header", () => {
    const e = editor("Αλγόριθμος Α\nΤέλος Α");
    e.edit({ changes: { from: 11, to: 12 } });
    expect(e.text).toBe("Αλγόριθμος \nΤέλος ");
    e.typeAfter("Αλγόριθμος ", "Γ");
    expect(e.text).toBe("Αλγόριθμος Γ\nΤέλος Γ");
  });

  it("is undone together with the header", () => {
    const e = editor("Αλγόριθμος Α\nΤέλος Α");
    e.typeAfter("Αλγόριθμος Α", "Β");
    e.undo();
    expect(e.text).toBe("Αλγόριθμος Α\nΤέλος Α");
  });

  it("pairs each algorithm with its own Τέλος", () => {
    const e = editor("Αλγόριθμος Α\nΚάλεσε Β\nΤέλος Α\nΑλγόριθμος Β\nΤέλος Β");
    e.typeAfter("Αλγόριθμος Β", "2");
    expect(e.text).toBe("Αλγόριθμος Α\nΚάλεσε Β\nΤέλος Α\nΑλγόριθμος Β2\nΤέλος Β2");
  });

  it("never rewrites a header from a name typed after Τέλος for the first time", () => {
    const e = editor("Αλγόριθμος Μέγιστο\nΤέλος");
    e.typeAfter("Τέλος", " Μ");
    expect(e.text).toBe("Αλγόριθμος Μέγιστο\nΤέλος Μ");
  });

  it("isn't fooled by a Τέλος on its way to Τέλος_αν", () => {
    const e = editor("Αλγόριθμος Α\nΑν x > 0 τότε\n  x ← 1\n\nΤέλος Α");
    e.edit({ changes: { from: 35, insert: "Τέλος" } });
    expect(e.text).toBe("Αλγόριθμος Α\nΑν x > 0 τότε\n  x ← 1\nΤέλος\nΤέλος Α");
  });

  it("leaves the two blanks of an inserted block alone (both typed at once)", () => {
    const e = editor("Αλγόριθμος \nΤέλος ");
    e.edit({
      changes: [
        { from: 11, insert: "Α" },
        { from: 18, insert: "Α" },
      ],
    });
    expect(e.text).toBe("Αλγόριθμος Α\nΤέλος Α");
  });

  it("does nothing in ΓΛΩΣΣΑ", () => {
    const e = editor("ΠΡΟΓΡΑΜΜΑ Α\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ Α", "glossa");
    e.typeAfter("ΠΡΟΓΡΑΜΜΑ Α", "Β");
    expect(e.text).toBe("ΠΡΟΓΡΑΜΜΑ ΑΒ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ Α");
  });
});
