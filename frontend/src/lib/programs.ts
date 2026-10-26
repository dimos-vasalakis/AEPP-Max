// Saved programs: the pure helpers behind «Τα προγράμματά μου» (lib/api/programs.ts calls the API).
import { normalizeWord } from "@/lib/glossa/vocabulary";
import type { Language } from "@/lib/glossa/types";

/** The backend's limit on a title (schemas/program.py). */
export const MAX_TITLE = 120;

/**
 * The name the code gives itself, as a title to save it under: `ΠΡΟΓΡΑΜΜΑ Εμβαδόν`
 * or `Αλγόριθμος Εμβαδόν` on the first line that isn't blank or a comment. "" when
 * there is none.
 */
export function titleFromCode(code: string, language: Language): string {
  const header = language === "glossa" ? "ΠΡΟΓΡΑΜΜΑ" : "ΑΛΓΟΡΙΘΜΟΣ";
  for (const raw of code.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("!")) continue;
    const [first, name] = line.split(/\s+/);
    if (normalizeWord(first) !== header || !name) return "";
    return name.slice(0, MAX_TITLE);
  }
  return "";
}

/** «Αντίγραφο του …», cut to fit. */
export function copyTitle(title: string): string {
  return `Αντίγραφο του ${title}`.slice(0, MAX_TITLE);
}

/** Search ignores case and accents, as autocomplete does. */
export function matchesSearch(title: string, query: string): boolean {
  return normalizeWord(title).includes(normalizeWord(query.trim()));
}

const DATE = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short", year: "numeric" });

/** When a program was last saved, as a student says it: «πριν από 5 λεπτά», «χθες», «3 Μαΐ 2026». */
export function timeAgo(iso: string, now: number): string {
  const then = new Date(iso);
  const minutes = Math.floor((now - then.getTime()) / 60_000);
  if (minutes < 1) return "μόλις τώρα";
  if (minutes < 60) return minutes === 1 ? "πριν από 1 λεπτό" : `πριν από ${minutes} λεπτά`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "πριν από 1 ώρα" : `πριν από ${hours} ώρες`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "χθες";
  if (days < 7) return `πριν από ${days} μέρες`;
  return DATE.format(then);
}

/** Πρόγραμμα or Αλγόριθμος, as the navbar's switch names them. */
export const LANGUAGE_NAME: Record<Language, string> = {
  glossa: "Πρόγραμμα",
  pseudocode: "Αλγόριθμος",
};
