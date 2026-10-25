"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    params.get("error") ? "error" : "idle",
  );

  function callbackUrl() {
    const next = safeNext(params.get("next")) ?? "/";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setState(error ? "error" : "sent");
  }

  async function signInWithGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-6">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <Image src="/logo.png" alt="" width={32} height={32} />
        <span className="font-semibold">AEPP-Max</span>
      </Link>
      <h1 className="mb-1 text-lg font-semibold">Σύνδεση</h1>
      <p className="mb-6 text-sm text-muted">Για τον βοηθό και την αποθήκευση προγραμμάτων.</p>

      {!supabaseConfigured ? (
        <p className="text-sm text-warn">
          Η σύνδεση δεν έχει ρυθμιστεί ακόμα (λείπουν τα κλειδιά Supabase στο .env.local).
        </p>
      ) : state === "sent" ? (
        <p className="text-sm">Σου στείλαμε σύνδεσμο στο {email}. Άνοιξέ τον για να συνδεθείς.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mb-4 w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm font-medium hover:border-muted"
          >
            Συνέχεια με Google
          </button>
          <form onSubmit={sendLink} className="space-y-3">
            <label htmlFor="email" className="block text-sm text-muted">
              ή με email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="onoma@example.com"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Στείλε μου σύνδεσμο
            </button>
            {state === "error" && (
              <p className="text-sm text-danger">Η σύνδεση απέτυχε. Δοκίμασε ξανά.</p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
