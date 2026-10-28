import { EditorState, type Text, Transaction, type TransactionSpec } from "@codemirror/state";
import { inCommentOrString } from "./completion";
import { editorLanguage } from "./editorLanguage";
import { greekKeyword } from "./latin";
import type { Language } from "./types";
import { DECLARATION_TYPES, normalizeWord, reservedIn, spell } from "./vocabulary";
import { codeWords } from "./words";

// Writes ΓΛΩΣΣΑ words in capitals as soon as they're finished: typing «γραψε»
// and then a space, Enter or punctuation leaves «ΓΡΑΨΕ». Accents go too
// («αλλιώς_αν» → «ΑΛΛΙΩΣ_ΑΝ»). In ψευδογλώσσα the words take the textbook's
// spelling instead («τελος_αν» → «Τέλος_αν»). A word typed with the keyboard
// still on English becomes the Greek one («grace» or «grapse» → «ΓΡΑΨΕ», latin.ts).
// ψευδογλώσσα's «<-», «<=», «>=» and «<>» become ← ≤ ≥ ≠ as they're typed.
// Names, strings and comments are left alone, Latin names included («arxi»
// stays a name once declared or used elsewhere).

const WORD_BEFORE = /[\p{L}_][\p{L}\p{N}_]*$/u;
const WORD_CHAR = /^[\p{L}\p{N}_]/u;

const DECLARATION = new RegExp(`^\\s*(${DECLARATION_TYPES.join("|")})\\s*:`, "u");

export type Fix = { from: number; to: number; insert: string };

/** Whether `word` is in `doc`'s code anywhere but at `at`, ignoring case: a Latin name of the student's. */
export function nameElsewhere(doc: Text, word: string, at: number): boolean {
  const key = word.toLowerCase();
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    for (const w of codeWords(line.text)) {
      if (line.from + w.from !== at && w.text.toLowerCase() === key) return true;
    }
  }
  return false;
}

/**
 * The reserved word ending at `offset` in `lineText` (or its Latin spelling),
 * rewritten in capitals (ΓΛΩΣΣΑ) or as the textbook writes it (ψευδογλώσσα), or null when there's
 * nothing to fix. Offsets are within the line. `doc` and `lineFrom` let a Latin
 * spelling that is a name used elsewhere stay a name.
 */
export function keywordFix(
  lineText: string,
  offset: number,
  language: Language = "glossa",
  doc?: Text,
  lineFrom = 0,
): Fix | null {
  const match = WORD_BEFORE.exec(lineText.slice(0, offset));
  if (!match || WORD_CHAR.test(lineText.slice(offset))) return null;
  const from = offset - match[0].length;
  if (inCommentOrString(lineText.slice(0, from))) return null;
  // A ΓΙΑ's counter is a name even when it's «η» or «ε» (counter.ts makes it h, e).
  if (/^\s*ΓΙΑ\s+$/u.test(normalizeWord(lineText.slice(0, from)))) return null;
  let key: string | null = normalizeWord(match[0]);
  if (!reservedIn(language).has(key)) {
    key = greekKeyword(match[0], language);
    if (key === null || !latinMeantGreek(key, lineText, from, offset)) return null;
    if (doc && nameElsewhere(doc, match[0], lineFrom + from)) return null;
  }
  const canonical = spell(key, language);
  return canonical === match[0] ? null : { from, to: offset, insert: canonical };
}

/**
 * Whether a Latin word that spells `key` is the keyword rather than a name: not
 * in a declaration («ΑΚΕΡΑΙΕΣ: arxi»), and ΑΡΧΗ only alone on its line, finished
 * with Enter (a space after «arxi» may be followed by «<- 1»).
 */
function latinMeantGreek(key: string, lineText: string, from: number, to: number): boolean {
  if (DECLARATION.test(normalizeWord(lineText.slice(0, from)))) return false;
  if (key === "ΑΡΧΗ") return lineText.slice(0, from).trim() === "" && lineText.slice(to) === "";
  return true;
}

/** ψευδογλώσσα's symbols as the textbook prints them (the lexer reads both spellings alike). */
export const SYMBOLS: Record<string, string> = { "<-": "←", "<=": "≤", ">=": "≥", "<>": "≠" };

/**
 * In ψευδογλώσσα, the two-character symbol ending at `offset` («<-», «<=», «>=»,
 * «<>») as the textbook writes it (← ≤ ≥ ≠), or null. Not in strings or comments.
 */
export function symbolFix(lineText: string, offset: number, language: Language): Fix | null {
  if (language !== "pseudocode" || offset < 2) return null;
  const symbol = SYMBOLS[lineText.slice(offset - 2, offset)];
  if (!symbol || inCommentOrString(lineText.slice(0, offset - 2))) return null;
  return { from: offset - 2, to: offset, insert: symbol };
}

function capitalizeOnSeparator(tr: Transaction): Transaction | readonly TransactionSpec[] {
  // Typing, and Enter (which is plain "input"); not pastes, completions or undo.
  const typed = tr.isUserEvent("input.type") || tr.annotation(Transaction.userEvent) === "input";
  if (!tr.docChanged || !typed) return tr;

  let fix: Fix | null = null;
  let changes = 0;
  tr.changes.iterChanges((_fromA, _toA, fromB, _toB, inserted) => {
    changes += 1;
    const text = inserted.toString();
    if (!text || WORD_CHAR.test(text)) return;
    const line = tr.newDoc.lineAt(fromB);
    const language = tr.startState.facet(editorLanguage);
    const lineFix =
      keywordFix(line.text, fromB - line.from, language, tr.newDoc, line.from) ??
      (text.length === 1 ? symbolFix(line.text, fromB - line.from + 1, language) : null);
    if (lineFix) {
      fix = { from: line.from + lineFix.from, to: line.from + lineFix.to, insert: lineFix.insert };
    }
  });
  if (!fix || changes !== 1) return tr;
  // `sequential`: the fix's positions are in the document after `tr`.
  return [tr, { changes: fix, sequential: true }];
}

export const glossaAutocase = EditorState.transactionFilter.of(capitalizeOnSeparator);
