import {
  acceptCompletion,
  autocompletion,
  closeCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  moveCompletionSelection,
  nextSnippetField,
  prevSnippetField,
  snippetCompletion,
  startCompletion,
} from "@codemirror/autocomplete";
import { Prec } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";
import {
  BOOLEANS,
  BUILTINS,
  DECLARATION_TYPES,
  normalizeWord,
  RESERVED,
  RETURN_TYPES,
} from "./vocabulary";

// Keyword and name completion for ΓΛΩΣΣΑ. Runs entirely in the browser: no
// requests, no AI. Matching ignores case and accents, so «πρ» offers ΠΡΟΓΡΑΜΜΑ.

/** Whole structures, offered when the word starts a line. `${…}` are Tab stops. */
const BLOCKS: { label: string; detail: string; template: string }[] = [
  {
    label: "ΠΡΟΓΡΑΜΜΑ",
    detail: "σκελετός προγράμματος",
    template:
      "ΠΡΟΓΡΑΜΜΑ ${όνομα}\nΜΕΤΑΒΛΗΤΕΣ\n\tΑΚΕΡΑΙΕΣ: ${x}\nΑΡΧΗ\n\t${}\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
  },
  { label: "ΑΝ", detail: "… ΤΟΤΕ … ΤΕΛΟΣ_ΑΝ", template: "ΑΝ ${συνθήκη} ΤΟΤΕ\n\t${}\nΤΕΛΟΣ_ΑΝ" },
  {
    label: "ΑΝ … ΑΛΛΙΩΣ",
    detail: "… ΤΟΤΕ … ΑΛΛΙΩΣ … ΤΕΛΟΣ_ΑΝ",
    template: "ΑΝ ${συνθήκη} ΤΟΤΕ\n\t${}\nΑΛΛΙΩΣ\n\t${}\nΤΕΛΟΣ_ΑΝ",
  },
  {
    label: "ΟΣΟ",
    detail: "… ΕΠΑΝΑΛΑΒΕ … ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
    template: "ΟΣΟ ${συνθήκη} ΕΠΑΝΑΛΑΒΕ\n\t${}\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
  },
  {
    label: "ΓΙΑ",
    detail: "… ΑΠΟ … ΜΕΧΡΙ … ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
    template: "ΓΙΑ ${i} ΑΠΟ ${αρχή} ΜΕΧΡΙ ${τέλος}\n\t${}\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
  },
  {
    label: "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ",
    detail: "… ΜΕΧΡΙΣ_ΟΤΟΥ",
    template: "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ\n\t${}\nΜΕΧΡΙΣ_ΟΤΟΥ ${συνθήκη}",
  },
  {
    label: "ΕΠΙΛΕΞΕ",
    detail: "… ΠΕΡΙΠΤΩΣΗ … ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
    template:
      "ΕΠΙΛΕΞΕ ${έκφραση}\n\tΠΕΡΙΠΤΩΣΗ ${τιμή}\n\t\t${}\n\tΠΕΡΙΠΤΩΣΗ ΑΛΛΙΩΣ\n\t\t${}\nΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
  },
  {
    label: "ΣΥΝΑΡΤΗΣΗ",
    detail: "… ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ",
    template:
      "ΣΥΝΑΡΤΗΣΗ ${όνομα}(${παράμετροι}): ${ΑΚΕΡΑΙΑ}\nΜΕΤΑΒΛΗΤΕΣ\n\t${}\nΑΡΧΗ\n\t${}\nΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ",
  },
  {
    label: "ΔΙΑΔΙΚΑΣΙΑ",
    detail: "… ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ",
    template:
      "ΔΙΑΔΙΚΑΣΙΑ ${όνομα}(${παράμετροι})\nΜΕΤΑΒΛΗΤΕΣ\n\t${}\nΑΡΧΗ\n\t${}\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ",
  },
];

/** Keywords that start a line (besides the BLOCKS above). */
const LINE_START = [
  "ΔΙΑΒΑΣΕ", "ΓΡΑΨΕ", "ΚΑΛΕΣΕ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ", "ΠΕΡΙΠΤΩΣΗ",
  "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ", "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ",
  "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ", "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ",
];
/** Keywords that come after something on the line. Η (or) is left out: one letter. */
const MID_LINE = [
  "ΤΟΤΕ", "ΑΠΟ", "ΜΕΧΡΙ", "ΜΕ_ΒΗΜΑ", "ΕΠΑΝΑΛΑΒΕ", "ΑΛΛΙΩΣ", "ΚΑΙ", "ΟΧΙ", "DIV", "MOD",
  ...BOOLEANS,
  ...RETURN_TYPES,
];

const blockOptions = BLOCKS.map((b) =>
  snippetCompletion(b.template, { label: b.label, detail: b.detail, type: "keyword", boost: 1 }),
);
const lineStartOptions: Completion[] = [
  ...LINE_START.map((label) => ({ label, type: "keyword" })),
  ...DECLARATION_TYPES.map((label) => ({ label, apply: `${label}: `, type: "type" })),
];
const midLineOptions: Completion[] = [
  ...MID_LINE.map((label) => ({ label, type: "keyword" })),
  ...Object.entries(BUILTINS).map(([name, detail]) =>
    snippetCompletion(`${name}(\${})`, { label: name, detail, type: "function" }),
  ),
];

const WORD = /[\p{L}_][\p{L}\p{N}_]*/gu;

/** True when `lineBefore` (the line up to the cursor) ends inside a comment or string. */
export function inCommentOrString(lineBefore: string): boolean {
  let quote: string | null = null;
  for (const ch of lineBefore) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === "!") {
      return true;
    }
  }
  return quote !== null;
}

/** Names the student already used, spelled as they first wrote them. */
export function namesIn(text: string, skipFrom: number): string[] {
  const seen = new Map<string, string>();
  for (const match of text.matchAll(WORD)) {
    if (match.index === skipFrom) continue; // the word being typed
    const key = normalizeWord(match[0]);
    if (!RESERVED.has(key) && !seen.has(key)) seen.set(key, match[0]);
  }
  return [...seen.values()];
}

/** What to offer for the word `typed`, in display order. */
export function completionOptions(
  typed: string,
  atLineStart: boolean,
  names: string[],
): Completion[] {
  const prefix = normalizeWord(typed);
  const matches = (label: string) => normalizeWord(label).startsWith(prefix);
  // A fully typed keyword or name needs no popup; a block still does (ΑΝ → whole ΑΝ … ΤΕΛΟΣ_ΑΝ).
  const useful = (o: Completion) => matches(o.label) && normalizeWord(o.label) !== prefix;
  const nameOptions: Completion[] = names.map((label) => ({ label, type: "variable" }));
  return atLineStart
    ? [
        ...blockOptions.filter((o) => matches(o.label)),
        ...lineStartOptions.filter(useful),
        ...nameOptions.filter(useful),
      ]
    : [...midLineOptions.filter(useful), ...nameOptions.filter(useful)];
}

function glossaCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\p{L}_][\p{L}\p{N}_]*/u);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, word.from - line.from);
  if (inCommentOrString(before)) return null;
  const options = completionOptions(
    word.text,
    before.trim() === "",
    namesIn(context.state.doc.toString(), word.from),
  );
  return options.length ? { from: word.from, options, filter: false } : null;
}

/**
 * Tab accepts a suggestion; otherwise, inside an inserted block, it jumps to the
 * next blank (i → αρχή → τέλος → body); otherwise it indents. Enter stays a plain
 * new line, so typing a word and pressing Enter never inserts a suggestion by
 * surprise. Ctrl-Space opens the list.
 */
export const glossaAutocomplete = [
  autocompletion({ override: [glossaCompletions], defaultKeymap: false, icons: false }),
  Prec.highest(
    keymap.of([
      {
        key: "Tab",
        run: (view: EditorView) => acceptCompletion(view) || nextSnippetField(view),
        shift: prevSnippetField,
      },
      { key: "ArrowDown", run: moveCompletionSelection(true) },
      { key: "ArrowUp", run: moveCompletionSelection(false) },
      { key: "PageDown", run: moveCompletionSelection(true, "page") },
      { key: "PageUp", run: moveCompletionSelection(false, "page") },
      { key: "Escape", run: closeCompletion },
      { key: "Ctrl-Space", run: startCompletion },
    ]),
  ),
];
