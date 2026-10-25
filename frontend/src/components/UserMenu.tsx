"use client";

import Link from "next/link";
import { useState } from "react";
import { NavPopover } from "@/components/NavPopover";
import { ApiError, apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/useUser";

export function UserMenu() {
  const user = useUser();
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
    <NavPopover label="Λογαριασμός" icon={<PersonIcon />} align="right">
      <h2 className="font-semibold">Λογαριασμός</h2>
      <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
      <button
        type="button"
        onClick={() => createClient().auth.signOut()}
        className="mt-3 w-full rounded-md bg-panel-2 px-3 py-1.5 text-left hover:text-text"
      >
        Αποσύνδεση
      </button>
      <Link href="/privacy" className="mt-3 inline-block text-xs text-accent hover:underline">
        Πολιτική απορρήτου
      </Link>
      <DeleteAccount />
    </NavPopover>
  );
}

/** Two steps: the link, then a warning with the button that really deletes. */
function DeleteAccount() {
  const [state, setState] = useState<"idle" | "confirm" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setState("deleting");
    setError(null);
    try {
      await apiFetch<void>("/account", { method: "DELETE" });
      // The account is gone, so only the session in this browser is left to clear.
      // Reload too, so nothing of the old account (the agent chat) stays on screen.
      await createClient().auth.signOut({ scope: "local" });
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 503
          ? "Η διαγραφή δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκίμασε αργότερα."
          : "Η διαγραφή απέτυχε. Δοκίμασε ξανά.",
      );
      setState("confirm");
    }
  }

  if (state === "idle") {
    return (
      <div className="mt-4 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setState("confirm")}
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
          disabled={state === "deleting"}
          className="rounded-md bg-danger/15 px-2.5 py-1 font-medium text-danger hover:bg-danger/25 disabled:opacity-60"
        >
          {state === "deleting" ? "Διαγραφή…" : "Ναι, διαγραφή"}
        </button>
        <button
          type="button"
          onClick={() => setState("idle")}
          disabled={state === "deleting"}
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
