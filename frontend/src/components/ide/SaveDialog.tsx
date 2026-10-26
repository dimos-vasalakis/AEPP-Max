"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Language } from "@/lib/glossa/types";
import { LANGUAGE_NAME, MAX_TITLE } from "@/lib/programs";

type Props = {
  /** undefined while the session loads. */
  signedIn: boolean | undefined;
  language: Language;
  /** The name the code gives itself, if any. */
  suggested: string;
  /** Resolves to an error message, or null once saved. */
  onSave: (title: string) => Promise<string | null>;
  /** Signed out: before leaving for the login page, so the code survives it. */
  onSignIn: () => void;
  onClose: () => void;
};

/** Saving the editor as a new program: asks its name. Rendered only while open. */
export function SaveDialog({ signedIn, language, suggested, onSave, onSignIn, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [title, setTitle] = useState(suggested);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name || saving) return;
    setSaving(true);
    setError(null);
    const failed = await onSave(name);
    setSaving(false);
    if (failed) setError(failed);
    else dialog.current?.close();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => saving && e.preventDefault()}
      onClick={(e) => e.target === e.currentTarget && !saving && dialog.current?.close()}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-border bg-panel p-0 text-sm text-text shadow-2xl backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      {signedIn === false ? (
        <div className="p-5">
          <h2 id={titleId} className="text-base font-semibold">
            Αποθήκευση
          </h2>
          <p className="mt-2 leading-relaxed text-muted">
            Για να κρατάς τα προγράμματά σου χρειάζεσαι λογαριασμό. Ο κώδικας που γράφεις θα σε
            περιμένει εδώ μόλις συνδεθείς.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="mr-auto rounded-md px-3 py-1.5 text-muted hover:text-text"
            >
              Άκυρο
            </button>
            <Link
              href="/login?mode=signup"
              onClick={onSignIn}
              className="rounded-md bg-panel-2 px-3 py-1.5 hover:text-text"
            >
              Εγγραφή
            </Link>
            <Link
              href="/login"
              onClick={onSignIn}
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-on-accent hover:brightness-110"
            >
              Σύνδεση
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="p-5">
          <h2 id={titleId} className="text-base font-semibold">
            Αποθήκευση {language === "glossa" ? "προγράμματος" : "αλγορίθμου"}
          </h2>
          <label className="mt-3 block text-xs font-medium text-muted" htmlFor={`${titleId}-name`}>
            Όνομα
          </label>
          <input
            id={`${titleId}-name`}
            autoFocus
            value={title}
            maxLength={MAX_TITLE}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="π.χ. Άσκηση 3, σελ. 112"
            className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2.5 outline-none focus:border-accent"
          />
          <p className="mt-2 text-xs text-muted">
            Θα ανοίγει ως <b className="text-text">{LANGUAGE_NAME[language]}</b> και θα αποθηκεύεται
            μόνο του όσο γράφεις.
          </p>
          {error && (
            <p className="mt-3 rounded-md border-l-2 border-danger bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              disabled={saving}
              className="rounded-md bg-panel-2 px-3 py-1.5 hover:text-text disabled:opacity-50"
            >
              Άκυρο
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || signedIn === undefined}
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-on-accent hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Αποθήκευση…" : "Αποθήκευση"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
