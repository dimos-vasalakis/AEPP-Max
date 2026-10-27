import { type EditorState, RangeSet, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  gutterLineClass,
  WidgetType,
} from "@codemirror/view";

/** The πίνακας τιμών's current step, shown in the editor: its line, and what it did. Also the ΔΙΑΒΑΣΕ waiting for a value (no note). */
export type TraceMark = { line: number; note: string } | null;

/** Dispatched by CodeEditor whenever the step changes; null clears the mark. */
export const setTraceMark = StateEffect.define<TraceMark>();

/** «x = 5, y = 2» after the line's code, like a debugger's inline values. */
class NoteWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  eq(other: NoteWidget) {
    return other.text === this.text;
  }

  toDOM() {
    const note = document.createElement("span");
    note.className = "cm-traceNote";
    note.textContent = this.text;
    return note;
  }

  ignoreEvent() {
    return true;
  }
}

/** The line's gutter: its number stands out (Κλασικό draws the Διερμηνευτής's arrow there). */
class TraceGutter extends GutterMarker {
  elementClass = "cm-traceGutter";
}
const TRACE_GUTTER = new TraceGutter();

type Marked = { decorations: DecorationSet; gutter: RangeSet<GutterMarker> };
const NONE: Marked = { decorations: Decoration.none, gutter: RangeSet.empty };

function decorate(state: EditorState, mark: TraceMark): Marked {
  if (mark === null || mark.line < 1 || mark.line > state.doc.lines) return NONE;
  const line = state.doc.line(mark.line);
  const ranges = [Decoration.line({ class: "cm-traceLine" }).range(line.from)];
  if (mark.note) {
    ranges.push(Decoration.widget({ widget: new NoteWidget(mark.note), side: 1 }).range(line.to));
  }
  return {
    decorations: Decoration.set(ranges, true),
    gutter: RangeSet.of([TRACE_GUTTER.range(line.from)]),
  };
}

/** The mark's decorations. Any edit clears it: the step belongs to the code that ran. */
export const traceLine = StateField.define<Marked>({
  create: () => NONE,
  update(marked, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTraceMark)) return decorate(tr.state, effect.value);
    }
    return tr.docChanged ? NONE : marked;
  },
  provide: (field) => [
    EditorView.decorations.from(field, (marked) => marked.decorations),
    gutterLineClass.from(field, (marked) => marked.gutter),
  ],
});
