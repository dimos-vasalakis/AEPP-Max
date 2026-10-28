"use client";

import type { Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import { trackCursor } from "@/lib/cursor";
import { glossaAutocase } from "@/lib/glossa/autocase";
import { glossaAutocomplete } from "@/lib/glossa/completion";
import { glossaCounter } from "@/lib/glossa/counter";
import { editorLanguage } from "@/lib/glossa/editorLanguage";
import { glossaEndName } from "@/lib/glossa/endName";
import { formatChanges } from "@/lib/glossa/format";
import { glossaIndent } from "@/lib/glossa/indent";
import { glossa, pseudocode } from "@/lib/glossa/language";
import { glossaLinter } from "@/lib/glossa/lint";
import { darkEditorTheme, lightEditorTheme } from "@/lib/glossa/theme";
import { setTraceMark, type TraceMark, traceLine } from "@/lib/glossa/traceLine";
import type { Language } from "@/lib/glossa/types";

// Transaction filters run last to first: glossaAutocase must see the keystroke
// before glossaIndent and glossaCounter add their own changes to it, and
// glossaEndName sees them all.
const COMMON = [
  glossaEndName,
  glossaIndent,
  glossaCounter,
  glossaAutocomplete,
  glossaAutocase,
  glossaLinter,
  traceLine,
  trackCursor,
];
// One per language: the highlighter, and the facet the other extensions read.
const BASE: Record<Language, Extension[]> = {
  glossa: [editorLanguage.of("glossa"), glossa, ...COMMON],
  pseudocode: [editorLanguage.of("pseudocode"), pseudocode, ...COMMON],
};
const LABEL: Record<Language, string> = {
  glossa: "Κώδικας ΓΛΩΣΣΑΣ",
  pseudocode: "Αλγόριθμος σε ψευδογλώσσα",
};
// Our own autocomplete (lib/glossa/completion.ts) replaces the default one. No
// fold gutter: the ΓΛΩΣΣΑ highlighter defines nothing to fold, so it was an empty column.
const BASIC_SETUP = {
  tabSize: 2,
  autocompletion: false,
  completionKeymap: false,
  foldGutter: false,
  foldKeymap: false,
};

/** What the IDE asks of the editor. */
export type EditorActions = {
  /** Τακτοποίηση (lib/glossa/format.ts), one undo step; returns the code, tidied or not (read-only). */
  format: () => string;
};

// @uiw/react-codemirror reconfigures the whole editor whenever `extensions`,
// `theme`, `basicSetup` or `onChange` change identity, which also cancels an
// inserted block's Tab stops. Keep them stable: module constants and a callback
// from useCallback in the parent.
type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Πρόγραμμα or Αλγόριθμος. Ide remounts the editor when it changes (`key`). */
  language: Language;
  /** While the agent is writing to the editor. */
  readOnly?: boolean;
  /** Whether the active color theme is dark (lib/theme.ts). */
  dark: boolean;
  /** The πίνακας τιμών's current step, or the ΔΙΑΒΑΣΕ waiting for a value: its line is marked and scrolled into view. */
  trace?: TraceMark;
  /** The editor's actions, while it is mounted. */
  ref?: Ref<EditorActions>;
};

export function CodeEditor({ value, onChange, language, readOnly, dark, trace = null, ref }: Props) {
  const editor = useRef<ReactCodeMirrorRef>(null);
  const line = trace?.line;
  const note = trace?.note;

  useImperativeHandle(
    ref,
    () => ({
      format() {
        const view = editor.current?.view;
        if (!view) return value;
        // Changed only where it differs, so the cursor stays where it was.
        const changes = view.state.readOnly ? [] : formatChanges(view.state, language);
        if (changes.length) view.dispatch({ changes, userEvent: "format", scrollIntoView: true });
        return view.state.doc.toString();
      },
    }),
    [language, value],
  );

  // An effect, not an extension prop: changing extensions would reconfigure the editor.
  useEffect(() => {
    const view = editor.current?.view;
    if (!view) return;
    const mark = line === undefined ? null : { line, note: note ?? "" };
    const effects: StateEffect<unknown>[] = [setTraceMark.of(mark)];
    if (mark && mark.line <= view.state.doc.lines) {
      const at = view.state.doc.line(mark.line).from;
      effects.push(EditorView.scrollIntoView(at, { y: "nearest" }));
    }
    view.dispatch({ effects });
  }, [line, note]);

  return (
    <CodeMirror
      ref={editor}
      value={value}
      onChange={onChange}
      extensions={BASE[language]}
      readOnly={readOnly}
      theme={dark ? darkEditorTheme : lightEditorTheme}
      height="100%"
      className="h-full"
      basicSetup={BASIC_SETUP}
      aria-label={LABEL[language]}
    />
  );
}
