// The words of ΓΛΩΣΣΑ, for highlighting and autocomplete. The backend's lexer
// (backend/app/glossa/lexer.py) is the real definition; keep these in sync.

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
