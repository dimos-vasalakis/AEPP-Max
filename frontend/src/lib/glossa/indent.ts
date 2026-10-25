import { insertNewlineAndIndent } from "@codemirror/commands";
import {
  getIndentation,
  type IndentContext,
  indentService,
  indentString,
} from "@codemirror/language";
import {
  type ChangeSpec,
  countColumn,
  EditorState,
  Prec,
  type Transaction,
  type TransactionSpec,
} from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { editorLanguage } from "./editorLanguage";
import type { Language } from "./types";
import { normalizeWord } from "./vocabulary";

// Indentation like a desktop IDE: Enter after «ΓΙΑ … ΜΕΧΡΙ 10» or «ΑΝ … ΤΟΤΕ»
// starts the next line one level in, and «ΤΕΛΟΣ_ΑΝ», «ΑΛΛΙΩΣ», «ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ»
// and the like move back to line up with the line that opened their block as
// soon as they're finished (space or Enter).

const FIRST_WORD = /^\s*([\p{L}_][\p{L}\p{N}_]*)/u;

const STRUCTURES = ["ΑΝ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΓΙΑ", "ΟΣΟ", "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ", "ΕΠΙΛΕΞΕ", "ΠΕΡΙΠΤΩΣΗ"];

/** Lines whose following lines go one level in. In ψευδογλώσσα, as in the
 * textbook, an algorithm's statements start at the left edge. */
const OPENERS: Record<Language, Set<string>> = {
  glossa: new Set([...STRUCTURES, "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ"]),
  pseudocode: new Set(STRUCTURES),
};

/** Always at the left edge: the program's and subprograms' sections, or the algorithm's. */
const TOP_LEVEL: Record<Language, Set<string>> = {
  glossa: new Set([
    "ΠΡΟΓΡΑΜΜΑ", "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΣΥΝΑΡΤΗΣΗ", "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ", "ΔΙΑΔΙΚΑΣΙΑ",
    "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ", "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ",
  ]),
  pseudocode: new Set(["ΑΛΓΟΡΙΘΜΟΣ", "ΤΕΛΟΣ", "ΔΕΔΟΜΕΝΑ", "ΑΠΟΤΕΛΕΣΜΑΤΑ"]),
};

type Block = { opens: string[]; end: string };
const IF: Block = { opens: ["ΑΝ"], end: "ΤΕΛΟΣ_ΑΝ" };
const LOOP: Block = { opens: ["ΓΙΑ", "ΟΣΟ"], end: "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ" };
const REPEAT: Block = { opens: ["ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ"], end: "ΜΕΧΡΙΣ_ΟΤΟΥ" };
const SELECT: Block = { opens: ["ΕΠΙΛΕΞΕ"], end: "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ" };

/** Words placed relative to the line that opened their block: [block, levels in from it]. */
const ALIGNED: Record<string, [Block, number]> = {
  ΑΛΛΙΩΣ_ΑΝ: [IF, 0],
  ΑΛΛΙΩΣ: [IF, 0],
  ΤΕΛΟΣ_ΑΝ: [IF, 0],
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ: [LOOP, 0],
  ΜΕΧΡΙΣ_ΟΤΟΥ: [REPEAT, 0],
  ΠΕΡΙΠΤΩΣΗ: [SELECT, 1],
  ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ: [SELECT, 0],
};

/** The line without its comment. */
function code(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === "!") {
      return line.slice(0, i);
    }
  }
  return line;
}

function firstWord(line: string): string | null {
  const match = FIRST_WORD.exec(code(line));
  return match ? normalizeWord(match[1]) : null;
}

/**
 * Whether the lines after `line` (starting with `word`) go one level in. In
 * ψευδογλώσσα a branch may hold its one statement on its own line
 * («Αν x > 0 τότε y ← 1», «αλλιώς y ← 2»): that one opens nothing.
 */
function opens(line: string, word: string, language: Language): boolean {
  if (!OPENERS[language].has(word)) return false;
  if (language === "glossa") return true;
  const words = code(line).trim().split(/\s+/);
  if (word === "ΑΝ" || word === "ΑΛΛΙΩΣ_ΑΝ") return normalizeWord(words[words.length - 1]) === "ΤΟΤΕ";
  if (word === "ΑΛΛΙΩΣ") return words.length === 1;
  return true;
}

/** Whether a finished first word makes its line move (ΤΕΛΟΣ_ΑΝ, ΑΡΧΗ, …). */
function placesItself(word: string | null, language: Language): boolean {
  return word !== null && (word in ALIGNED || TOP_LEVEL[language].has(word));
}

/** The nearest line above that opens `block` and isn't already closed. */
function openerOf(block: Block, above: string[], language: Language): string | null {
  let depth = 0;
  for (const line of above) {
    const word = firstWord(line);
    if (word === null) continue;
    if (TOP_LEVEL[language].has(word)) return null; // don't look past the start of the section
    if (word === block.end) depth += 1;
    else if (block.opens.includes(word) && opens(line, word, language)) {
      if (depth === 0) return line;
      depth -= 1;
    }
  }
  return null;
}

/**
 * The column a line starting with `text` belongs at, given the lines above it
 * (nearest first). `unit` is the width of one level.
 */
export function indentFor(
  text: string,
  above: string[],
  unit: number,
  tabSize: number,
  language: Language = "glossa",
): number {
  const columnOf = (line: string) => countColumn(/^\s*/.exec(line)![0], tabSize);
  const word = firstWord(text);
  if (word !== null && TOP_LEVEL[language].has(word)) return 0;

  const aligned = word === null ? undefined : ALIGNED[word];
  if (aligned) {
    const opener = openerOf(aligned[0], above, language);
    if (opener !== null) return columnOf(opener) + aligned[1] * unit;
  }

  const previous = above.find((line) => code(line).trim());
  if (previous === undefined) return 0;
  let column = columnOf(previous);
  const previousWord = firstWord(previous);
  if (previousWord !== null && opens(previous, previousWord, language)) column += unit;
  if (aligned) column -= unit; // its block's start is missing: one level out
  return Math.max(0, column);
}

function linesAbove(cx: IndentContext, pos: number): string[] {
  const doc = cx.state.doc;
  const line = doc.lineAt(pos);
  const lines: string[] = [];
  // Enter in the middle of a line: the part before the cursor is the line above.
  if (cx.simulatedBreak === pos && pos > line.from) lines.push(line.text.slice(0, pos - line.from));
  for (let n = line.number - 1; n >= 1; n--) lines.push(doc.line(n).text);
  return lines;
}

const service = indentService.of((cx, pos) =>
  indentFor(
    cx.textAfterPos(pos),
    linesAbove(cx, pos),
    cx.unit,
    cx.state.tabSize,
    cx.state.facet(editorLanguage),
  ),
);

/** Moves the line at `pos` to its column if its first word places itself; null if it's already there. */
function reindent(state: EditorState, pos: number): ChangeSpec | null {
  const line = state.doc.lineAt(pos);
  if (!placesItself(firstWord(line.text), state.facet(editorLanguage))) return null;
  const column = getIndentation(state, line.from);
  if (column === null) return null;
  const current = /^\s*/.exec(line.text)![0];
  const wanted = indentString(state, column);
  return current === wanted ? null : { from: line.from, to: line.from + current.length, insert: wanted };
}

const WORD_THEN_SEPARATOR = /^\s*[\p{L}_][\p{L}\p{N}_]*[^\p{L}\p{N}_]$/u;
// A picked suggestion: the word, and the space a keyword brings along (completion.ts).
const WORD_ONLY = /^\s*[\p{L}_][\p{L}\p{N}_]* ?$/u;

// «τελος_αν» followed by a space, or picked from the completion list.
function reindentFinishedWord(tr: Transaction): Transaction | readonly TransactionSpec[] {
  const typed = tr.isUserEvent("input.type");
  if (!tr.docChanged || !(typed || tr.isUserEvent("input.complete"))) return tr;
  const head = tr.newSelection.main.head;
  const line = tr.newDoc.lineAt(head);
  const before = line.text.slice(0, head - line.from);
  if (!(typed ? WORD_THEN_SEPARATOR : WORD_ONLY).test(before)) return tr;
  const change = reindent(tr.state, line.from);
  // `sequential`: the change's positions are in the document after `tr`.
  return change ? [tr, { changes: change, sequential: true }] : tr;
}

/** Enter: first put a finished «ΤΕΛΟΣ_ΑΝ»/«ΑΛΛΙΩΣ»/… in its place, then the usual new line. */
export function newlineAndIndent(view: { state: EditorState; dispatch: (tr: Transaction) => void }): boolean {
  const { state } = view;
  const range = state.selection.main;
  const line = state.doc.lineAt(range.head);
  const word = FIRST_WORD.exec(line.text);
  if (range.empty && word && range.head - line.from >= word[0].length) {
    const change = reindent(state, line.from);
    if (change) view.dispatch(state.update({ changes: change, userEvent: "indent" }));
  }
  return insertNewlineAndIndent(view);
}

export const glossaIndent = [
  service,
  EditorState.transactionFilter.of(reindentFinishedWord),
  Prec.high(keymap.of([{ key: "Enter", run: newlineAndIndent }])),
];
