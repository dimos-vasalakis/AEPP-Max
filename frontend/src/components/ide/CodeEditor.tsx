"use client";

import { unifiedMergeView } from "@codemirror/merge";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";
import { glossa } from "@/lib/glossa/language";
import { editorTheme } from "@/lib/glossa/theme";

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
        ? [glossa]
        : [glossa, unifiedMergeView({ original, mergeControls: true })],
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
      basicSetup={{ tabSize: 2 }}
      aria-label="Κώδικας ΓΛΩΣΣΑΣ"
    />
  );
}
