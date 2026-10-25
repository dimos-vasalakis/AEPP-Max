import { EditorSelection, EditorState, type Extension, Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { glossaAutocase } from "./autocase";
import { forCounter, glossaCounter, latinCounter, renameInUnit } from "./counter";
import { glossaIndent } from "./indent";
import { glossa } from "./language";

describe("latinCounter", () => {
  it("maps a Greek letter to the Latin one on the same key", () => {
    expect(latinCounter("ι")).toBe("i");
    expect(latinCounter("ξ")).toBe("j");
    expect(latinCounter("κ")).toBe("k");
    expect(latinCounter("η")).toBe("h");
    expect(latinCounter("ί")).toBe("i");
    expect(latinCounter("Ι")).toBe("I");
  });

  it("leaves Latin letters and longer names alone", () => {
    expect(latinCounter("i")).toBeNull();
    expect(latinCounter("θεση")).toBeNull();
    expect(latinCounter("ι1")).toBeNull();
  });
});

describe("forCounter", () => {
  it("finds the name after ΓΙΑ, in any case", () => {
    expect(forCounter("  για ι απο 1 μεχρι 10")).toEqual({ from: 6, to: 7, name: "ι" });
    expect(forCounter("ΓΙΑ θεση ΑΠΟ 1")).toEqual({ from: 4, to: 8, name: "θεση" });
    expect(forCounter("ΓΡΑΨΕ ι")).toBeNull();
  });
});

describe("renameInUnit", () => {
  it("renames the declaration and every use, not strings or comments", () => {
    const doc = Text.of([
      "ΠΡΟΓΡΑΜΜΑ Α",
      "ΜΕΤΑΒΛΗΤΕΣ",
      "  ΑΚΕΡΑΙΕΣ: ι, ν",
      "ΑΡΧΗ",
      "  ΓΙΑ ι ΑΠΟ 1 ΜΕΧΡΙ ν",
      "    ΓΡΑΨΕ 'ι =', Ι ! το ι",
      "  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
      "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
      "ΔΙΑΔΙΚΑΣΙΑ Δ(ι)",
    ]);
    const changes = renameInUnit(doc, 5, "ι", "i");
    const renamed = EditorState.create({ doc }).update({ changes }).state.doc.toString();
    expect(renamed).toBe(
      [
        "ΠΡΟΓΡΑΜΜΑ Α",
        "ΜΕΤΑΒΛΗΤΕΣ",
        "  ΑΚΕΡΑΙΕΣ: i, ν",
        "ΑΡΧΗ",
        "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ ν",
        "    ΓΡΑΨΕ 'ι =', i ! το ι",
        "  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
        "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
        "ΔΙΑΔΙΚΑΣΙΑ Δ(ι)",
      ].join("\n"),
    );
  });
});

function typing(doc: string, extra: Extension[] = []) {
  let state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(doc.length),
    extensions: [glossa, glossaIndent, glossaCounter, glossaAutocase, ...extra],
  });
  return {
    /** Move the cursor without typing, as a click or an arrow key does. */
    moveTo(pos: number, userEvent = "select.pointer") {
      state = state.update({ selection: { anchor: pos }, userEvent }).state;
      return state.doc.toString();
    },
    /** Insert a pair with the cursor between, as the editor does for «[». */
    pair(open: string, close: string) {
      const head = state.selection.main.head;
      state = state.update({
        changes: { from: head, insert: open + close },
        selection: { anchor: head + open.length },
        userEvent: "input.type",
      }).state;
      return state.doc.toString();
    },
    type(text: string) {
      for (const ch of text) {
        const head = state.selection.main.head;
        state = state.update({
          changes: { from: head, insert: ch },
          selection: { anchor: head + 1 },
          userEvent: "input.type",
        }).state;
      }
      return state.doc.toString();
    },
  };
}

describe("typing a ΓΙΑ", () => {
  const top = "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: ι\nΑΡΧΗ\n  ";

  it("turns the counter Latin once it's finished, declaration included", () => {
    const t = typing(top);
    expect(t.type("για ι")).toBe(`${top}ΓΙΑ ι`);
    expect(t.type(" απο 1 μεχρι 10")).toBe(
      "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i\nΑΡΧΗ\n  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10",
    );
  });

  it("keeps «η» a name, not the operator Η", () => {
    expect(typing(top).type("για η απο 1")).toBe(`${top}ΓΙΑ h ΑΠΟ 1`);
  });

  it("leaves longer Greek counters as they are", () => {
    expect(typing(top).type("για θεση απο 1")).toBe(`${top}ΓΙΑ θεση ΑΠΟ 1`);
  });

  it("turns a Greek ι in the loop's body into the counter", () => {
    const t = typing(top);
    t.type("για ι απο 1 μεχρι 10");
    const loop = "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i\nΑΡΧΗ\n  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10";
    expect(t.type("\n    γραψε ι, 'ι'")).toBe(`${loop}\n    ΓΡΑΨΕ i, 'ι'`);
  });

  it("keeps a Greek name that is a variable of its own", () => {
    const own = "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i, ι\nΑΡΧΗ\n  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10\n    ";
    expect(typing(own).type("ι <- 1")).toBe(`${own}ι <- 1`);
  });

  const loop = "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: i\nΑΡΧΗ\n  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10";

  it("turns a Greek ι Latin when the cursor leaves it, with nothing typed after it", () => {
    const t = typing(top);
    t.type("για ι απο 1 μεχρι 10\n    γραψε ι");
    expect(t.moveTo(0)).toBe(`${loop}\n    ΓΡΑΨΕ i`);
  });

  it("does it after the loop too, and with the arrow keys", () => {
    const t = typing(top);
    t.type("για ι απο 1 μεχρι 10\n  τελος_επαναληψης\n  χ <- ι");
    expect(t.moveTo(5, "select")).toBe(`${loop}\n  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ\n  χ <- i`);
  });

  it("does it inside brackets, where typing «]» only steps over the closed one", () => {
    const t = typing(top);
    t.type("για ι απο 1 μεχρι 10\n    Α");
    t.pair("[", "]");
    const text = t.type("ι");
    expect(t.moveTo(text.length, "input.type")).toBe(`${loop}\n    Α[i]`);
  });

  it("waits while the cursor is still on the word", () => {
    const t = typing(top);
    const text = t.type("για ι απο 1 μεχρι 10\n    γραψε ι");
    expect(t.moveTo(text.length - 1, "select")).toBe(`${loop}\n    ΓΡΑΨΕ ι`);
  });

  it("leaves a Greek letter alone where there is no Latin counter", () => {
    const t = typing(top);
    const text = t.type("γραψε ι");
    expect(t.moveTo(0)).toBe(text);
  });

  it("doesn't rewrite code it didn't just see typed, such as a pasted line", () => {
    const pasted = `${loop}\n    ΓΡΑΨΕ ι`;
    const t = typing(pasted);
    expect(t.moveTo(0)).toBe(pasted); // cursor starts after «ι», but nothing was typed
  });

  it("doesn't change a read-only editor (while the agent writes)", () => {
    const t = typing(top, [EditorState.readOnly.of(true)]);
    const text = t.type("για ι απο 1 μεχρι 10\n    γραψε ι");
    expect(t.moveTo(0)).toBe(text);
  });
});
