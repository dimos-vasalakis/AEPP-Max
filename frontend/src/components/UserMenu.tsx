"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { NavPopover } from "@/components/NavPopover";
import { FontSizeSettings, GearIcon } from "@/components/ZoomMenu";
import { ApiError, apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/useUser";

export function UserMenu() {
  const user = useUser();
  // One state for the delete steps, here so the menu can lock on it: it stays
  // open while a deletion runs, and closing it resets to idle, so the second
  // step is never left armed.
  const [deletion, setDeletion] = useState<Deletion>(IDLE);
  // Ρυθμίσεις folds open under its gear; the menu reopens with it folded.
  const [settings, setSettings] = useState(false);
  const reset = useCallback(() => {
    setDeletion(IDLE);
    setSettings(false);
  }, []);
  // Signed out (another tab) and in again without a reload: start over too.
  const [deletionUser, setDeletionUser] = useState(user?.id);
  if (user?.id !== deletionUser) {
    setDeletionUser(user?.id);
    setDeletion(IDLE);
  }
  if (user === undefined) return null;
  if (user === null) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/login" className="text-muted hover:text-text">
          Σύνδεση
        </Link>
        <Link
          href="/login?mode=signup"
          className="rounded-md bg-accent px-2.5 py-1 font-medium text-on-accent hover:brightness-110"
        >
          Εγγραφή
        </Link>
      </div>
    );
  }
  return (
    <NavPopover
      label="Λογαριασμός"
      icon={<PersonIcon />}
      align="right"
      locked={deletion.step === "deleting"}
      onClose={reset}
    >
      <h2 className="font-semibold">Λογαριασμός</h2>
      <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
      <button
        type="button"
        onClick={() => setSettings(!settings)}
        aria-expanded={settings}
        className="mt-3 flex w-full items-center gap-2 rounded-md bg-panel-2 px-3 py-1.5 text-left hover:text-text"
      >
        <GearIcon size={16} />
        Ρυθμίσεις
        <span className={`ml-auto text-muted transition-transform ${settings ? "rotate-90" : ""}`} aria-hidden>
          ›
        </span>
      </button>
      {settings && (
        <div className="mt-2 rounded-md border border-border p-3">
          <div className="mb-2 text-xs font-medium text-muted">Μέγεθος γραμμάτων</div>
          <FontSizeSettings />
        </div>
      )}
      <button
        type="button"
        onClick={() => createClient().auth.signOut()}
        className="mt-2 w-full rounded-md bg-panel-2 px-3 py-1.5 text-left hover:text-text"
      >
        Αποσύνδεση
      </button>
      <Link href="/privacy" className="mt-3 inline-block text-xs text-accent hover:underline">
        Πολιτική απορρήτου
      </Link>
      <DeleteAccount deletion={deletion} setDeletion={setDeletion} />
    </NavPopover>
  );
}

type Deletion = { step: "idle" | "confirm" | "deleting"; error: string | null };
const IDLE: Deletion = { step: "idle", error: null };

/** Two steps: the link, then a warning with the button that really deletes. */
function DeleteAccount({
  deletion: { step, error },
  setDeletion,
}: {
  deletion: Deletion;
  setDeletion: (deletion: Deletion) => void;
}) {
  async function remove() {
    setDeletion({ step: "deleting", error: null });
    try {
      await apiFetch<void>("/account", { method: "DELETE" });
    } catch (err) {
      setDeletion({
        step: "confirm",
        error:
          err instanceof ApiError && err.status === 503
            ? "Η διαγραφή δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκίμασε αργότερα."
            : err instanceof ApiError && err.status === 500
              ? "Η διαγραφή δεν ολοκληρώθηκε και δεν θα βοηθήσει να ξαναδοκιμάσεις. Γράψε μας (δες την Πολιτική απορρήτου) για να την ολοκληρώσουμε."
              : "Η διαγραφή απέτυχε. Δοκίμασε ξανά.",
      });
      return;
    }
    // The account is gone, so only the session in this browser is left to clear.
    // Even if that fails, reload: nothing of the old account (the agent chat) stays on screen.
    await createClient()
      .auth.signOut({ scope: "local" })
      .catch(() => {});
    window.location.reload();
  }

  if (step === "idle") {
    return (
      <div className="mt-4 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setDeletion({ step: "confirm", error: null })}
          className="text-xs text-danger hover:underline"
        >
          Διαγραφή λογαριασμού
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
      <p>
        Θα σβηστούν <b>οριστικά</b> ο λογαριασμός, τα αποθηκευμένα προγράμματα και οι συζητήσεις με
        τον agent. Δεν αναιρείται.
      </p>
      {error && <p className="text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={step === "deleting"}
          className="rounded-md bg-danger/15 px-2.5 py-1 font-medium text-danger hover:bg-danger/25 disabled:opacity-60"
        >
          {step === "deleting" ? "Διαγραφή…" : "Ναι, διαγραφή"}
        </button>
        <button
          type="button"
          onClick={() => setDeletion(IDLE)}
          disabled={step === "deleting"}
          className="rounded-md bg-panel-2 px-2.5 py-1 hover:text-text"
        >
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
