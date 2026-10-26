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
  /** Why the last save failed. */
  error?: string;
};

type Files = Record<Language, ProgramFile | null>;

const NONE: Files = { glossa: null, pseudocode: null };

/**
 * Which saved program each editor (Πρόγραμμα, Αλγόριθμος) holds, if any, and its
 * saving. Changes are saved only when the student saves (Ctrl/Cmd+S, Αποθήκευση),
 * as students asked. Signing out or into another account unlinks both: their
 * programs aren't this user's.
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

  // The save in flight per program and the code it sends, so unsaved() can wait for it,
  // and newer code saved meanwhile, sent once it's done: two requests racing could
  // store the older code last.
  const inflight = useRef(new Map<string, { code: string; request: Promise<string | null> }>());
  const queued = useRef(new Map<string, string>());
  // The code each program's last successful save stored, for unsaved() after waiting.
  const stored = useRef(new Map<string, string>());

  /** Saves `code` into program `id`; resolves to an error message, or null. */
  const save = useCallback(
    function send(lang: Language, id: string, code: string): Promise<string | null> {
      const request = (async () => {
        patch(lang, id, { status: "saving" });
        try {
          await updateProgram(id, { code });
          stored.current.set(id, code);
          patch(lang, id, { saved: code, status: "saved", error: undefined });
          return null;
        } catch (err) {
          const message = programError(err);
          // Deleted elsewhere: the code stays in the editor, now unsaved.
          if (err instanceof ApiError && err.status === 404) {
            patch(lang, id, null);
            queued.current.delete(id);
          } else patch(lang, id, { status: "error", error: message });
          return message;
        } finally {
          inflight.current.delete(id);
          const next = queued.current.get(id);
          queued.current.delete(id);
          if (next !== undefined) void send(lang, id, next);
        }
      })();
      inflight.current.set(id, { code, request });
      return request;
    },
    [patch],
  );

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
    /** Saves `lang`'s changes (Ctrl/Cmd+S, Αποθήκευση, «Ξαναδοκίμασε»); one request at a time. */
    flush(lang: Language = language) {
      const target = files[lang];
      if (!target) return;
      const code = codes[lang];
      const pending = inflight.current.get(target.id);
      if (pending) {
        // Back to what is being sent: a queued newer version is no longer wanted.
        if (code !== pending.code) queued.current.set(target.id, code);
        else queued.current.delete(target.id);
      } else if (code !== target.saved) void save(lang, target.id, code);
    },
    /**
     * Before `lang`'s code is replaced: whether it holds changes the server doesn't
     * have (the caller asks before dropping them), once a save in flight is done.
     */
    async unsaved(lang: Language = language): Promise<boolean> {
      const target = files[lang];
      if (!target) return false;
      const code = codes[lang];
      if (!inflight.current.has(target.id)) return code !== target.saved;
      // A queued save starts as the one in flight ends: wait for the whole chain.
      let failed = false;
      for (let p = inflight.current.get(target.id); p; p = inflight.current.get(target.id)) {
        failed = (await p.request) !== null;
        await Promise.resolve();
      }
      return failed || stored.current.get(target.id) !== code;
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
