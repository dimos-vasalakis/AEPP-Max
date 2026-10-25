"use client";

import { unifiedMergeView } from "@codemirror/merge";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";
import { glossaAutocomplete } from "@/lib/glossa/completion";
import { glossa } from "@/lib/glossa/language";
import { glossaLinter } from "@/lib/glossa/lint";
import { editorTheme } from "@/lib/glossa/theme";

const BASE = [glossa, glossaAutocomplete, glossaLinter];
// Our own autocomplete (lib/glossa/completion.ts) replaces the default one.
const BASIC_SETUP = { tabSize: 2, autocompletion: false, completionKeymap: false };

// @uiw/react-codemirror reconfigures the whole editor whenever `extensions`,
// `theme`, `basicSetup` or `onChange` change identity, which also cancels an
// inserted block's Tab stops. Keep them stable: module constants, a memo keyed
// on `original`, and a callback from useCallback in the parent.
type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Set while an agent edit is pending: shows the diff against it, with per-change accept/reject. */
  original?: string;
};

export function CodeEditor({ value, onChange, original }: Props) {
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
      theme={editorTheme}
      height="100%"
      className="h-full"
      basicSetup={BASIC_SETUP}
      aria-label="Κώδικας ΓΛΩΣΣΑΣ"
    />
  );
}
