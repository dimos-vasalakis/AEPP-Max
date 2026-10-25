"use client";

import { unifiedMergeView } from "@codemirror/merge";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";
import { glossaAutocase } from "@/lib/glossa/autocase";
import { glossaAutocomplete } from "@/lib/glossa/completion";
import { glossaCounter } from "@/lib/glossa/counter";
import { glossaIndent } from "@/lib/glossa/indent";
import { glossa } from "@/lib/glossa/language";
import { glossaLinter } from "@/lib/glossa/lint";
import { darkEditorTheme, lightEditorTheme } from "@/lib/glossa/theme";

// Transaction filters run last to first: glossaAutocase must see the keystroke
// before glossaIndent and glossaCounter add their own changes to it.
const BASE = [glossa, glossaIndent, glossaCounter, glossaAutocomplete, glossaAutocase, glossaLinter];
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
// inserted block's Tab stops. Keep them stable: module constants, a memo keyed
// on `original`, and a callback from useCallback in the parent.
type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Set while an agent edit is pending: shows the diff against it, with per-change accept/reject. */
  original?: string;
  /** Whether the active color theme is dark (lib/theme.ts). */
  dark: boolean;
};

export function CodeEditor({ value, onChange, original, dark }: Props) {
  const extensions = useMemo(
    () =>
      original === undefined
        ? BASE
        : [...BASE, unifiedMergeView({ original, mergeControls: true })],
    [original],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={dark ? darkEditorTheme : lightEditorTheme}
      height="100%"
      className="h-full"
      basicSetup={BASIC_SETUP}
      aria-label="Κώδικας ΓΛΩΣΣΑΣ"
    />
  );
}
