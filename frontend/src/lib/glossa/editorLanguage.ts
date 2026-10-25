import { Facet } from "@codemirror/state";
import type { Language } from "./types";

/**
 * The language the editor is set to (Πρόγραμμα or Αλγόριθμος). CodeEditor puts
 * it in the state; highlighting, autocase, indentation, autocomplete and the
 * linter read it from there.
 */
export const editorLanguage = Facet.define<Language, Language>({
  combine: (values) => values[0] ?? "glossa",
});
