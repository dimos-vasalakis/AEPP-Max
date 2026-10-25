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
  OPERATOR_WORDS,
  RESERVED,
  RETURN_TYPES,
} from "./vocabulary";
import { codeWords } from "./words";

// Keyword and name completion for ΓΛΩΣΣΑ. Runs entirely in the browser: no
// requests, no AI. Matching ignores case and accents, so «πρ» offers ΠΡΟΓΡΑΜΜΑ.

/** Whole structures, offered when the word starts a line. `${}` are empty Tab stops: the
 * student fills them in, nothing is pre-written (ΓΙΑ ▯ ΑΠΟ ▯ ΜΕΧΡΙ ▯). */
const BLOCKS: { label: string; detail: string; template: string }[] = [
  {
    label: "ΠΡΟΓΡΑΜΜΑ",
    detail: "σκελετός προγράμματος",
    template:
      "ΠΡΟΓΡΑΜΜΑ ${}\nΜΕΤΑΒΛΗΤΕΣ\n\t${}\nΑΡΧΗ\n\t${}\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
  },
  { label: "ΑΝ", detail: "… ΤΟΤΕ … ΤΕΛΟΣ_ΑΝ", template: "ΑΝ ${} ΤΟΤΕ\n\t${}\nΤΕΛΟΣ_ΑΝ" },
  {
    label: "ΑΝ … ΑΛΛΙΩΣ",
    detail: "… ΤΟΤΕ … ΑΛΛΙΩΣ … ΤΕΛΟΣ_ΑΝ",
    template: "ΑΝ ${} ΤΟΤΕ\n\t${}\nΑΛΛΙΩΣ\n\t${}\nΤΕΛΟΣ_ΑΝ",
  },
  {
    label: "ΟΣΟ",
    detail: "… ΕΠΑΝΑΛΑΒΕ … ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
    template: "ΟΣΟ ${} ΕΠΑΝΑΛΑΒΕ\n\t${}\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
  },
  {
    label: "ΓΙΑ",
    detail: "… ΑΠΟ … ΜΕΧΡΙ … ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
    template: "ΓΙΑ ${} ΑΠΟ ${} ΜΕΧΡΙ ${}\n\t${}\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
  },
  {
    label: "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ",
    detail: "… ΜΕΧΡΙΣ_ΟΤΟΥ",
    template: "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ\n\t${}\nΜΕΧΡΙΣ_ΟΤΟΥ ${}",
  },
  {
    label: "ΕΠΙΛΕΞΕ",
    detail: "… ΠΕΡΙΠΤΩΣΗ … ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
    template:
      "ΕΠΙΛΕΞΕ ${}\n\tΠΕΡΙΠΤΩΣΗ ${}\n\t\t${}\n\tΠΕΡΙΠΤΩΣΗ ΑΛΛΙΩΣ\n\t\t${}\nΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
  },
  {
    label: "ΣΥΝΑΡΤΗΣΗ",
    detail: "… ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ",
    template:
      "ΣΥΝΑΡΤΗΣΗ ${}(${}): ${}\nΜΕΤΑΒΛΗΤΕΣ\n\t${}\nΑΡΧΗ\n\t${}\nΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ",
  },
  {
    label: "ΔΙΑΔΙΚΑΣΙΑ",
    detail: "… ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ",
    template:
      "ΔΙΑΔΙΚΑΣΙΑ ${}(${})\nΜΕΤΑΒΛΗΤΕΣ\n\t${}\nΑΡΧΗ\n\t${}\nΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ",
  },
];

/** Keywords that start a line (besides the BLOCKS above). */
const LINE_START = [
  "ΔΙΑΒΑΣΕ", "ΓΡΑΨΕ", "ΚΑΛΕΣΕ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ", "ΠΕΡΙΠΤΩΣΗ",
  "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ", "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ",
  "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ", "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ",
];
/** Where the cursor's word is, which decides what fits there. */
export type Place =
  | "line-start" // a statement or section: ΓΡΑΨΕ, ΑΝ …, a name to assign to
  | "value" // a value is expected: after <-, ΓΡΑΨΕ, ΑΝ, (, an operator, …
  | "after-value" // right after a value: ΤΟΤΕ, ΑΠΟ, ΜΕΧΡΙ, ΚΑΙ, MOD, …
  | "name" // only a variable fits: after ΓΙΑ, ΔΙΑΒΑΣΕ, in a declaration
  | "case" // after ΠΕΡΙΠΤΩΣΗ: a value or ΑΛΛΙΩΣ
  | "return-type" // after «ΣΥΝΑΡΤΗΣΗ Φ(α):»
  | "none"; // after a word that ends the statement (ΤΟΤΕ, ΕΠΑΝΑΛΑΒΕ, …)

/** Words after which a value comes. */
const BEFORE_VALUE = new Set([
  "ΑΝ", "ΑΛΛΙΩΣ_ΑΝ", "ΟΣΟ", "ΓΡΑΨΕ", "ΑΠΟ", "ΜΕΧΡΙ", "ΜΕ_ΒΗΜΑ", "ΜΕΧΡΙΣ_ΟΤΟΥ", "ΕΠΙΛΕΞΕ",
  ...OPERATOR_WORDS,
]);
/** Lines that list names: `ΔΙΑΒΑΣΕ α, β`, `ΑΚΕΡΑΙΕΣ: α, β`. */
const NAME_LISTS = new Set(["ΔΙΑΒΑΣΕ", ...DECLARATION_TYPES]);
const LAST_WORD = /([\p{L}_][\p{L}\p{N}_]*)$/u;
const FIRST_WORD = /^\s*([\p{L}_][\p{L}\p{N}_]*)/u;

/** The place of a word that starts after `before` (the line up to it). */
export function placeOf(before: string): Place {
  const text = before.trimEnd();
  if (text === "") return "line-start";
  const first = normalizeWord(FIRST_WORD.exec(text)?.[1] ?? "");
  const lastWord = LAST_WORD.exec(text)?.[1];
  const last = lastWord === undefined ? null : normalizeWord(lastWord);

  let afterValue: boolean;
  if (last === null) {
    // A number, a closing bracket or a string ends a value; a symbol wants one.
    afterValue = /[\d)\]'"]$/.test(text);
  } else if (last === "ΓΙΑ" || last === "ΔΙΑΒΑΣΕ" || last === "ΚΑΛΕΣΕ") {
    return "name";
  } else if (last === "ΠΕΡΙΠΤΩΣΗ") {
    return "case";
  } else if (BEFORE_VALUE.has(last)) {
    afterValue = false;
  } else if (RESERVED.has(last) && !BOOLEANS.includes(last) && !(last in BUILTINS)) {
    return "none";
  } else {
    afterValue = true; // a name or ΑΛΗΘΗΣ
  }

  if (afterValue) return "after-value";
  if (first === "ΣΥΝΑΡΤΗΣΗ" && /\)\s*:$/.test(text)) return "return-type";
  if (NAME_LISTS.has(first)) return "name";
  return "value";
}

/** What may follow a value, by the statement it's in. */
function continuations(first: string): string[] {
  const operators = ["ΚΑΙ", "DIV", "MOD"]; // Η (or) is left out: one letter
  if (first === "ΓΙΑ") return ["ΑΠΟ", "ΜΕΧΡΙ", "ΜΕ_ΒΗΜΑ", ...operators];
  if (first === "ΑΝ" || first === "ΑΛΛΙΩΣ_ΑΝ") return ["ΤΟΤΕ", ...operators];
  if (first === "ΟΣΟ") return ["ΕΠΑΝΑΛΑΒΕ", ...operators];
  return operators;
}

const blockOptions = BLOCKS.map((b) =>
  snippetCompletion(b.template, { label: b.label, detail: b.detail, type: "keyword", boost: 1 }),
);
const lineStartOptions: Completion[] = [
  ...LINE_START.map((label) => ({ label, type: "keyword" })),
  ...DECLARATION_TYPES.map((label) => ({ label, apply: `${label}: `, type: "type" })),
];
const functionOptions: Completion[] = Object.entries(BUILTINS).map(([name, detail]) =>
  snippetCompletion(`${name}(\${})`, { label: name, displayLabel: `${name}()`, detail, type: "function" }),
);
const valueWordOptions: Completion[] = [...BOOLEANS, "ΟΧΙ"].map((label) => ({ label, type: "keyword" }));
const returnTypeOptions: Completion[] = RETURN_TYPES.map((label) => ({ label, type: "type" }));

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

/**
 * Names the student already used in code, spelled as they first wrote them.
 * Words in comments and strings aren't names. `skipFrom` is where the word
 * being typed starts.
 */
export function namesIn(text: string, skipFrom: number): string[] {
  const seen = new Map<string, string>();
  let offset = 0;
  for (const line of text.split("\n")) {
    for (const word of codeWords(line)) {
      if (offset + word.from === skipFrom) continue;
      const key = normalizeWord(word.text);
      if (!RESERVED.has(key) && !seen.has(key)) seen.set(key, word.text);
    }
    offset += line.length + 1;
  }
  return [...seen.values()];
}

/** What to offer for the word `typed` at `place`, in display order. */
export function completionOptions(
  typed: string,
  place: Place,
  names: string[],
  lineFirstWord = "",
): Completion[] {
  const prefix = normalizeWord(typed);
  const matches = (o: Completion) => normalizeWord(o.label).startsWith(prefix);
  // A fully typed keyword or name needs no popup. A block or a function still
  // does: accepting adds the rest (ΑΝ → ΑΝ … ΤΕΛΟΣ_ΑΝ, Ε → Ε()).
  const useful = (o: Completion) =>
    matches(o) && (o.type === "function" || normalizeWord(o.label) !== prefix);
  const nameOptions: Completion[] = names.map((label) => ({ label, type: "variable" }));
  const keywords = (labels: string[]) => labels.map((label) => ({ label, type: "keyword" }));

  switch (place) {
    case "line-start":
      return [
        ...blockOptions.filter(matches),
        ...lineStartOptions.filter(useful),
        ...nameOptions.filter(useful),
      ];
    case "value":
      return [nameOptions, functionOptions, valueWordOptions].flat().filter(useful);
    case "case":
      return [keywords(["ΑΛΛΙΩΣ"]), nameOptions, functionOptions, valueWordOptions]
        .flat()
        .filter(useful);
    case "after-value":
      return keywords(continuations(normalizeWord(lineFirstWord))).filter(useful);
    case "name":
      return nameOptions.filter(useful);
    case "return-type":
      return returnTypeOptions.filter(useful);
    case "none":
      return [];
  }
}

function glossaCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\p{L}_][\p{L}\p{N}_]*/u);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, word.from - line.from);
  if (inCommentOrString(before)) return null;
  const options = completionOptions(
    word.text,
    placeOf(before),
    namesIn(context.state.doc.toString(), word.from),
    FIRST_WORD.exec(before)?.[1],
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
