import { StreamLanguage, type StreamParser } from "@codemirror/language";

// Highlighting only; the backend's lexer is the real definition of the language.
const KEYWORDS = new Set([
  "ΠΡΟΓΡΑΜΜΑ", "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ",
  "ΔΙΑΒΑΣΕ", "ΓΡΑΨΕ",
  "ΑΝ", "ΤΟΤΕ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ",
  "ΕΠΙΛΕΞΕ", "ΠΕΡΙΠΤΩΣΗ", "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
  "ΓΙΑ", "ΑΠΟ", "ΜΕΧΡΙ", "ΜΕ_ΒΗΜΑ", "ΟΣΟ", "ΕΠΑΝΑΛΑΒΕ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
  "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ",
  "ΣΥΝΑΡΤΗΣΗ", "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ", "ΔΙΑΔΙΚΑΣΙΑ", "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ", "ΚΑΛΕΣΕ",
]);
const TYPES = new Set([
  "ΑΚΕΡΑΙΕΣ", "ΠΡΑΓΜΑΤΙΚΕΣ", "ΧΑΡΑΚΤΗΡΕΣ", "ΛΟΓΙΚΕΣ",
  "ΑΚΕΡΑΙΑ", "ΠΡΑΓΜΑΤΙΚΗ", "ΧΑΡΑΚΤΗΡΑΣ", "ΛΟΓΙΚΗ",
]);
const OPERATOR_WORDS = new Set(["DIV", "MOD", "ΚΑΙ", "Η", "ΟΧΙ"]);
const CONSTANTS = new Set(["ΑΛΗΘΗΣ", "ΨΕΥΔΗΣ"]);
const BUILTINS = new Set(["Α_Μ", "Α_Τ", "Τ_Ρ", "ΗΜ", "ΣΥΝ", "ΕΦ", "ΛΟΓ", "Ε"]);

/** Uppercase without accents, so `αλλιώς_αν` and `ΑΛΛΙΩΣ_ΑΝ` match (ς → Σ too). */
export function normalizeWord(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

const parser: StreamParser<null> = {
  name: "glossa",
  token(stream) {
    if (stream.eatSpace()) return null;
    const ch = stream.peek();
    if (ch === "!") {
      stream.skipToEnd();
      return "comment";
    }
    if (ch === "'" || ch === '"') {
      stream.next();
      while (!stream.eol() && stream.next() !== ch);
      return "string";
    }
    if (stream.match(/^\d+(\.\d+)?/)) return "number";
    if (stream.match(/^(<-|←|<=|>=|<>|\.\.|[-+*/^=<>&])/)) return "operator";
    if (stream.match(/^[\p{L}_][\p{L}\p{N}_]*/u)) {
      const word = normalizeWord(stream.current());
      if (KEYWORDS.has(word)) return "keyword";
      if (TYPES.has(word)) return "typeName";
      if (OPERATOR_WORDS.has(word)) return "operatorKeyword";
      if (CONSTANTS.has(word)) return "bool";
      if (BUILTINS.has(word)) return "standard(variableName)";
      return "variableName";
    }
    stream.next();
    return null;
  },
  languageData: { commentTokens: { line: "!" } },
};

export const glossa = StreamLanguage.define(parser);
