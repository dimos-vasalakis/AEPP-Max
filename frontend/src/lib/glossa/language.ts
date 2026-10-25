import { StreamLanguage, type StreamParser } from "@codemirror/language";
import {
  BOOLEANS,
  BUILTINS,
  DECLARATION_TYPES,
  KEYWORDS,
  normalizeWord,
  OPERATOR_WORDS,
  RETURN_TYPES,
} from "./vocabulary";

export { normalizeWord } from "./vocabulary";

// Highlighting only; errors come from the backend's parser (lint.ts).
const keywords = new Set(KEYWORDS);
const types = new Set([...DECLARATION_TYPES, ...RETURN_TYPES]);
const operatorWords = new Set(OPERATOR_WORDS);
const booleans = new Set(BOOLEANS);
const builtins = new Set(Object.keys(BUILTINS));

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
      if (keywords.has(word)) return "keyword";
      if (types.has(word)) return "typeName";
      if (operatorWords.has(word)) return "operatorKeyword";
      if (booleans.has(word)) return "bool";
      if (builtins.has(word)) return "standard(variableName)";
      return "variableName";
    }
    stream.next();
    return null;
  },
  languageData: { commentTokens: { line: "!" } },
};

export const glossa = StreamLanguage.define(parser);
