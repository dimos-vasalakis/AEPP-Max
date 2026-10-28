import { type ChangeSpec, type EditorState } from "@codemirror/state";
import { getIndentUnit } from "@codemirror/language";
import { SYMBOLS as TEXTBOOK_SYMBOLS } from "./autocase";
import { indentFor } from "./indent";
import type { Language } from "./types";
import { BOOLEANS, BUILTINS, normalizeWord, reservedIn, spell } from "./vocabulary";

// Τακτοποίηση: the code as the textbook lays it out. Each line goes to its
// indentation (indent.ts's rules, line by line from the top), with one space
// between words and around operators, none inside brackets or before a comma,
// and the reserved words spelled as the language writes them (ΓΡΑΨΕ, Τέλος_αν).
// Strings and comments stay exactly as written. A line it can't read safely
// (a string left open, a character the language doesn't have) only gets its
// indentation. Lines are never added or removed. Whitespace is only what the
// lexer skips, spaces and tabs: anything else makes a line unreadable, so an
// error the editor marks never disappears on ▶.

type Token = { kind: "word" | "number" | "string" | "symbol"; text: string };

// Longest first, so «<-» isn't read as «<» and «-».
const SYMBOL_LIST = [
  "<-", "<=", ">=", "<>", "..", "←", "≤", "≥", "≠",
  "<", ">", "=", "+", "-", "*", "/", "^", "(", ")", "[", "]", ",", ":",
];
// Accents may come as separate marks (text pasted from a PDF), as the lexer allows.
const WORD = /^[\p{L}_][\p{L}\p{M}\p{N}_]*/u;
const NUMBER = /^\d+(?:\.\d+)?/;

/** The line's tokens and its comment, or null if it can't be read safely. */
function tokenize(text: string, language: Language): { tokens: Token[]; comment: string } | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const rest = text.slice(i);
    if (ch === " " || ch === "\t") {
      i++;
    } else if (ch === "!") {
      return { tokens, comment: rest.trimEnd() };
    } else if (ch === "'" || ch === '"') {
      const end = text.indexOf(ch, i + 1);
      if (end < 0) return null;
      tokens.push({ kind: "string", text: text.slice(i, end + 1) });
      i = end + 1;
    } else if (NUMBER.test(rest)) {
      const number = NUMBER.exec(rest)![0];
      // «2x» isn't two tokens to space apart: leave the line as it is.
      if (WORD.test(text.slice(i + number.length))) return null;
      tokens.push({ kind: "number", text: number });
      i += number.length;
    } else if (WORD.test(rest)) {
      const word = WORD.exec(rest)![0];
      tokens.push({ kind: "word", text: word });
      i += word.length;
    } else {
      const symbol =
        (language === "pseudocode" && rest.startsWith("//") ? "//" : undefined) ??
        SYMBOL_LIST.find((s) => rest.startsWith(s));
      if (!symbol) return null;
      tokens.push({ kind: "symbol", text: symbol });
      i += symbol.length;
    }
  }
  return { tokens, comment: "" };
}

/** Whether a value ends at `token`, so a «-» after it subtracts rather than negates. */
function endsValue(token: Token, language: Language): boolean {
  if (token.kind === "symbol") return token.text === ")" || token.text === "]";
  if (token.kind !== "word") return true;
  const key = normalizeWord(token.text);
  return !reservedIn(language).has(key) || BOOLEANS.includes(key);
}

/** A name (not a reserved word): a call or an index follows it with no space. */
function isName(token: Token, language: Language): boolean {
  return token.kind === "word" && !reservedIn(language).has(normalizeWord(token.text));
}

function spaceBetween(prev: Token, token: Token, prevUnary: boolean, language: Language): string {
  if (prevUnary) return "";
  if (token.kind === "symbol" && [",", ":", ")", "]", ".."].includes(token.text)) return "";
  if (prev.kind === "symbol" && ["(", "[", ".."].includes(prev.text)) return "";
  if (token.text === "(" && (isName(prev, language) || normalizeWord(prev.text) in BUILTINS)) return "";
  if (token.text === "[" && isName(prev, language)) return "";
  return " ";
}

/** One line's code, without its indentation, laid out; as it was if it can't be read. */
function formatContent(text: string, language: Language): string {
  const read = tokenize(text, language);
  if (!read) return text;
  let out = "";
  let prev: Token | null = null;
  let prevUnary = false;
  for (const token of read.tokens) {
    let written = token.text;
    if (token.kind === "word") {
      const key = normalizeWord(token.text);
      if (reservedIn(language).has(key)) written = spell(key, language);
    } else if (token.kind === "symbol" && language === "pseudocode") {
      written = TEXTBOOK_SYMBOLS[token.text] ?? token.text;
    }
    const unary =
      token.kind === "symbol" &&
      (token.text === "-" || token.text === "+") &&
      (prev === null || !endsValue(prev, language));
    out += (prev === null ? "" : spaceBetween(prev, token, prevUnary, language)) + written;
    prev = token;
    prevUnary = unary;
  }
  if (read.comment) out += (out ? " " : "") + read.comment;
  return out;
}

const IF_GOES_ON = new Set(["ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ"]);
const LEADING = /^[ \t]*/;

/**
 * The lines to leave exactly as written. ψευδογλώσσα's one-line Αν («Αν x > 0 τότε
 * y ← 1») goes on to an αλλιώς_αν, αλλιώς or Τέλος_αν on the line after its
 * statement only when that word is indented at least as far as the Αν
 * (algorithm_parser.py `if_goes_on`), wherever the Αν is on its line: layout
 * decides which Αν an αλλιώς belongs to. So once an algorithm has one (or a line
 * this can't read, which might), the lines that layout is about stay as they are:
 * those with a one-line Αν, those starting with αλλιώς_αν, αλλιώς or Τέλος_αν, and
 * continuation lines. A block Αν («Αν x > 0 τότε» alone, all on one line) is free.
 */
function frozenLines(lines: string[], language: Language): Set<number> {
  const frozen = new Set<number>();
  if (language !== "pseudocode") return frozen;
  const tokens = lines.map((line) => tokenize(line, language)?.tokens ?? null);
  const key = (token: Token) => (token.kind === "word" ? normalizeWord(token.text) : null);
  const continued = (i: number) => i + 1 < lines.length && lines[i + 1].replace(LEADING, "").startsWith("&");
  const oneLineIf = (i: number) => {
    const line = tokens[i];
    if (!line?.some((t) => key(t) === "ΑΝ")) return false;
    const block =
      key(line[0]) === "ΑΝ" &&
      key(line[line.length - 1]) === "ΤΟΤΕ" &&
      line.filter((t) => key(t) === "ΑΝ").length === 1 &&
      !continued(i);
    return !block;
  };
  if (!lines.some((_, i) => tokens[i] === null || oneLineIf(i))) return frozen;
  lines.forEach((line, i) => {
    const first = tokens[i]?.[0];
    if (
      tokens[i] === null ||
      line.replace(LEADING, "").startsWith("&") ||
      (first !== undefined && IF_GOES_ON.has(key(first) ?? "")) ||
      oneLineIf(i)
    ) {
      frozen.add(i);
    }
  });
  return frozen;
}

/** `text` tidied up; `unit` is one indentation level, in spaces. */
export function formatCode(text: string, language: Language = "glossa", unit = 2): string {
  const lines = text.split("\n");
  const out: string[] = [];
  // The statements above, tidied, nearest first: what indentFor reads.
  const above: string[] = [];
  const frozen = frozenLines(lines, language);
  let column = 0;
  for (const [i, line] of lines.entries()) {
    const body = line.replace(LEADING, "");
    if (frozen.has(i)) {
      out.push(line);
      if (!body.startsWith("&")) {
        column = line.length - body.length;
        above.unshift(line);
      }
    } else if (body === "") {
      out.push("");
    } else if (body.startsWith("&")) {
      // A continuation line: one level in from the statement it continues.
      const rest = formatContent(body.slice(1).replace(LEADING, ""), language);
      out.push(" ".repeat(column + unit) + "&" + (rest ? ` ${rest}` : ""));
    } else {
      const content = formatContent(body, language);
      column = indentFor(content, above, unit, unit, language);
      const tidy = " ".repeat(column) + content;
      out.push(tidy);
      above.unshift(tidy);
    }
  }
  return out.join("\n");
}

/** The changes that tidy up `state`'s code, only where it differs, so the cursor stays put. */
export function formatChanges(state: EditorState, language: Language): ChangeSpec[] {
  const doc = state.doc;
  const tidy = formatCode(doc.toString(), language, getIndentUnit(state)).split("\n");
  const changes: ChangeSpec[] = [];
  for (let n = 1; n <= doc.lines; n++) {
    const { from, text } = doc.line(n);
    const wanted = tidy[n - 1];
    if (wanted === text) continue;
    let start = 0;
    while (start < text.length && start < wanted.length && text[start] === wanted[start]) start++;
    let end = 0;
    while (
      end < text.length - start &&
      end < wanted.length - start &&
      text[text.length - 1 - end] === wanted[wanted.length - 1 - end]
    ) {
      end++;
    }
    changes.push({ from: from + start, to: from + text.length - end, insert: wanted.slice(start, wanted.length - end) });
  }
  return changes;
}
