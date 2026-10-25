"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/useUser";

export function UserMenu() {
  const user = useUser();
  if (user === undefined) return null;
  if (user === null) {
    return (
      <Link href="/login" className="text-sm text-muted hover:text-text">
        Σύνδεση
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-muted sm:inline">{user.email}</span>
      <button
        type="button"
        onClick={() => createClient().auth.signOut()}
        className="text-muted hover:text-text"
      >
        Αποσύνδεση
      </button>
    </div>
  );
}
