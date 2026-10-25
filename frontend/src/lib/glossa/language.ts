import { StreamLanguage, type StreamParser } from "@codemirror/language";
import {
  BOOLEANS,
  BUILTINS,
  DECLARATION_TYPES,
  KEYWORDS,
  normalizeWord,
  OPERATOR_WORDS,
  PSEUDOCODE_KEYWORDS,
  RETURN_TYPES,
} from "./vocabulary";

export { normalizeWord } from "./vocabulary";

// Highlighting only; errors come from the backend's parser (lint.ts).
const operatorWords = new Set(OPERATOR_WORDS);
const booleans = new Set(BOOLEANS);
const builtins = new Set(Object.keys(BUILTINS));

/**
 * A highlighter for ΓΛΩΣΣΑ or ψευδογλώσσα: the same tokens, different keywords.
 * ψευδογλώσσα has no types, and also the textbook's ≤ ≥ ≠ and the // around its
 * Δεδομένα and Αποτελέσματα.
 */
function parserFor(name: string, keywordList: string[], typeList: string[], symbols: RegExp): StreamParser<null> {
  const keywords = new Set(keywordList);
  const types = new Set(typeList);
  // Token names are @lezer/highlight tags; a modifier goes after a dot
  // ("variableName.standard"), as theme.ts styles them.
  return {
    name,
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
      if (stream.match(/^\d+\.\d+/)) return "float";
      if (stream.match(/^\d+/)) return "integer";
      if (stream.match(symbols)) return "operator";
      if (stream.match(/^[,:()[\]]/)) return "punctuation";
      if (stream.match(/^[\p{L}_][\p{L}\p{N}_]*/u)) {
        const word = normalizeWord(stream.current());
        if (keywords.has(word)) return "keyword";
        if (types.has(word)) return "typeName";
        if (operatorWords.has(word)) return "operatorKeyword";
        if (booleans.has(word)) return "bool";
        if (builtins.has(word)) return "variableName.standard";
        // The Διερμηνευτής shows names with Latin letters apart (gray in its colors).
        if (/[A-Za-z]/.test(stream.current())) return "variableName.special";
        return "variableName";
      }
      stream.next();
      return null;
    },
    languageData: { commentTokens: { line: "!" } },
  };
}

export const glossaParser = parserFor(
  "glossa",
  KEYWORDS,
  [...DECLARATION_TYPES, ...RETURN_TYPES],
  /^(<-|←|<=|>=|<>|\.\.|[-+*/^=<>&])/,
);
export const pseudocodeParser = parserFor(
  "pseudocode",
  PSEUDOCODE_KEYWORDS,
  [],
  /^(<-|←|<=|>=|<>|\.\.|\/\/|[-+*/^=<>&≤≥≠])/,
);

export const glossa = StreamLanguage.define(glossaParser);
export const pseudocode = StreamLanguage.define(pseudocodeParser);
