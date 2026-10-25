import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

// Colors for the token names emitted by language.ts.
const highlight = HighlightStyle.define([
  { tag: t.keyword, color: "#ff6464", fontWeight: "600" },
  { tag: [t.typeName, t.bool, t.number], color: "#f2a65a" },
  { tag: [t.operatorKeyword, t.operator], color: "#c792ea" },
  { tag: t.standard(t.variableName), color: "#82aaff" },
  { tag: t.string, color: "#a5d6a7" },
  { tag: t.comment, color: "#6b6b76", fontStyle: "italic" },
]);

export const editorTheme = [
  EditorView.theme(
    {
      "&": { backgroundColor: "var(--bg)", color: "var(--text)", height: "100%" },
      ".cm-content": { caretColor: "var(--accent)" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
      ".cm-gutters": { backgroundColor: "var(--bg)", color: "var(--muted)", border: "none" },
      ".cm-activeLine": { backgroundColor: "#ffffff08" },
      ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--text)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: "#e5141b40",
      },
      ".cm-tooltip": {
        backgroundColor: "var(--panel-2)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "#e5141b40",
        color: "var(--text)",
      },
      ".cm-completionDetail": { color: "var(--muted)", fontStyle: "normal", marginLeft: "1em" },
      ".cm-diagnostic-error": { borderLeftColor: "var(--danger)" },
    },
    { dark: true },
  ),
  syntaxHighlighting(highlight),
];
