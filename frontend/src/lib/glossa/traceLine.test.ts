import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { setTraceMark, traceLine } from "./traceLine";

const start = () => EditorState.create({ doc: "ΑΡΧΗ\n  x <- 1\nΤΕΛΟΣ", extensions: [traceLine] });

function marked(state: EditorState): { from: number; class?: string; widget: boolean }[] {
  const found: { from: number; class?: string; widget: boolean }[] = [];
  state.field(traceLine).decorations.between(0, state.doc.length, (from, _to, deco) => {
    found.push({ from, class: deco.spec.class, widget: Boolean(deco.spec.widget) });
  });
  return found;
}

describe("traceLine", () => {
  it("marks the step's line and puts its note at the line end", () => {
    const state = start().update({ effects: setTraceMark.of({ line: 2, note: "x = 1" }) }).state;
    expect(marked(state)).toEqual([
      { from: 5, class: "cm-traceLine", widget: false },
      { from: 13, class: undefined, widget: true },
    ]);
  });

  it("marks the line without a note when the step changed nothing", () => {
    const state = start().update({ effects: setTraceMark.of({ line: 1, note: "" }) }).state;
    expect(marked(state)).toEqual([{ from: 0, class: "cm-traceLine", widget: false }]);
  });

  it("marks the line's gutter too", () => {
    const state = start().update({ effects: setTraceMark.of({ line: 2, note: "" }) }).state;
    const gutter: number[] = [];
    state.field(traceLine).gutter.between(0, state.doc.length, (from) => {
      gutter.push(from);
    });
    expect(gutter).toEqual([5]);
  });

  it("clears on null, on a line that isn't there, and on any edit", () => {
    const on = start().update({ effects: setTraceMark.of({ line: 2, note: "" }) }).state;
    expect(marked(on.update({ effects: setTraceMark.of(null) }).state)).toEqual([]);
    expect(marked(on.update({ effects: setTraceMark.of({ line: 9, note: "" }) }).state)).toEqual(
      [],
    );
    expect(marked(on.update({ changes: { from: 0, insert: "!" } }).state)).toEqual([]);
  });
});
