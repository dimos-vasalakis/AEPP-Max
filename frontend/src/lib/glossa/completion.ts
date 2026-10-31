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
import { codeWords, lastWord } from "./words";

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
    label: "ΓΙΑ … ΜΕ_ΒΗΜΑ",
    detail: "… ΑΠΟ … ΜΕΧΡΙ … ΜΕ_ΒΗΜΑ … ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
    template: "ΓΙΑ ${} ΑΠΟ ${} ΜΕΧΡΙ ${} ΜΕ_ΒΗΜΑ ${}\n\t${}\nΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
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
    label: "Για … με_βήμα",
    detail: "… από … μέχρι … με_βήμα … Τέλος_επανάληψης",
    template: "Για ${} από ${} μέχρι ${} με_βήμα ${}\n\t${}\nΤέλος_επανάληψης",
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
  | "declaration" // a line in ΜΕΤΑΒΛΗΤΕΣ: only the four types
  | "header" // between ΠΡΟΓΡΑΜΜΑ and ΑΡΧΗ: only the sections (ΣΤΑΘΕΡΕΣ, ΜΕΤΑΒΛΗΤΕΣ, ΑΡΧΗ)
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
const FIRST_WORD = /^\s*([\p{L}_][\p{L}\p{N}_]*)/u;

/** The place of a word that starts after `before` (the line up to it). */
export function placeOf(before: string, language: Language = "glossa"): Place {
  const text = before.trimEnd();
  if (text === "") return "line-start";
  const first = normalizeWord(FIRST_WORD.exec(text)?.[1] ?? "");
  const word = lastWord(text);
  const last = word === undefined ? null : normalizeWord(word);

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

/** Words that start a section of a program or subprogram (normalized). */
const SECTIONS = new Set([
  "ΠΡΟΓΡΑΜΜΑ", "ΣΥΝΑΡΤΗΣΗ", "ΔΙΑΔΙΚΑΣΙΑ", "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ",
  "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ", "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ",
]);

/** True when the line after `textBefore` (the document up to that line) is in a
 * ΜΕΤΑΒΛΗΤΕΣ section: the nearest section word above it is ΜΕΤΑΒΛΗΤΕΣ. */
export function inDeclarations(textBefore: string): boolean {
  const lines = textBefore.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const first = normalizeWord(FIRST_WORD.exec(lines[i])?.[1] ?? "");
    if (SECTIONS.has(first)) return first === "ΜΕΤΑΒΛΗΤΕΣ";
  }
  return false;
}

/** True when the line after `textBefore` is in a unit's header: the nearest section word
 * above it opens the unit or its ΣΤΑΘΕΡΕΣ, so no statement can come before ΑΡΧΗ. */
export function inHeader(textBefore: string): boolean {
  const lines = textBefore.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const first = normalizeWord(FIRST_WORD.exec(lines[i])?.[1] ?? "");
    if (SECTIONS.has(first)) return ["ΠΡΟΓΡΑΜΜΑ", "ΣΥΝΑΡΤΗΣΗ", "ΔΙΑΔΙΚΑΣΙΑ", "ΣΤΑΘΕΡΕΣ"].includes(first);
  }
  return false;
}

/** True when the line after `textBefore` is in a unit's body: the nearest section word
 * above it is ΑΡΧΗ. Declarations are over there. */
export function inBody(textBefore: string): boolean {
  const lines = textBefore.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const first = normalizeWord(FIRST_WORD.exec(lines[i])?.[1] ?? "");
    if (SECTIONS.has(first)) return first === "ΑΡΧΗ";
  }
  return false;
}

const DECLARATION_SECTIONS = new Set(["ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ"]);

/** Blocks that are whole units: they go after ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ, never inside one. */
const UNIT_BLOCKS = new Set(["ΣΥΝΑΡΤΗΣΗ", "ΔΙΑΔΙΚΑΣΙΑ"]);

/** True when the line after `textBefore` is between units: the nearest section word
 * above it ends the program or a subprogram (ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ, …). Subprograms
 * come after the program, so the top of the code isn't between units. */
export function betweenUnits(textBefore: string): boolean {
  const lines = textBefore.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const first = normalizeWord(FIRST_WORD.exec(lines[i])?.[1] ?? "");
    if (SECTIONS.has(first)) return first.startsWith("ΤΕΛΟΣ_");
  }
  return false;
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
  glossa: LINE_START.glossa.map(keywordOption),
  pseudocode: LINE_START.pseudocode.map(keywordOption),
};
const declarationOptions: Completion[] = DECLARATION_TYPES.map((label) => ({
  label,
  apply: `${label}: `,
  type: "type",
}));
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
 * Words in comments and strings aren't names, and neither is the program's own name. `skipFrom` is where the word
 * being typed starts.
 */
export function namesIn(text: string, skipFrom: number, language: Language = "glossa"): string[] {
  const reserved = reservedIn(language);
  const seen = new Map<string, string>();
  let offset = 0;
  for (const line of text.split("\n")) {
    const words = codeWords(line);
    // The program's name (ΠΡΟΓΡΑΜΜΑ Demos) can't be used in the code: never offered.
    const programName = normalizeWord(words[0]?.text ?? "") === "ΠΡΟΓΡΑΜΜΑ" ? words[1] : undefined;
    for (const word of words) {
      if (word === programName || offset + word.from === skipFrom) continue;
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
  /** Offer ΣΥΝΑΡΤΗΣΗ and ΔΙΑΔΙΚΑΣΙΑ (only between units, `betweenUnits`). */
  units = true,
  /** Offer ΣΤΑΘΕΡΕΣ and ΜΕΤΑΒΛΗΤΕΣ (not in a body, `inBody`). */
  declarations = true,
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
        ...blockOptions[language].filter((o) => matches(o) && (units || !UNIT_BLOCKS.has(o.label))),
        ...lineStartOptions[language].filter(
          (o) => useful(o) && (declarations || !DECLARATION_SECTIONS.has(normalizeWord(o.label))),
        ),
        ...nameOptions.filter(useful),
      ];
    case "declaration":
      return declarationOptions.filter(useful);
    case "header":
      return keywords(["ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ"]).filter(useful);
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
  let place = placeOf(before, language);
  let units = true;
  let declarations = true;
  // In ΜΕΤΑΒΛΗΤΕΣ only a type starts a line; the statements belong after ΑΡΧΗ.
  if (place === "line-start" && language === "glossa") {
    const above = context.state.doc.sliceString(0, line.from);
    if (inDeclarations(above)) place = "declaration";
    else if (inHeader(above)) place = "header";
    units = betweenUnits(above);
    declarations = !inBody(above);
  }
  const options = completionOptions(
    word.text,
    place,
    namesIn(context.state.doc.toString(), word.from, language),
    FIRST_WORD.exec(before)?.[1],
    language,
    units,
    declarations,
  );
  return options.length ? { from: word.from, options, filter: false } : null;
}

/** Whether the cursor is in the blanks of an inserted block. */
function inBlock(state: EditorState): boolean {
  return hasNextSnippetField(state) || hasPrevSnippetField(state);
}

/**
 * → at the end of a blank goes on to the next one (ΓΙΑ i▯ ΑΠΟ ▯: one press, not
 * five), and ← at its start back to the one before. Anywhere else in the blank the
 * arrows just move the cursor. The blank ends where one more step would leave it.
 */
export function arrowToBlank(dir: 1 | -1) {
  return (view: EditorView): boolean => {
    const { state } = view;
    if (!(dir > 0 ? hasNextSnippetField(state) : hasPrevSnippetField(state))) return false;
    if (state.selection.ranges.some((r) => !r.empty)) return false;
    const stepped = EditorSelection.create(
      state.selection.ranges.map((r) =>
        EditorSelection.cursor(Math.max(0, Math.min(state.doc.length, r.head + dir))),
      ),
      state.selection.mainIndex,
    );
    if (inBlock(state.update({ selection: stepped }).state)) return false;
    return jumpToBlank(view, dir);
  };
}

/**
 * On to the next blank (or back to the one before) with a cursor, as an arrow key
 * moves: the field commands select the whole blank, as Tab should, so what's there
 * would be typed over. The cursor goes to the start of the next blank, the end of
 * the one before. As a "select", like any arrow key, so counter.ts still turns a
 * Greek counter just typed into the Latin letter.
 */
function jumpToBlank(view: EditorView, dir: 1 | -1): boolean {
  const { state } = view;
  return (dir > 0 ? nextSnippetField : prevSnippetField)({
    state,
    dispatch: (tr) =>
      view.dispatch(
        state.update({
          selection: EditorSelection.create(
            tr.selection!.ranges.map((r) => EditorSelection.cursor(dir > 0 ? r.from : r.to)),
            tr.selection!.mainIndex,
          ),
          effects: tr.effects,
          scrollIntoView: true,
          userEvent: "select",
        }),
      ),
  });
}

/**
 * Enter in a blank of a block's first line («ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10▯», «ΑΝ ▯ ΤΟΤΕ»,
 * «Αλγόριθμος ▯» typed in two places): on to the next blank, the body, as Tab
 * does. A new line there would break the line in two, inside the blank. In a
 * blank alone on its line (a body), Enter starts a new line as usual.
 */
export function enterInHeaderBlank(view: EditorView): boolean {
  const { state } = view;
  if (state.readOnly || !hasNextSnippetField(state)) return false;
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  // The blank's extent on this line: as far as the cursor can go and stay in it.
  const inside = (pos: number) => inBlock(state.update({ selection: EditorSelection.cursor(pos) }).state);
  let from = head;
  while (from > line.from && inside(from - 1)) from--;
  let to = head;
  while (to < line.to && inside(to + 1)) to++;
  const alone = !line.text.slice(0, from - line.from).trim() && !line.text.slice(to - line.from).trim();
  return !alone && jumpToBlank(view, 1);
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
 * (→ at a blank's end, Enter on a block's first line) jumps to the next blank
 * (i → αρχή → τέλος → body); otherwise Tab indents and Enter starts a new line
 * (indent.ts). Ctrl-Space opens the list.
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
      { key: "Enter", run: (view: EditorView) => acceptCompletion(view) || enterInHeaderBlank(view) },
      { key: "ArrowRight", run: arrowToBlank(1) },
      { key: "ArrowLeft", run: arrowToBlank(-1) },
      { key: "ArrowDown", run: moveCompletionSelection(true) },
      { key: "ArrowUp", run: moveCompletionSelection(false) },
      { key: "PageDown", run: moveCompletionSelection(true, "page") },
      { key: "PageUp", run: moveCompletionSelection(false, "page") },
      { key: "Escape", run: closeCompletion },
      { key: "Ctrl-Space", run: startCompletion },
    ]),
  ),
];
