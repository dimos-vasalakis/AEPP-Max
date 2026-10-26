"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { createProgram, type Program, programError, updateProgram } from "@/lib/api/programs";
import type { Language } from "@/lib/glossa/types";

/**
 * The saved program an editor holds. `saved` is its code as the server last
 * stored it, so the editor has unsaved changes while its code differs.
 */
export type ProgramFile = {
  id: string;
  title: string;
  saved: string;
  status: "saved" | "saving" | "error";
  /** Why the last save failed, and the code it tried: no retry until the code changes. */
  error?: string;
  failed?: string;
};

type Files = Record<Language, ProgramFile | null>;

// After the last keystroke, as Google Docs does: often enough that nothing is lost.
const AUTOSAVE_MS = 1500;
const NONE: Files = { glossa: null, pseudocode: null };
const LANGUAGES: Language[] = ["glossa", "pseudocode"];

/**
 * Which saved program each editor (Πρόγραμμα, Αλγόριθμος) holds, if any, and its
 * saving. A linked editor saves itself shortly after each change. Signing out or
 * into another account unlinks both: their programs aren't this user's.
 */
export function useProgramFiles(
  codes: Record<Language, string>,
  language: Language,
  userId: string | null | undefined,
) {
  const [files, setFiles] = useState<Files>(NONE);

  // Adjusted during render, not in an effect: no frame shows another account's file.
  const [owner, setOwner] = useState(userId);
  if (userId !== undefined && userId !== owner) {
    setOwner(userId);
    if (owner !== undefined) setFiles(NONE);
  }

  /** Changes `language`'s file, if it is still program `id`. */
  const patch = useCallback(
    (lang: Language, id: string, change: Partial<ProgramFile> | null) =>
      setFiles((all) => {
        const file = all[lang];
        if (file?.id !== id) return all;
        return { ...all, [lang]: change === null ? null : { ...file, ...change } };
      }),
    [],
  );

  // The save in flight per program, so settle() can wait for it: two requests racing
  // could store the older code last.
  const inflight = useRef(new Map<string, Promise<string | null>>());

  /** Saves `code` into program `id`; resolves to an error message, or null. */
  const save = useCallback(
    (lang: Language, id: string, code: string): Promise<string | null> => {
      const request = (async () => {
        patch(lang, id, { status: "saving" });
        try {
          await updateProgram(id, { code });
          patch(lang, id, { saved: code, status: "saved", error: undefined, failed: undefined });
          return null;
        } catch (err) {
          const message = programError(err);
          // Deleted elsewhere: the code stays in the editor, now unsaved.
          if (err instanceof ApiError && err.status === 404) patch(lang, id, null);
          else patch(lang, id, { status: "error", error: message, failed: code });
          return message;
        } finally {
          inflight.current.delete(id);
        }
      })();
      inflight.current.set(id, request);
      return request;
    },
    [patch],
  );

  // Autosave, both editors, one request at a time each; a failed save waits for the
  // next change (or «Ξαναδοκίμασε»).
  useEffect(() => {
    const timers = LANGUAGES.flatMap((lang) => {
      const file = files[lang];
      const code = codes[lang];
      if (!file || file.status === "saving" || code === file.saved) return [];
      if (file.status === "error" && code === file.failed) return [];
      return [setTimeout(() => void save(lang, file.id, code), AUTOSAVE_MS)];
    });
    return () => timers.forEach(clearTimeout);
  }, [files, codes, save]);

  const file = files[language];

  // Leaving with changes the server doesn't have yet: the browser asks first.
  useEffect(() => {
    const unsaved = (Object.keys(files) as Language[]).some(
      (lang) => files[lang] !== null && codes[lang] !== files[lang]?.saved,
    );
    if (!unsaved) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [files, codes]);

  return {
    /** The current editor's file; null while its code isn't a saved program. */
    file,
    fileOf: (lang: Language) => files[lang],
    /** Saves `lang`'s changes now (Ctrl/Cmd+S, «Ξαναδοκίμασε»). */
    flush(lang: Language = language) {
      const target = files[lang];
      if (target && target.status !== "saving" && codes[lang] !== target.saved) {
        void save(lang, target.id, codes[lang]);
      }
    },
    /**
     * Before `lang`'s code is replaced: waits for a save in flight, then saves what the
     * editor holds now if the server doesn't have it. Resolves to an error message if
     * the changes couldn't be saved (the caller asks before dropping them), or null.
     */
    async settle(lang: Language = language): Promise<string | null> {
      const target = files[lang];
      if (!target) return null;
      const code = codes[lang];
      const pending = inflight.current.get(target.id);
      // After a save in flight, save again: it may have carried older code, or failed.
      if (pending) await pending;
      else if (code === target.saved && target.status === "saved") return null;
      return save(lang, target.id, code);
    },
    /** Saves the current editor as a new program and links it. Resolves to an error message, or null. */
    async saveAs(title: string): Promise<string | null> {
      const lang = language;
      const sent = codes[lang];
      try {
        const program = await createProgram({ title, code: sent, language: lang });
        setFiles((all) => ({
          ...all,
          [lang]: { id: program.id, title: program.title, saved: sent, status: "saved" },
        }));
        return null;
      } catch (err) {
        return programError(err);
      }
    },
    /** `program` was just opened into its own editor. */
    link(program: Program) {
      setFiles((all) => ({
        ...all,
        [program.language]: {
          id: program.id,
          title: program.title,
          saved: program.code,
          status: "saved",
        },
      }));
    },
    /** The editor no longer holds a saved program (Κενή σελίδα, Νέο). */
    unlink(lang: Language = language) {
      setFiles((all) => ({ ...all, [lang]: null }));
    },
    /** A program was renamed (here or in «Τα προγράμματά μου»). */
    renamed(id: string, title: string) {
      for (const lang of Object.keys(files) as Language[]) patch(lang, id, { title });
    },
    /** A program was deleted: an editor holding it keeps the code, unsaved. */
    deleted(id: string) {
      for (const lang of Object.keys(files) as Language[]) patch(lang, id, null);
    },
  };
}
