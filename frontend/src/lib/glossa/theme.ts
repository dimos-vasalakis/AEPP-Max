import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

// Every color is a CSS token from globals.css, so switching the page's
// data-theme recolors the editor too. Only the dark/light flag (which picks
// CodeMirror's own variants for the diff view, tooltips and lint markers)
// differs between the two exported themes.

// The --syn-* tokens a theme may leave out fall back to the ones beside them
// (only the Διερμηνευτής theme sets them all). One rule per tag: a later rule
// for the same tag replaces an earlier one instead of adding to it.
const highlight = HighlightStyle.define([
  {
    tag: t.keyword,
    color: "var(--syn-keyword)",
    fontWeight: "var(--syn-keyword-weight, 600)",
  },
  {
    tag: [t.typeName, t.bool],
    color: "var(--syn-type)",
    fontWeight: "var(--syn-type-weight, normal)",
  },
  { tag: t.number, color: "var(--syn-number)" },
  { tag: t.float, color: "var(--syn-real, var(--syn-number))" },
  {
    tag: t.operator,
    color: "var(--syn-operator)",
    fontWeight: "var(--syn-operator-weight, normal)",
  },
  {
    tag: t.operatorKeyword,
    color: "var(--syn-operator-word, var(--syn-operator))",
    fontWeight: "var(--syn-type-weight, normal)",
  },
  {
    tag: t.punctuation,
    color: "var(--syn-punctuation, inherit)",
    fontWeight: "var(--syn-operator-weight, normal)",
  },
  { tag: t.standard(t.variableName), color: "var(--syn-builtin)" },
  { tag: t.special(t.variableName), color: "var(--syn-latin, inherit)" },
  { tag: t.string, color: "var(--syn-string)", fontStyle: "var(--syn-string-style, normal)" },
  { tag: t.comment, color: "var(--syn-comment)", fontStyle: "italic" },
]);

const tint = (percent: number) => `color-mix(in srgb, var(--accent) ${percent}%, transparent)`;

function editorTheme(dark: boolean) {
  return [
    EditorView.theme(
      {
        "&": { backgroundColor: "var(--bg)", color: "var(--text)", height: "100%" },
        ".cm-content": { caretColor: "var(--accent)" },
        ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
        ".cm-gutters": {
          background: "var(--gutter-bg, var(--bg))",
          color: "var(--gutter-text, var(--muted))",
          border: "none",
          borderRight: "var(--gutter-border, none)",
        },
        ".cm-activeLine": { backgroundColor: "var(--active-line)" },
        ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--text)" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
          backgroundColor: `var(--selection, ${tint(25)})`,
        },
        ".cm-tooltip": {
          backgroundColor: "var(--panel-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        },
        ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
          backgroundColor: tint(25),
          color: "var(--text)",
        },
        ".cm-completionDetail": { color: "var(--muted)", fontStyle: "normal", marginLeft: "1em" },
        ".cm-diagnostic-error": { borderLeftColor: "var(--danger)" },
      },
      { dark },
    ),
    syntaxHighlighting(highlight),
  ];
}

// Module constants: CodeEditor must pass a stable theme (see its comment).
export const darkEditorTheme = editorTheme(true);
export const lightEditorTheme = editorTheme(false);
