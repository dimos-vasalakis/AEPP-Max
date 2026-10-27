// Code a signed-out student asked to save, kept in this browser (localStorage) while
// they sign in: the login page (and a magic link's new tab) leaves the IDE, which
// would otherwise lose it. The IDE takes it back once, then forgets it.
import type { Language } from "@/lib/glossa/types";

const KEY = "aepp-pending-save";
// A sign-in takes minutes; older code was left behind on purpose.
const MAX_AGE_MS = 60 * 60 * 1000;

export type PendingSave = { language: Language; code: string };

export function stashForSignIn(pending: PendingSave) {
  if (!pending.code.trim()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...pending, at: Date.now() }));
  } catch {
    // Storage blocked: the code stays only in the open page.
  }
}

/**
 * The stashed code if `accept` takes it, which removes it; null if there is none, it
 * is stale (also removed), or `accept` declines (kept for the next visit). With `keep`
 * (still signed out) it stays for the sign-in, but is given back only once: a
 * reload doesn't bring back code the student has since cleared.
 */
export function takePendingSave(
  now: number,
  accept: (pending: PendingSave) => boolean = () => true,
  keep = false,
): PendingSave | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const { language, code, at, shown } = JSON.parse(raw);
    const fresh = typeof at === "number" && now - at < MAX_AGE_MS;
    const valid = typeof code === "string" && code.trim() !== "";
    if (!fresh || !valid || (language !== "glossa" && language !== "pseudocode")) {
      localStorage.removeItem(KEY);
      return null;
    }
    const pending: PendingSave = { language, code };
    if ((keep && shown) || !accept(pending)) return null;
    if (keep) localStorage.setItem(KEY, JSON.stringify({ language, code, at, shown: true }));
    else localStorage.removeItem(KEY);
    return pending;
  } catch {
    try {
      localStorage.removeItem(KEY); // malformed
    } catch {
      // storage blocked
    }
    return null;
  }
}
