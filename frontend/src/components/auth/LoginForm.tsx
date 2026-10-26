"use client";

import type { AuthError, Provider } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useState, useSyncExternalStore } from "react";
import { authLinkError, safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

type Mode = "signin" | "signup";

const COPY: Record<
  Mode,
  { title: string; submit: string; sent: string; switchText: string; switchLink: string }
> = {
  signin: {
    title: "Σύνδεση",
    submit: "Στείλε μου σύνδεσμο",
    sent: "Σου στείλαμε σύνδεσμο σύνδεσης στο",
    switchText: "Δεν έχεις λογαριασμό;",
    switchLink: "Εγγραφή",
  },
  signup: {
    title: "Εγγραφή",
    submit: "Δημιουργία λογαριασμού",
    sent: "Σου στείλαμε σύνδεσμο επιβεβαίωσης στο",
    switchText: "Έχεις ήδη λογαριασμό;",
    switchLink: "Σύνδεση",
  },
};

/**
 * Sign-in and sign-up by email link, plus Google (OAuth). Signing in
 * never creates an account (`shouldCreateUser: false`); only Εγγραφή does. OAuth
 * can't make that distinction: the first Google sign-in creates the account.
 */
export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  // The URL holds the mode, so reload, Back and /login?mode=signup links all agree with the form.
  const mode: Mode = params.get("mode") === "signup" ? "signup" : "signin";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    params.get("error") ? "error" : "idle",
  );
  const [problem, setProblem] = useState<string | null>(null);
  const copy = COPY[mode];

  // A failed email link comes back with Supabase's reason in the fragment, which
  // the server never sees (e.g. #error_code=otp_expired), or in the query when it
  // was forwarded from another page. Shown until a new send.
  const linkProblem = useSyncExternalStore(
    subscribeHash,
    () => authLinkError(window.location.hash) ?? authLinkError(window.location.search),
    () => null,
  );
  const failed = state === "error" || (state === "idle" && linkProblem !== null);

  function callbackUrl() {
    const next = safeNext(params.get("next")) ?? "/";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  /** The current query without a failed link's error params, plus `changes`. */
  function cleanQuery(changes: Record<string, string> = {}) {
    const query = new URLSearchParams(window.location.search);
    for (const key of ["error", "error_code", "error_description"]) query.delete(key);
    for (const [key, value] of Object.entries(changes)) query.set(key, value);
    const text = query.toString();
    return `${window.location.pathname}${text ? `?${text}` : ""}`;
  }

  function clearLinkError() {
    if (window.location.hash || /[?&]error/.test(window.location.search)) {
      history.replaceState(null, "", cleanQuery());
    }
  }

  function switchMode(next: Mode) {
    setState("idle");
    setProblem(null);
    router.replace(cleanQuery({ mode: next }));
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setProblem(null);
    clearLinkError();
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl(),
        shouldCreateUser: mode === "signup",
        // The signup trigger copies full_name into profiles.display_name.
        data: mode === "signup" && name.trim() ? { full_name: name.trim() } : undefined,
      },
    });
    if (error) setProblem(sendError(error, mode));
    setState(error ? "error" : "sent");
  }

  async function signInWith(provider: Provider) {
    setProblem(null);
    // In the browser signInWithOAuth just navigates away and never reports an error,
    // so a disabled provider would end on Supabase's raw JSON error page. Get the
    // URL without navigating, check the provider is on, then go.
    const { data, error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl(), skipBrowserRedirect: true },
    });
    const fail = (message: string) => {
      setState("error");
      setProblem(message);
    };
    if (error || !data.url) return fail(`Η σύνδεση απέτυχε: ${error?.message ?? "χωρίς σύνδεσμο"}`);
    if (!(await providerEnabled(provider))) {
      return fail("Αυτός ο τρόπος σύνδεσης δεν είναι ενεργός ακόμα. Χρησιμοποίησε το email σου.");
    }
    window.location.assign(data.url);
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-6">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <Image src="/logo-cloud.png" alt="" width={32} height={32} />
        <span className="font-semibold">AEPP Max</span>
      </Link>
      <h1 className="mb-1 text-lg font-semibold">{copy.title}</h1>
      <p className="mb-6 text-sm text-muted">Για τον βοηθό και την αποθήκευση προγραμμάτων.</p>

      {!supabaseConfigured ? (
        <p className="text-sm text-warn">
          Η σύνδεση δεν έχει ρυθμιστεί ακόμα (λείπουν τα κλειδιά Supabase στο .env.local).
        </p>
      ) : state === "sent" ? (
        <p className="text-sm">
          {copy.sent} {email}. Άνοιξέ τον <strong>σε αυτόν τον browser</strong>. Αν δεν τον βλέπεις,
          κοίτα και στα ανεπιθύμητα.
        </p>
      ) : (
        <>
          <div className="mb-4 flex justify-center gap-3">
            <ProviderButton label={`${copy.title} με Google`} onClick={() => signInWith("google")}>
              <GoogleLogo />
            </ProviderButton>
          </div>
          <div className="mb-3 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />ή με email
            <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={sendLink} className="space-y-3">
            {mode === "signup" && (
              <input
                aria-label="Όνομα"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Όνομα (προαιρετικό)"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              />
            )}
            <input
              aria-label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="onoma@example.com"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent disabled:opacity-60"
            >
              {copy.submit}
            </button>
            {failed && (
              <p className="text-sm text-danger">
                {problem ?? linkProblem ?? "Η σύνδεση απέτυχε. Δοκίμασε ξανά."}
              </p>
            )}
          </form>
          {mode === "signup" && (
            <p className="mt-3 text-xs text-muted">
              Τι κρατάμε και πώς το σβήνεις:{" "}
              <Link href="/privacy" className="text-accent hover:underline">
                Πολιτική απορρήτου
              </Link>
              .
            </p>
          )}
        </>
      )}

      {supabaseConfigured && (
        <p className="mt-6 text-center text-sm text-muted">
          {copy.switchText}{" "}
          <button
            type="button"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="font-medium text-accent hover:underline"
          >
            {copy.switchLink}
          </button>
        </p>
      )}
    </div>
  );
}

/**
 * Whether Supabase has this OAuth provider turned on (GET /auth/v1/settings, public
 * with the publishable key). If the check itself fails, let the redirect try.
 */
async function providerEnabled(provider: Provider): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_KEY },
    });
    if (!res.ok) return true;
    const settings: { external?: Record<string, boolean> } = await res.json();
    return settings.external?.[provider] !== false;
  } catch {
    return true;
  }
}

/** Greek text for a failed email send. */
function sendError(error: AuthError, mode: Mode): string {
  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    // Supabase's built-in mailer allows only a few emails per hour.
    return "Στάλθηκαν πολλά email πρόσφατα. Περίμενε λίγο και δοκίμασε ξανά.";
  }
  if (
    mode === "signin" &&
    (error.code === "otp_disabled" || /signups not allowed/i.test(error.message))
  ) {
    return "Δεν υπάρχει λογαριασμός με αυτό το email. Κάνε πρώτα εγγραφή.";
  }
  return `Η αποστολή απέτυχε: ${error.message}`;
}

function ProviderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-16 items-center justify-center rounded-md border border-border bg-panel-2 hover:border-muted"
    >
      {children}
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
