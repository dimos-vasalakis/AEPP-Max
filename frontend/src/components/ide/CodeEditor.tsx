"use client";

import type { Extension } from "@codemirror/state";
import CodeMirror from "@uiw/react-codemirror";
import { glossaAutocase } from "@/lib/glossa/autocase";
import { glossaAutocomplete } from "@/lib/glossa/completion";
import { glossaCounter } from "@/lib/glossa/counter";
import { editorLanguage } from "@/lib/glossa/editorLanguage";
import { glossaIndent } from "@/lib/glossa/indent";
import { glossa, pseudocode } from "@/lib/glossa/language";
import { glossaLinter } from "@/lib/glossa/lint";
import { darkEditorTheme, lightEditorTheme } from "@/lib/glossa/theme";
import type { Language } from "@/lib/glossa/types";

// Transaction filters run last to first: glossaAutocase must see the keystroke
// before glossaIndent and glossaCounter add their own changes to it.
const COMMON = [glossaIndent, glossaCounter, glossaAutocomplete, glossaAutocase, glossaLinter];
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

// @uiw/react-codemirror reconfigures the whole editor whenever `extensions`,
// `theme`, `basicSetup` or `onChange` change identity, which also cancels an
// inserted block's Tab stops. Keep them stable: module constants and a callback
// from useCallback in the parent.
type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Προγράμματα or Αλγόριθμοι. Ide remounts the editor when it changes (`key`). */
  language: Language;
  /** While the agent is writing to the editor. */
  readOnly?: boolean;
  /** Whether the active color theme is dark (lib/theme.ts). */
  dark: boolean;
};

export function CodeEditor({ value, onChange, language, readOnly, dark }: Props) {
  return (
    <CodeMirror
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
