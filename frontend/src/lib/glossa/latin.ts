import type { Language } from "./types";
import { BUILTINS, reservedIn } from "./vocabulary";

// Students often type a keyword with the keyboard still on English: «grace»
// (the keys of ΓΡΑΨΕ on the Greek layout) or greeklish such as «algorithmos»,
// «diavase» or «telos_an». autocase.ts turns those into the Greek word.

/** The Latin ways to write each Greek letter: its key on the Greek layout, and greeklish. */
const LATIN: Record<string, string[]> = {
  Α: ["a"], Β: ["b", "v"], Γ: ["g"], Δ: ["d"], Ε: ["e"], Ζ: ["z"], Η: ["h", "i"],
  Θ: ["th", "u"], Ι: ["i"], Κ: ["k"], Λ: ["l"], Μ: ["m"], Ν: ["n"], Ξ: ["ks", "x", "j"],
  Ο: ["o"], Π: ["p"], Ρ: ["r"], Σ: ["s", "w"], Τ: ["t"], Υ: ["y", "u", "i"], Φ: ["f", "ph"],
  Χ: ["x", "ch", "h", "kh"], Ψ: ["ps", "c"], Ω: ["w", "o", "v"], _: ["_"],
};

const LATIN_WORD = /^[a-z_]+$/i;

/**
 * The words worth converting, with the Latin spellings each accepts. Not the
 * one-letter ones (Η is also «h», a counter's name), the Latin DIV/MOD, the
 * built-in functions (ΣΥΝ, ΛΟΓ or ΗΜ written in Latin are too likely a name) or
 * ψευδογλώσσα's ΤΕΛΟΣ («telos ← n» is a name). autocase.ts also keeps declared
 * and already used Latin names.
 */
function patterns(language: Language): [RegExp, string][] {
  const builtins = new Set(Object.keys(BUILTINS));
  return [...reservedIn(language)]
    .filter(
      (word) =>
        word.length > 1 && !LATIN_WORD.test(word) && !builtins.has(word) && word !== "ΤΕΛΟΣ",
    )
    .map((word) => {
      const letters = [...word].map((letter) => `(?:${LATIN[letter].join("|")})`).join("");
      return [new RegExp(`^${letters}$`, "i"), word];
    });
}

const PATTERNS: Record<Language, [RegExp, string][]> = {
  glossa: patterns("glossa"),
  pseudocode: patterns("pseudocode"),
};

/** The reserved word (normalized) that the Latin `word` was meant to be, or null. */
export function greekKeyword(word: string, language: Language): string | null {
  if (!LATIN_WORD.test(word)) return null;
  for (const [pattern, greek] of PATTERNS[language]) {
    if (pattern.test(word)) return greek;
  }
  return null;
}
