// The words of ΓΛΩΣΣΑ and of ψευδογλώσσα, for highlighting and autocomplete. The
// backend's lexer (backend/app/glossa/lexer.py) is the real definition; keep these in sync.
import type { Language } from "./types";

export const KEYWORDS = [
  "ΠΡΟΓΡΑΜΜΑ", "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ", "ΣΤΑΘΕΡΕΣ", "ΜΕΤΑΒΛΗΤΕΣ", "ΑΡΧΗ",
  "ΔΙΑΒΑΣΕ", "ΓΡΑΨΕ",
  "ΑΝ", "ΤΟΤΕ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ",
  "ΕΠΙΛΕΞΕ", "ΠΕΡΙΠΤΩΣΗ", "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
  "ΓΙΑ", "ΑΠΟ", "ΜΕΧΡΙ", "ΜΕ_ΒΗΜΑ", "ΟΣΟ", "ΕΠΑΝΑΛΑΒΕ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
  "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ",
  "ΣΥΝΑΡΤΗΣΗ", "ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ", "ΔΙΑΔΙΚΑΣΙΑ", "ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ", "ΚΑΛΕΣΕ",
];
/** As in declarations: `ΑΚΕΡΑΙΕΣ: x`. */
export const DECLARATION_TYPES = ["ΑΚΕΡΑΙΕΣ", "ΠΡΑΓΜΑΤΙΚΕΣ", "ΧΑΡΑΚΤΗΡΕΣ", "ΛΟΓΙΚΕΣ"];
/** As a function's return type: `ΣΥΝΑΡΤΗΣΗ Φ(α): ΑΚΕΡΑΙΑ`. */
export const RETURN_TYPES = ["ΑΚΕΡΑΙΑ", "ΠΡΑΓΜΑΤΙΚΗ", "ΧΑΡΑΚΤΗΡΑΣ", "ΛΟΓΙΚΗ"];
export const OPERATOR_WORDS = ["DIV", "MOD", "ΚΑΙ", "Η", "ΟΧΙ"];
export const BOOLEANS = ["ΑΛΗΘΗΣ", "ΨΕΥΔΗΣ"];
export const BUILTINS: Record<string, string> = {
  "Α_Μ": "ακέραιο μέρος",
  "Α_Τ": "απόλυτη τιμή",
  "Τ_Ρ": "τετραγωνική ρίζα",
  "ΗΜ": "ημίτονο (μοίρες)",
  "ΣΥΝ": "συνημίτονο (μοίρες)",
  "ΕΦ": "εφαπτομένη (μοίρες)",
  "ΛΟΓ": "φυσικός λογάριθμος",
  "Ε": "e υψωμένο σε δύναμη",
};

/** Uppercase without accents, so `αλλιώς_αν` and `ΑΛΛΙΩΣ_ΑΝ` match (ς → Σ too). */
export function normalizeWord(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

/** Every word that can't be a variable name. */
export const RESERVED = new Set([
  ...KEYWORDS,
  ...DECLARATION_TYPES,
  ...RETURN_TYPES,
  ...OPERATOR_WORDS,
  ...BOOLEANS,
  ...Object.keys(BUILTINS),
]);

/** ψευδογλώσσα (the editor's Αλγόριθμοι), normalized: no declarations or subprogram kinds. */
export const PSEUDOCODE_KEYWORDS = [
  "ΑΛΓΟΡΙΘΜΟΣ", "ΤΕΛΟΣ", "ΔΕΔΟΜΕΝΑ", "ΑΠΟΤΕΛΕΣΜΑΤΑ",
  "ΔΙΑΒΑΣΕ", "ΓΡΑΨΕ", "ΕΜΦΑΝΙΣΕ", "ΕΚΤΥΠΩΣΕ", "ΑΝΤΙΜΕΤΑΘΕΣΕ",
  "ΑΝ", "ΤΟΤΕ", "ΑΛΛΙΩΣ_ΑΝ", "ΑΛΛΙΩΣ", "ΤΕΛΟΣ_ΑΝ",
  "ΕΠΙΛΕΞΕ", "ΠΕΡΙΠΤΩΣΗ", "ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ",
  "ΓΙΑ", "ΑΠΟ", "ΜΕΧΡΙ", "ΜΕ_ΒΗΜΑ", "ΟΣΟ", "ΕΠΑΝΑΛΑΒΕ", "ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
  "ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ", "ΜΕΧΡΙΣ_ΟΤΟΥ", "ΚΑΛΕΣΕ",
];

/**
 * How the textbook writes ψευδογλώσσα's words (ΓΛΩΣΣΑ's are all capitals), as
 * autocase and autocomplete write them. The backend's algorithm_parser.py
 * SPELLING has the same list.
 */
export const PSEUDOCODE_SPELLING: Record<string, string> = {
  ΑΛΓΟΡΙΘΜΟΣ: "Αλγόριθμος", ΤΕΛΟΣ: "Τέλος", ΔΕΔΟΜΕΝΑ: "Δεδομένα", ΑΠΟΤΕΛΕΣΜΑΤΑ: "Αποτελέσματα",
  ΔΙΑΒΑΣΕ: "Διάβασε", ΓΡΑΨΕ: "Γράψε", ΕΜΦΑΝΙΣΕ: "Εμφάνισε", ΕΚΤΥΠΩΣΕ: "Εκτύπωσε",
  ΑΝΤΙΜΕΤΑΘΕΣΕ: "Αντιμετάθεσε", ΑΝ: "Αν", ΤΟΤΕ: "τότε", ΑΛΛΙΩΣ_ΑΝ: "αλλιώς_αν",
  ΑΛΛΙΩΣ: "αλλιώς", ΤΕΛΟΣ_ΑΝ: "Τέλος_αν", ΕΠΙΛΕΞΕ: "Επίλεξε", ΠΕΡΙΠΤΩΣΗ: "Περίπτωση",
  ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ: "Τέλος_επιλογών", ΓΙΑ: "Για", ΑΠΟ: "από", ΜΕΧΡΙ: "μέχρι",
  ΜΕ_ΒΗΜΑ: "με_βήμα", ΟΣΟ: "Όσο", ΕΠΑΝΑΛΑΒΕ: "επανάλαβε", ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ: "Τέλος_επανάληψης",
  ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ: "Αρχή_επανάληψης", ΜΕΧΡΙΣ_ΟΤΟΥ: "Μέχρις_ότου", ΚΑΛΕΣΕ: "Κάλεσε",
  ΚΑΙ: "και", Η: "ή", ΟΧΙ: "όχι", DIV: "div", MOD: "mod", ΑΛΗΘΗΣ: "Αληθής", ΨΕΥΔΗΣ: "Ψευδής",
};

/** Every ψευδογλώσσα word that can't be a variable name. */
export const PSEUDOCODE_RESERVED = new Set([
  ...PSEUDOCODE_KEYWORDS,
  ...OPERATOR_WORDS,
  ...BOOLEANS,
  ...Object.keys(BUILTINS),
]);

export function reservedIn(language: Language): Set<string> {
  return language === "pseudocode" ? PSEUDOCODE_RESERVED : RESERVED;
}

/** A reserved word (normalized) as `language` writes it: ΓΛΩΣΣΑ in capitals, ψευδογλώσσα as the textbook. */
export function spell(word: string, language: Language): string {
  return language === "pseudocode" ? (PSEUDOCODE_SPELLING[word] ?? word) : word;
}
