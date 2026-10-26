import { type ChangeSpec, EditorState, type Text, type Transaction } from "@codemirror/state";
import { editorLanguage } from "./editorLanguage";
import { normalizeWord } from "./vocabulary";

// An algorithm's name is written twice, «Αλγόριθμος Μέγιστο … Τέλος Μέγιστο».
// Renaming one side renames the other, at any time, not only in a freshly
// inserted block, and in the same undo step. Only while the two names matched
// before the edit: a name typed after Τέλος for the first time never rewrites
// the header.

// Indentation, the word, the spaces after it, the name (possibly empty).
const LINE = /^(\s*)([\p{L}_][\p{L}\p{N}_]*)([^\S\n]*)([\p{L}\p{N}_]*)/u;

/** Where a name is (or would go), in document positions; `word` is just after Αλγόριθμος/Τέλος. */
type Name = { word: number; from: number; to: number; text: string; spaced: boolean };
type Pair = { opener: Name; closer: Name };

function nameOn(doc: Text, n: number, keyword: string): Name | null {
  const line = doc.line(n);
  const match = LINE.exec(line.text);
  if (!match || normalizeWord(match[2]) !== keyword) return null;
  const word = line.from + match[1].length + match[2].length;
  const from = word + match[3].length;
  return { word, from, to: from + match[4].length, text: match[4], spaced: match[3].length > 0 };
}

/** Each Αλγόριθμος line with the Τέλος that ends it, in order. */
export function namePairs(doc: Text): Pair[] {
  const pairs: Pair[] = [];
  let open: Name | null = null;
  for (let n = 1; n <= doc.lines; n++) {
    const opener = nameOn(doc, n, "ΑΛΓΟΡΙΘΜΟΣ");
    if (opener) {
      open = opener;
      continue;
    }
    const closer = open && nameOn(doc, n, "ΤΕΛΟΣ");
    if (open && closer) {
      pairs.push({ opener: open, closer });
      open = null;
    }
  }
  return pairs;
}

/** The change that writes `text` as `target`'s name. */
function rename(target: Name, text: string): ChangeSpec {
  // «Τέλος» with no space yet needs one before the name.
  if (!target.spaced && text) return { from: target.word, to: target.to, insert: ` ${text}` };
  return { from: target.from, to: target.to, insert: text };
}

function syncNames(tr: Transaction) {
  if (!tr.docChanged || tr.startState.facet(editorLanguage) !== "pseudocode") return tr;
  const before = namePairs(tr.startState.doc);
  const after = namePairs(tr.newDoc);
  if (before.length !== after.length) return tr;

  // What the transaction changed, in the new document's positions.
  const changed: [number, number][] = [];
  tr.changes.iterChangedRanges((_fromA, _toA, from, to) => changed.push([from, to]), true);
  // The name, ends included: typing at the end of it, or right after the word, counts.
  const touched = (name: Name) => changed.some(([from, to]) => from <= name.to && to >= name.word);

  const changes: ChangeSpec[] = [];
  after.forEach(({ opener, closer }, i) => {
    const old = before[i];
    // The same two lines as before: a «Τέλος» half-way to «Τέλος_αν» isn't this algorithm's end.
    const same =
      tr.changes.mapPos(old.opener.word) === opener.word &&
      tr.changes.mapPos(old.closer.word) === closer.word;
    if (!same || normalizeWord(old.opener.text) !== normalizeWord(old.closer.text)) return;
    if (opener.text === closer.text) return;
    const [header, end] = [touched(opener), touched(closer)];
    // Both at once: the inserted block's two cursors, or the agent rewriting the code.
    if (header && !end) changes.push(rename(closer, opener.text));
    else if (end && !header) changes.push(rename(opener, closer.text));
  });
  // `sequential`: the positions are in the document after `tr`.
  return changes.length ? [tr, { changes, sequential: true }] : tr;
}

export const glossaEndName = EditorState.transactionFilter.of(syncNames);
