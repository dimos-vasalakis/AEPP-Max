"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import type { AgentUsage } from "@/lib/api/agent";
import { ApiError, apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

/**
 * Ρυθμίσεις, from the account menu: a centered dialog with today's limits first,
 * then the account's details, the font size and account deletion. Rendered only
 * while open; Esc, the × or a click outside closes it (except mid-deletion).
 */
export function SettingsDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [deletion, setDeletion] = useState<Deletion>(IDLE);
  const deleting = deletion.step === "deleting";

  // showModal() centers it, traps focus and dims the page behind (::backdrop).
  // Unmounting removes it, which closes it; closing it here instead would fire a
  // late `close` (onClose) after Strict Mode's remount.
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={title}
      onClose={onClose}
      onCancel={(e) => deleting && e.preventDefault()}
      // The dialog itself is only hit outside the content, i.e. on the backdrop.
      onClick={(e) => e.target === e.currentTarget && !deleting && dialog.current?.close()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-border bg-panel p-0 text-sm text-text shadow-2xl backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-5">
        <div className="flex items-center gap-3">
          <h2 id={title} className="text-base font-semibold">
            Ρυθμίσεις
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            disabled={deleting}
            aria-label="Κλείσιμο"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-panel-2 hover:text-text disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <Section title="Όρια σήμερα">
          <Limits />
        </Section>

        <Section title="Λογαριασμός">
          <Details user={user} />
        </Section>

        <DeleteAccount deletion={deletion} setDeletion={setDeletion} />

        <Link href="/privacy" className="mt-4 inline-block text-xs text-accent hover:underline">
          Πολιτική απορρήτου
        </Link>
      </div>
    </dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

type UsageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  // `at` is when it was read, for "in 5 hours" without reading the clock while rendering.
  | { kind: "done"; usage: AgentUsage; at: number };

/** The agent's daily limit (GET /agent/usage); running code and the editor have none. */
function Limits() {
  const [state, setState] = useState<UsageState>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    apiFetch<AgentUsage>("/agent/usage")
      .then((usage) => live && setState({ kind: "done", usage, at: Date.now() }))
      .catch(
        (err) =>
          live &&
          setState({
            kind: "error",
            message:
              err instanceof ApiError && err.status === 503
                ? "Τα όρια δεν είναι διαθέσιμα αυτή τη στιγμή."
                : "Δεν ήταν δυνατή η φόρτωση των ορίων.",
          }),
      );
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-panel-2 p-3">
        <div className="flex items-baseline gap-2">
          <span className="font-medium">Agent</span>
          {state.kind === "done" && state.usage.limit > 0 && (
            <span className="ml-auto tabular-nums">{percent(state.usage)}%</span>
          )}
        </div>
        {state.kind === "loading" && <p className="mt-2 text-xs text-muted">Φόρτωση…</p>}
        {state.kind === "error" && <p className="mt-2 text-xs text-danger">{state.message}</p>}
        {state.kind === "done" && <AgentLimit usage={state.usage} at={state.at} />}
      </div>
      <p className="px-1 text-xs text-muted">
        Η εκτέλεση προγραμμάτων, ο έλεγχος λαθών και η αυτόματη συμπλήρωση δεν έχουν όριο.
      </p>
    </div>
  );
}

function percent({ tokens, limit }: AgentUsage): number {
  return Math.min(100, Math.round((tokens / limit) * 100));
}

function AgentLimit({ usage, at }: { usage: AgentUsage; at: number }) {
  const messages = `${usage.messages} ${usage.messages === 1 ? "μήνυμα" : "μηνύματα"} σήμερα`;
  if (usage.limit === 0) {
    return <p className="mt-1 text-xs text-muted">Χωρίς ημερήσιο όριο · {messages}</p>;
  }
  const used = percent(usage);
  const bar = used >= 100 ? "bg-danger" : used >= 80 ? "bg-warn" : "bg-accent";
  const number = new Intl.NumberFormat("el-GR");
  return (
    <>
      <div
        role="progressbar"
        aria-label="Χρήση του agent σήμερα"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-2 overflow-hidden rounded-full bg-bg"
      >
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${used}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {messages} · {number.format(usage.tokens)} / {number.format(usage.limit)} tokens
      </p>
      {used >= 100 && (
        <p className="mt-1 text-xs text-danger">
          Έφτασες το όριο για σήμερα. Ο editor και η εκτέλεση δουλεύουν κανονικά.
        </p>
      )}
      <p className="mt-1 text-xs text-muted">
        Μηδενίζεται τα μεσάνυχτα (ώρα Ελλάδας), {until(new Date(usage.resets_at).getTime() - at)}.
      </p>
    </>
  );
}

/** "σε 5 ώρες και 12 λεπτά", "σε 40 λεπτά". */
function until(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h === 1 ? "1 ώρα" : `${h} ώρες`;
  const mins = m === 1 ? "1 λεπτό" : `${m} λεπτά`;
  if (h === 0) return `σε ${mins}`;
  return m === 0 ? `σε ${hours}` : `σε ${hours} και ${mins}`;
}

/** The name given at Εγγραφή (full_name), or by Google (name); null if none. */
export function displayName(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user.user_metadata ?? {};
  const name = [meta.full_name, meta.name].find((v) => typeof v === "string" && v.trim());
  return typeof name === "string" ? name.trim() : null;
}

const PROVIDERS: Record<string, string> = { email: "Email", google: "Google", apple: "Apple" };

/** What Supabase knows about the account; the name comes from Εγγραφή or Google. */
function Details({ user }: { user: User }) {
  const date = new Intl.DateTimeFormat("el-GR", { dateStyle: "long" });
  const providers: string[] = user.app_metadata.providers ?? [user.app_metadata.provider ?? "email"];
  const rows: [string, string][] = [
    ["Όνομα", displayName(user) ?? "—"],
    ["Email", user.email ?? "—"],
    ["Σύνδεση με", providers.map((p) => PROVIDERS[p] ?? p).join(", ")],
    ["Μέλος από", date.format(new Date(user.created_at))],
  ];
  if (user.last_sign_in_at) rows.push(["Τελευταία σύνδεση", date.format(new Date(user.last_sign_in_at))]);
  return (
    <dl className="divide-y divide-border rounded-lg border border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 px-3 py-2">
          <dt className="w-28 shrink-0 text-muted sm:w-36">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
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
