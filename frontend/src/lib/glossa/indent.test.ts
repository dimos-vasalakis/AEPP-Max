import { indentUnit } from "@codemirror/language";
import { EditorSelection, EditorState, type Transaction } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { glossaAutocase } from "./autocase";
import { glossaCounter } from "./counter";
import { glossaIndent, indentFor, newlineAndIndent } from "./indent";
import { glossa } from "./language";

const at = (text: string, above: string) => indentFor(text, above.split("\n").reverse(), 2, 2);

describe("indentFor", () => {
  it("goes one level in after a line that opens a block", () => {
    expect(at("", "ΑΡΧΗ")).toBe(2);
    expect(at("", "ΑΡΧΗ\n  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10")).toBe(4);
    expect(at("", "  ΑΝ x > 0 ΤΟΤΕ")).toBe(4);
    expect(at("", "  οσο x > 0 επαναλαβε")).toBe(4);
    expect(at("", "  ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ")).toBe(4);
    expect(at("", "ΜΕΤΑΒΛΗΤΕΣ")).toBe(2);
  });

  it("keeps the level after an ordinary line, skipping blank and comment lines", () => {
    expect(at("", "ΑΡΧΗ\n  x <- 1")).toBe(2);
    expect(at("", "ΑΡΧΗ\n    x <- 1\n\n  ! σχόλιο")).toBe(4);
    expect(at("", "ΠΡΟΓΡΑΜΜΑ Α")).toBe(0);
  });

  it("lines a block's end up with its start", () => {
    expect(at("ΤΕΛΟΣ_ΑΝ", "  ΑΝ x > 0 ΤΟΤΕ\n    x <- 1")).toBe(2);
    expect(at("αλλιώς", "  ΑΝ x > 0 ΤΟΤΕ\n    x <- 1")).toBe(2);
    expect(at("ΑΛΛΙΩΣ_ΑΝ x < 0 ΤΟΤΕ", "  ΑΝ x > 0 ΤΟΤΕ\n    x <- 1")).toBe(2);
    expect(at("ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", "ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3\n  ΓΡΑΨΕ i")).toBe(0);
    expect(at("ΜΕΧΡΙΣ_ΟΤΟΥ x > 0", "  ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ\n    ΔΙΑΒΑΣΕ x")).toBe(2);
  });

  it("skips inner blocks when looking for the start", () => {
    const above = "  ΑΝ α ΤΟΤΕ\n    ΑΝ β ΤΟΤΕ\n      x <- 1\n    ΤΕΛΟΣ_ΑΝ";
    expect(at("ΑΛΛΙΩΣ", above)).toBe(2);
    const loops = "ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3\n  ΟΣΟ x > 0 ΕΠΑΝΑΛΑΒΕ\n    x <- x - 1\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ";
    expect(at("ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", loops)).toBe(0);
  });

  it("puts ΠΕΡΙΠΤΩΣΗ one level inside its ΕΠΙΛΕΞΕ", () => {
    expect(at("ΠΕΡΙΠΤΩΣΗ 1", "ΕΠΙΛΕΞΕ x")).toBe(2);
    expect(at("", "ΕΠΙΛΕΞΕ x\n  ΠΕΡΙΠΤΩΣΗ 1")).toBe(4);
    expect(at("ΠΕΡΙΠΤΩΣΗ ΑΛΛΙΩΣ", "ΕΠΙΛΕΞΕ x\n  ΠΕΡΙΠΤΩΣΗ 1\n    x <- 1")).toBe(2);
    expect(at("ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ", "ΕΠΙΛΕΞΕ x\n  ΠΕΡΙΠΤΩΣΗ 1\n    x <- 1")).toBe(0);
  });

  it("keeps sections at the left edge", () => {
    expect(at("ΑΡΧΗ", "ΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x")).toBe(0);
    expect(at("ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΑΡΧΗ\n  x <- 1")).toBe(0);
  });

  it("steps one level out when the block's start is missing", () => {
    expect(at("ΤΕΛΟΣ_ΑΝ", "ΑΡΧΗ\n    x <- 1")).toBe(2);
    expect(at("ΤΕΛΟΣ_ΑΝ", "ΑΡΧΗ")).toBe(0);
  });
});

// The editor's own filters, in CodeEditor's order.
function editor(doc: string, cursor = doc.length) {
  let state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(cursor),
    extensions: [glossa, glossaIndent, glossaCounter, glossaAutocase, indentUnit.of("  ")],
  });
  const view = {
    get state() {
      return state;
    },
    dispatch(tr: Transaction) {
      state = tr.state;
    },
  };
  return {
    type(text: string) {
      for (const ch of text) {
        const head = state.selection.main.head;
        state = state.update({
          changes: { from: head, insert: ch },
          selection: { anchor: head + ch.length },
          userEvent: "input.type",
        }).state;
      }
    },
    enter() {
      newlineAndIndent(view);
    },
    get text() {
      return state.doc.toString();
    },
  };
}

describe("typing in the editor", () => {
  it("indents the line after Enter on a block's first line", () => {
    const e = editor("ΑΡΧΗ\n  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10");
    e.enter();
    e.type("γραψε i");
    expect(e.text).toBe("ΑΡΧΗ\n  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10\n    ΓΡΑΨΕ i");
  });

  it("moves a finished block end back and capitalizes it", () => {
    const e = editor("ΑΡΧΗ\n  ΑΝ x > 0 ΤΟΤΕ\n    x <- 1");
    e.enter();
    e.type("τελος_αν ");
    expect(e.text).toBe("ΑΡΧΗ\n  ΑΝ x > 0 ΤΟΤΕ\n    x <- 1\n  ΤΕΛΟΣ_ΑΝ ");
  });

  it("on Enter after ΑΛΛΙΩΣ, moves it back and goes in again", () => {
    const e = editor("ΑΡΧΗ\n  ΑΝ x > 0 ΤΟΤΕ\n    x <- 1");
    e.enter();
    e.type("αλλιως");
    e.enter();
    e.type("x");
    expect(e.text).toBe("ΑΡΧΗ\n  ΑΝ x > 0 ΤΟΤΕ\n    x <- 1\n  ΑΛΛΙΩΣ\n    x");
  });

  it("on Enter after ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ, the next line stays at its level", () => {
    const e = editor("ΑΡΧΗ\n  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3\n    ΓΡΑΨΕ i");
    e.enter();
    e.type("τελος_επαναληψης");
    e.enter();
    e.type("x");
    expect(e.text).toBe(
      "ΑΡΧΗ\n  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 3\n    ΓΡΑΨΕ i\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  x",
    );
  });

  it("leaves hand-made indentation of ordinary lines alone", () => {
    const e = editor("ΑΡΧΗ\n      x <- 1");
    e.type(" + 2");
    expect(e.text).toBe("ΑΡΧΗ\n      x <- 1 + 2");
  });
});
