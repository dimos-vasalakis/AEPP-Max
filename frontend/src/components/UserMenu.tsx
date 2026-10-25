"use client";

import Link from "next/link";
import { useState } from "react";
import { NavPopover } from "@/components/NavPopover";
import { displayName, SettingsDialog } from "@/components/SettingsDialog";
import { GearIcon } from "@/components/ZoomMenu";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/useUser";

/** The account button: sign in/up when signed out; otherwise a menu that opens Ρυθμίσεις. */
export function UserMenu() {
  const user = useUser();
  // Outside the popover, which closes (and unmounts its panel) as the dialog opens.
  const [settings, setSettings] = useState(false);
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
    <>
      <NavPopover label="Λογαριασμός" icon={<PersonIcon />} align="right">
        {(close) => (
          <>
            <h2 className="truncate font-semibold">{displayName(user) ?? "Λογαριασμός"}</h2>
            <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
            <button
              type="button"
              onClick={() => {
                close();
                setSettings(true);
              }}
              className="mt-3 flex w-full items-center gap-2 rounded-md bg-panel-2 px-3 py-1.5 text-left hover:text-text"
            >
              <GearIcon size={16} />
              Ρυθμίσεις
            </button>
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
          </>
        )}
      </NavPopover>
      {settings && <SettingsDialog user={user} onClose={() => setSettings(false)} />}
    </>
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
