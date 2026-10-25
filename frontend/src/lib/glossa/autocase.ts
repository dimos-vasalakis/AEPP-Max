import { EditorState, Transaction, type TransactionSpec } from "@codemirror/state";
import { inCommentOrString } from "./completion";
import { normalizeWord, RESERVED } from "./vocabulary";

// Writes ΓΛΩΣΣΑ words in capitals as soon as they're finished: typing «γραψε»
// and then a space, Enter or punctuation leaves «ΓΡΑΨΕ». Accents go too
// («αλλιώς_αν» → «ΑΛΛΙΩΣ_ΑΝ»). Names, strings and comments are left alone.

const WORD_BEFORE = /[\p{L}_][\p{L}\p{N}_]*$/u;
const WORD_CHAR = /^[\p{L}\p{N}_]/u;

export type Fix = { from: number; to: number; insert: string };

/**
 * The reserved word ending at `offset` in `lineText`, rewritten in capitals,
 * or null when there's nothing to fix. Offsets are within the line.
 */
export function keywordFix(lineText: string, offset: number): Fix | null {
  const match = WORD_BEFORE.exec(lineText.slice(0, offset));
  if (!match || WORD_CHAR.test(lineText.slice(offset))) return null;
  const from = offset - match[0].length;
  if (inCommentOrString(lineText.slice(0, from))) return null;
  // A ΓΙΑ's counter is a name even when it's «η» or «ε» (counter.ts makes it h, e).
  if (/^\s*ΓΙΑ\s+$/u.test(normalizeWord(lineText.slice(0, from)))) return null;
  const canonical = normalizeWord(match[0]);
  if (!RESERVED.has(canonical) || canonical === match[0]) return null;
  return { from, to: offset, insert: canonical };
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
    const lineFix = keywordFix(line.text, fromB - line.from);
    if (lineFix) {
      fix = { from: line.from + lineFix.from, to: line.from + lineFix.to, insert: lineFix.insert };
    }
  });
  if (!fix || changes !== 1) return tr;
  // `sequential`: the fix's positions are in the document after `tr`.
  return [tr, { changes: fix, sequential: true }];
}

export const glossaAutocase = EditorState.transactionFilter.of(capitalizeOnSeparator);
