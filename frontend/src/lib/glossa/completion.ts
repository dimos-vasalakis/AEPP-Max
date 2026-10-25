import {
  acceptCompletion,
  autocompletion,
  closeCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  hasNextSnippetField,
  hasPrevSnippetField,
  moveCompletionSelection,
  nextSnippetField,
  prevSnippetField,
  snippetCompletion,
  startCompletion,
} from "@codemirror/autocomplete";
import { EditorSelection, EditorState, Prec } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";
import { editorLanguage } from "./editorLanguage";
import type { Language } from "./types";
import {
  BOOLEANS,
  BUILTINS,
  DECLARATION_TYPES,
  normalizeWord,
  OPERATOR_WORDS,
  reservedIn,
  RETURN_TYPES,
  spell,
} from "./vocabulary";
import { codeWords } from "./words";

// Keyword and name completion for ΓΛΩΣΣΑ and ψευδογλώσσα. Runs entirely in the
// browser: no requests, no AI. Matching ignores case and accents, so «πρ» offers
// ΠΡΟΓΡΑΜΜΑ. ψευδογλώσσα's words come as the textbook writes them («Τέλος_αν»).

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

/** The same for ψευδογλώσσα (Αλγόριθμος), in the textbook's spelling. */
const PSEUDOCODE_BLOCKS: typeof BLOCKS = [
  {
    label: "Αλγόριθμος",
    detail: "σκελετός αλγορίθμου",
    // ${1} twice: the name after Τέλος follows the one typed after Αλγόριθμος. Δεδομένα
    // and Αποτελέσματα are blocks of their own: an empty // // would be an error.
    template: "Αλγόριθμος ${1}\n${2}\nΤέλος ${1}",
  },
  { label: "Αν", detail: "… τότε … Τέλος_αν", template: "Αν ${} τότε\n\t${}\nΤέλος_αν" },
  {
    label: "Αν … αλλιώς",
    detail: "… τότε … αλλιώς … Τέλος_αν",
    template: "Αν ${} τότε\n\t${}\nαλλιώς\n\t${}\nΤέλος_αν",
  },
  {
    label: "Όσο",
    detail: "… επανάλαβε … Τέλος_επανάληψης",
    template: "Όσο ${} επανάλαβε\n\t${}\nΤέλος_επανάληψης",
  },
  {
    label: "Για",
    detail: "… από … μέχρι … Τέλος_επανάληψης",
    template: "Για ${} από ${} μέχρι ${}\n\t${}\nΤέλος_επανάληψης",
  },
  {
    label: "Αρχή_επανάληψης",
    detail: "… Μέχρις_ότου",
    template: "Αρχή_επανάληψης\n\t${}\nΜέχρις_ότου ${}",
  },
  {
    label: "Επίλεξε",
    detail: "… Περίπτωση … Τέλος_επιλογών",
    template:
      "Επίλεξε ${}\n\tΠερίπτωση ${}\n\t\t${}\n\tΠερίπτωση αλλιώς\n\t\t${}\nΤέλος_επιλογών",
  },
  { label: "Δεδομένα", detail: "// … //", template: "Δεδομένα // ${} //" },
  { label: "Αποτελέσματα", detail: "// … //", template: "Αποτελέσματα // ${} //" },
];

/** Keywords that start a line (besides the BLOCKS above). */
const LINE_START: Record<Language, string[]> = {
  glossa: [
    "ΔΙΑΒΑΣΕ", "ΓΡΑΨΕ", "ΚΑΛΕΣΕ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ", "ΠΕΡΙΠΤΩΣΗ",
    "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ", "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ",
    "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ", "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ",
  ],
  pseudocode: [
    "ΔΙΑΒΑΣΕ", "ΕΜΦΑΝΙΣΕ", "ΕΚΤΥΠΩΣΕ", "ΚΑΛΕΣΕ", "ΑΝΤΙΜΕΤΑΘΕΣΕ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ",
    "ΤΕΛΟΣ_ΑΝ", "ΠΕΡΙΠΤΩΣΗ", "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ", "ΤΕΛΟΣ",
  ].map((word) => spell(word, "pseudocode")),
};
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
  "ΑΝ", "ΑΛΛΙΩΣ_ΑΝ", "ΟΣΟ", "ΓΡΑΨΕ", "ΕΜΦΑΝΙΣΕ", "ΕΚΤΥΠΩΣΕ", "ΑΠΟ", "ΜΕΧΡΙ", "ΜΕ_ΒΗΜΑ",
  "ΜΕΧΡΙΣ_ΟΤΟΥ", "ΕΠΙΛΕΞΕ", ...OPERATOR_WORDS,
]);
/** Lines that list names: `ΔΙΑΒΑΣΕ α, β`, `ΑΚΕΡΑΙΕΣ: α, β`, `Δεδομένα // α, β //`. */
const NAME_LISTS = new Set([
  "ΔΙΑΒΑΣΕ", "ΑΝΤΙΜΕΤΑΘΕΣΕ", "ΔΕΔΟΜΕΝΑ", "ΑΠΟΤΕΛΕΣΜΑΤΑ", ...DECLARATION_TYPES,
]);
const LAST_WORD = /([\p{L}_][\p{L}\p{N}_]*)$/u;
const FIRST_WORD = /^\s*([\p{L}_][\p{L}\p{N}_]*)/u;

/** The place of a word that starts after `before` (the line up to it). */
export function placeOf(before: string, language: Language = "glossa"): Place {
  const text = before.trimEnd();
  if (text === "") return "line-start";
  const first = normalizeWord(FIRST_WORD.exec(text)?.[1] ?? "");
  const lastWord = LAST_WORD.exec(text)?.[1];
  const last = lastWord === undefined ? null : normalizeWord(lastWord);

  let afterValue: boolean;
  if (last === null) {
    // A number, a closing bracket or a string ends a value; a symbol wants one.
    afterValue = /[\d)\]'"]$/.test(text);
  } else if (["ΓΙΑ", "ΔΙΑΒΑΣΕ", "ΚΑΛΕΣΕ", "ΑΝΤΙΜΕΤΑΘΕΣΕ"].includes(last)) {
    return "name";
  } else if (last === "ΠΕΡΙΠΤΩΣΗ") {
    return "case";
  } else if (BEFORE_VALUE.has(last)) {
    afterValue = false;
  } else if (reservedIn(language).has(last) && !BOOLEANS.includes(last) && !(last in BUILTINS)) {
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

/** Words that end their line: no space after them when picked (normalized). */
const LINE_ENDS = new Set([
  "ΤΟΤΕ", "ΕΠΑΝΑΛΑΒΕ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ", "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
  "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ", "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ", "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
  "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ", "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ", ...BOOLEANS,
]);

/** A keyword to pick. Picking it also types the space after it, so the next word can
 * follow at once («ΓΙΑ i ΑΠΟ » ▯); not after a word that ends the line («ΤΟΤΕ»). */
function keywordOption(label: string): Completion {
  return LINE_ENDS.has(normalizeWord(label))
    ? { label, type: "keyword" }
    : { label, apply: `${label} `, type: "keyword" };
}

const snippets = (blocks: typeof BLOCKS) =>
  blocks.map((b) =>
    snippetCompletion(b.template, { label: b.label, detail: b.detail, type: "keyword", boost: 1 }),
  );
const blockOptions: Record<Language, Completion[]> = {
  glossa: snippets(BLOCKS),
  pseudocode: snippets(PSEUDOCODE_BLOCKS),
};
const lineStartOptions: Record<Language, Completion[]> = {
  glossa: [
    ...LINE_START.glossa.map(keywordOption),
    ...DECLARATION_TYPES.map((label) => ({ label, apply: `${label}: `, type: "type" })),
  ],
  pseudocode: LINE_START.pseudocode.map(keywordOption),
};
const functionOptions: Completion[] = Object.entries(BUILTINS).map(([name, detail]) =>
  snippetCompletion(`${name}(\${})`, { label: name, displayLabel: `${name}()`, detail, type: "function" }),
);
const valueWordOptions = (language: Language): Completion[] =>
  [...BOOLEANS, "ΟΧΙ"].map((word) => keywordOption(spell(word, language)));
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
export function namesIn(text: string, skipFrom: number, language: Language = "glossa"): string[] {
  const reserved = reservedIn(language);
  const seen = new Map<string, string>();
  let offset = 0;
  for (const line of text.split("\n")) {
    for (const word of codeWords(line)) {
      if (offset + word.from === skipFrom) continue;
      const key = normalizeWord(word.text);
      if (!reserved.has(key) && !seen.has(key)) seen.set(key, word.text);
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
  language: Language = "glossa",
): Completion[] {
  const prefix = normalizeWord(typed);
  const matches = (o: Completion) => normalizeWord(o.label).startsWith(prefix);
  // A fully typed keyword or name needs no popup. A block or a function still
  // does: accepting adds the rest (ΑΝ → ΑΝ … ΤΕΛΟΣ_ΑΝ, Ε → Ε()).
  const useful = (o: Completion) =>
    matches(o) && (o.type === "function" || normalizeWord(o.label) !== prefix);
  const nameOptions: Completion[] = names.map((label) => ({ label, type: "variable" }));
  const keywords = (words: string[]) =>
    words.map((word) => keywordOption(spell(word, language)));

  switch (place) {
    case "line-start":
      return [
        ...blockOptions[language].filter(matches),
        ...lineStartOptions[language].filter(useful),
        ...nameOptions.filter(useful),
      ];
    case "value":
      return [nameOptions, functionOptions, valueWordOptions(language)].flat().filter(useful);
    case "case":
      return [keywords(["ΑΛΛΙΩΣ"]), nameOptions, functionOptions, valueWordOptions(language)]
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
  const language = context.state.facet(editorLanguage);
  const options = completionOptions(
    word.text,
    placeOf(before, language),
    namesIn(context.state.doc.toString(), word.from, language),
    FIRST_WORD.exec(before)?.[1],
    language,
  );
  return options.length ? { from: word.from, options, filter: false } : null;
}

/** Whether the cursor is in the blanks of an inserted block. */
function inBlock(state: EditorState): boolean {
  return hasNextSnippetField(state) || hasPrevSnippetField(state);
}

/**
 * Enter in a blank that is typed in two places at once («Αλγόριθμος ▯ … Τέλος ▯»):
 * on to the next blank, as Tab does, instead of a new line in both places.
 */
function enterInLinkedBlank(view: EditorView): boolean {
  return view.state.selection.ranges.length > 1 && inBlock(view.state) && nextSnippetField(view);
}

/**
 * A name typed in two linked blanks has a cursor in each. Once the cursor leaves
 * them some other way (an arrow key, a click), it's one cursor again: otherwise
 * whatever comes next would be typed in both places.
 */
const oneCursorAfterBlock = EditorState.transactionFilter.of((tr) => {
  if (tr.newSelection.ranges.length < 2 || !inBlock(tr.startState) || inBlock(tr.state)) return tr;
  // `sequential`: the position is in the document after `tr`.
  return [tr, { selection: EditorSelection.single(tr.newSelection.main.head), sequential: true }];
});

/**
 * Tab or Enter accepts a suggestion; otherwise, inside an inserted block, Tab
 * jumps to the next blank (i → αρχή → τέλος → body); otherwise Tab indents and
 * Enter starts a new line (indent.ts). Ctrl-Space opens the list.
 */
export const glossaAutocomplete = [
  autocompletion({ override: [glossaCompletions], defaultKeymap: false, icons: false }),
  oneCursorAfterBlock,
  Prec.highest(
    keymap.of([
      {
        key: "Tab",
        run: (view: EditorView) => acceptCompletion(view) || nextSnippetField(view),
        shift: prevSnippetField,
      },
      { key: "Enter", run: (view: EditorView) => acceptCompletion(view) || enterInLinkedBlank(view) },
      { key: "ArrowDown", run: moveCompletionSelection(true) },
      { key: "ArrowUp", run: moveCompletionSelection(false) },
      { key: "PageDown", run: moveCompletionSelection(true, "page") },
      { key: "PageUp", run: moveCompletionSelection(false, "page") },
      { key: "Escape", run: closeCompletion },
      { key: "Ctrl-Space", run: startCompletion },
    ]),
  ),
];
