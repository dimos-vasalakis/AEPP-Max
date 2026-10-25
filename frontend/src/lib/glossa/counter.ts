import {
  type ChangeSpec,
  EditorState,
  StateField,
  type Text,
  Transaction,
  type TransactionSpec,
} from "@codemirror/state";
import { normalizeWord, RESERVED } from "./vocabulary";
import { codeWords } from "./words";

// Students write ΓΙΑ with the Greek keyboard on, so the counter they mean as
// «i» comes out «ι». When a ΓΙΑ's counter is a single Greek letter it becomes
// the Latin letter on the same key (ι → i, ξ → j, κ → k), everywhere in that
// program or subprogram: the declaration at the top too. Longer names stay.
// After that, a «ι» typed anywhere else in that program becomes «i» as well,
// once it's finished: by typing what comes after it, or by moving the cursor
// away (a click, an arrow key, typing over an auto-closed «]» in «Α[ι]»).

const GREEK_KEYS = "ςερτυθιοπασδφγηξκλζχψωβνμ";
const LATIN_KEYS = "wertyuiopasdfghjklzxcvbnm";

const FOR_COUNTER = /^(\s*)([\p{L}_][\p{L}\p{N}_]*)(\s+)([\p{L}_][\p{L}\p{N}_]*)/u;
const UNIT_HEADERS = new Set(["ΠΡΟΓΡΑΜΜΑ", "ΣΥΝΑΡΤΗΣΗ", "ΔΙΑΔΙΚΑΣΙΑ"]);

/** The Latin letter on the same key as a one-letter Greek name, or null. */
export function latinCounter(name: string): string | null {
  const plain = name.normalize("NFD").replace(/\p{M}/gu, "");
  const lower = plain.toLowerCase();
  const key = [...lower].length === 1 ? GREEK_KEYS.indexOf(lower) : -1;
  if (key < 0) return null;
  return plain === lower ? LATIN_KEYS[key] : LATIN_KEYS[key].toUpperCase();
}

/** Where a ΓΙΑ line's counter is, within the line. */
export function forCounter(line: string): { from: number; to: number; name: string } | null {
  const match = FOR_COUNTER.exec(line);
  if (!match || normalizeWord(match[2]) !== "ΓΙΑ") return null;
  const from = match[1].length + match[2].length + match[3].length;
  return { from, to: from + match[4].length, name: match[4] };
}

/** Line numbers of the program or subprogram that contains line `n`. */
function unitAround(doc: Text, n: number): [number, number] {
  const isHeader = (k: number) => {
    const word = /^\s*([\p{L}_][\p{L}\p{N}_]*)/u.exec(doc.line(k).text);
    return word !== null && UNIT_HEADERS.has(normalizeWord(word[1]));
  };
  let first = n;
  while (first > 1 && !isHeader(first)) first -= 1;
  let last = n;
  while (last < doc.lines && !isHeader(last + 1)) last += 1;
  return [first, last];
}

/** Where `name` is used in lines `first`…`last`. */
function usesOf(doc: Text, first: number, last: number, name: string): { from: number; to: number }[] {
  const key = normalizeWord(name);
  const uses: { from: number; to: number }[] = [];
  for (let k = first; k <= last; k++) {
    const line = doc.line(k);
    for (const word of codeWords(line.text)) {
      const from = line.from + word.from;
      if (normalizeWord(word.text) === key) uses.push({ from, to: from + word.text.length });
    }
  }
  return uses;
}

/** Every use of `name` in the unit around line `n`, renamed to `to`. */
export function renameInUnit(doc: Text, n: number, name: string, to: string): ChangeSpec[] {
  const [first, last] = unitAround(doc, n);
  return usesOf(doc, first, last, name).map((use) => ({ ...use, insert: to }));
}

/**
 * A one-letter Greek word that ends at `end` and is on the key of a Latin ΓΙΑ
 * counter in its unit («ΓΡΑΨΕ ι» inside «ΓΙΑ i …»): the change to that
 * counter. Not when the Greek name is used elsewhere in the unit (then it's a
 * variable of its own), nor for «η» and «ε», which are also OR and e^x.
 */
export function counterTypo(doc: Text, end: number): ChangeSpec | null {
  const line = doc.lineAt(end);
  const word = codeWords(line.text).find((w) => line.from + w.from + w.text.length === end);
  if (!word || RESERVED.has(normalizeWord(word.text))) return null;
  const latin = latinCounter(word.text);
  if (!latin) return null;
  const [first, last] = unitAround(doc, line.number);
  let counter: string | null = null;
  for (let k = first; k <= last && !counter; k++) {
    const found = forCounter(doc.line(k).text);
    if (found && normalizeWord(found.name) === normalizeWord(latin)) counter = found.name;
  }
  if (!counter || usesOf(doc, first, last, word.text).length > 1) return null;
  const from = line.from + word.from;
  return { from, to: from + word.text.length, insert: counter };
}

/**
 * Where the student's last keystroke left the cursor, while it stays there.
 * Leaving a word only finishes it if it was just typed: moving through pasted
 * or older code must not rewrite it.
 */
const justTyped = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    if (tr.docChanged && tr.isUserEvent("input.type")) return tr.newSelection.main.head;
    if (tr.docChanged && value !== null) return tr.changes.mapPos(value);
    return tr.selection ? null : value;
  },
});

/**
 * The cursor just left the end of a one-letter Greek word, just typed, without
 * changing the text: that finishes the word as much as typing a space after it.
 */
function leftTypo(tr: Transaction): ChangeSpec | null {
  if (tr.docChanged || !tr.selection || !tr.annotation(Transaction.userEvent)) return null;
  // Read-only (the agent is writing): a filter's added changes would get through.
  if (tr.startState.readOnly) return null;
  const before = tr.startState.selection.main;
  if (tr.startState.field(justTyped, false) !== before.head) return null;
  const after = tr.newSelection.main;
  if (!before.empty) return null;
  const change = counterTypo(tr.startState.doc, before.head) as { from: number; to: number } | null;
  if (!change) return null;
  // Still on the word (e.g. ← onto it): not finished yet.
  if (after.empty && after.head >= change.from && after.head <= change.to) return null;
  return change;
}

function latinizeCounter(tr: Transaction): Transaction | readonly TransactionSpec[] {
  const left = leftTypo(tr);
  if (left) return [tr, { changes: left, sequential: true }];
  const typed =
    tr.isUserEvent("input.type") ||
    tr.isUserEvent("input.complete") ||
    tr.annotation(Transaction.userEvent) === "input"; // Enter
  if (!tr.docChanged || !typed) return tr;

  const doc = tr.newDoc;
  const head = tr.newSelection.main.head;
  const touched = new Set<number>();
  const finished: number[] = []; // where a separator was typed right after a word
  tr.changes.iterChanges((_fromA, _toA, fromB, toB, inserted) => {
    for (let n = doc.lineAt(fromB).number; n <= doc.lineAt(toB).number; n++) touched.add(n);
    if (/^[^\p{L}\p{N}_]/u.test(inserted.toString())) finished.push(fromB);
  });

  let changes: ChangeSpec | ChangeSpec[] | null = null;
  for (const n of touched) {
    const line = doc.line(n);
    const counter = forCounter(line.text);
    const latin = counter && latinCounter(counter.name);
    if (!counter || !latin) continue;
    // Wait until the counter is finished: not while the cursor is still on it.
    if (head >= line.from + counter.from && head <= line.from + counter.to) continue;
    changes = renameInUnit(doc, n, counter.name, latin);
    break;
  }
  for (const end of finished) changes ??= counterTypo(doc, end);
  // `sequential`: the positions are in the document after `tr`.
  return changes ? [tr, { changes, sequential: true }] : tr;
}

export const glossaCounter = [justTyped, EditorState.transactionFilter.of(latinizeCounter)];
