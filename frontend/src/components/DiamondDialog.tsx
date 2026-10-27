"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { DIAMOND, DIAMOND_PRICE, FREE, type PlanInfo, refreshPlan, usePlan } from "@/lib/plan";
import { useUser } from "@/lib/supabase/useUser";

/** How the dialog opens: from the menu, or back from Stripe's Checkout. */
export type DiamondOpening = "menu" | "welcome" | "cancel";

// After paying: ask Stripe (POST /billing/sync) until the subscription shows, in case
// its webhook is slow.
const POLL_MS = 2_000;
const POLL_FOR_MS = 40_000;

const ROWS: { label: string; free: string; diamond: string }[] = [
  { label: "Μοντέλο του agent", free: "βασικό", diamond: "το καλύτερο" },
  {
    label: "Agent ανά ημέρα",
    free: tokens(FREE.daily_tokens),
    diamond: tokens(DIAMOND.daily_tokens),
  },
  { label: "/effort", free: "έως medium", diamond: "έως high" },
  {
    label: "Αποθηκευμένα προγράμματα",
    free: String(FREE.max_programs),
    diamond: String(DIAMOND.max_programs),
  },
  { label: "Δικά σου θέματα", free: String(FREE.max_themes), diamond: String(DIAMOND.max_themes) },
];

function tokens(n: number): string {
  return `${n / 1000}k tokens`;
}

const DATE = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Diamond: what it adds and the button to Stripe's Checkout, or, for a Diamond
 * student, when it renews and Stripe's portal to cancel or change the card. A
 * centered native <dialog>, like Ρυθμίσεις.
 */
export function DiamondDialog({ opening, onClose }: { opening: DiamondOpening; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const user = useUser();
  const plan = usePlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Back from paying: waiting for the webhook, then done (or it took too long).
  const [activation, setActivation] = useState<"waiting" | "late" | null>(
    opening === "welcome" ? "waiting" : null,
  );
  const diamond = plan.plan === "diamond";
  const userId = user?.id;

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  // Opened from the menu: the plan as Stripe has it now (it may have ended elsewhere).
  useEffect(() => {
    if (opening !== "welcome" && userId) void refreshPlan(userId, true);
  }, [opening, userId]);

  useEffect(() => {
    if (activation !== "waiting" || !userId) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const until = Date.now() + POLL_FOR_MS;
    const poll = async () => {
      const info = await refreshPlan(userId, true);
      if (!live || info?.plan === "diamond") return;
      if (Date.now() > until) setActivation("late");
      else timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [activation, userId]);

  async function go(path: "/billing/checkout" | "/billing/portal") {
    setBusy(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(path, { method: "POST" });
      window.location.assign(url);
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof ApiError && err.status === 409
          ? "Είσαι ήδη Diamond."
          : "Δεν ήταν δυνατή η σύνδεση με τις πληρωμές. Δοκίμασε ξανά σε λίγο.",
      );
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={title}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-border bg-panel p-0 text-sm text-text shadow-2xl backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Image
            src="/mascot-tutor-diamond.png"
            alt=""
            width={64}
            height={64}
            className="h-16 w-auto shrink-0"
          />
          <div className="min-w-0">
            <h2 id={title} className="text-base font-semibold">
              Diamond 💎
            </h2>
            <p className="mt-0.5 text-muted">
              {diamond ? "Το πλάνο σου." : `Περισσότερος και καλύτερος agent · ${DIAMOND_PRICE}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Κλείσιμο"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-panel-2 hover:text-text"
          >
            ✕
          </button>
        </div>

        <Status opening={opening} activation={activation} plan={plan} />

        <table className="mt-4 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-border">
          <thead className="bg-panel-2 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium" />
              <th className="px-3 py-2 text-left font-medium">Δωρεάν</th>
              <th className="px-3 py-2 text-left font-semibold text-accent">Diamond</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td className="border-t border-border px-3 py-2 text-muted">{row.label}</td>
                <td className="border-t border-border px-3 py-2">{row.free}</td>
                <td className="border-t border-border px-3 py-2 font-medium">{row.diamond}</td>
              </tr>
            ))}
            <tr>
              <td className="border-t border-border px-3 py-2 text-muted">Tutor και Agent</td>
              <td className="border-t border-border px-3 py-2">
                <Mascots kind="" />
              </td>
              <td className="border-t border-border px-3 py-2">
                <Mascots kind="-diamond" />
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4">
          {user === null ? (
            <Link
              href="/login?mode=signup"
              className="block rounded-md bg-accent px-3 py-2 text-center font-semibold text-on-accent hover:brightness-110"
            >
              Κάνε εγγραφή για το Diamond
            </Link>
          ) : diamond ? (
            <button
              type="button"
              onClick={() => go("/billing/portal")}
              disabled={busy}
              className="w-full rounded-md bg-panel-2 px-3 py-2 font-medium hover:text-text disabled:opacity-50"
            >
              {busy ? "Άνοιγμα…" : "Διαχείριση συνδρομής (ακύρωση, κάρτα, αποδείξεις)"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go("/billing/checkout")}
              disabled={busy || !plan.can_buy || activation === "waiting"}
              className="w-full rounded-md bg-accent px-3 py-2 font-semibold text-on-accent hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Μεταφορά στην πληρωμή…" : `Απόκτησε το Diamond · ${DIAMOND_PRICE}`}
            </button>
          )}
          {user && !diamond && !plan.can_buy && (
            <p className="mt-2 text-xs text-muted">Οι πληρωμές δεν είναι διαθέσιμες ακόμα.</p>
          )}
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          <p className="mt-3 text-xs text-muted">
            Η πληρωμή γίνεται με ασφάλεια στη Stripe· εμείς δεν βλέπουμε την κάρτα σου. Ακυρώνεις
            όποτε θέλεις, και το Diamond μένει μέχρι το τέλος του μήνα που πλήρωσες. Δες την{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              πολιτική απορρήτου
            </Link>
            .
          </p>
        </div>
      </div>
    </dialog>
  );
}

function Status({
  opening,
  activation,
  plan,
}: {
  opening: DiamondOpening;
  activation: "waiting" | "late" | null;
  plan: PlanInfo;
}) {
  const box = "mt-4 rounded-lg px-3 py-2";
  if (plan.plan === "diamond") {
    const until = plan.renews_at ? DATE.format(new Date(plan.renews_at)) : null;
    return (
      <div className={`${box} border border-accent/50 bg-accent/10`}>
        {opening === "welcome" && <p className="font-semibold">Καλώς ήρθες στο Diamond! 💎</p>}
        {until && (
          <p className={opening === "welcome" ? "mt-1 text-xs text-muted" : "text-xs text-muted"}>
            {plan.cancel_at_period_end ? `Ακυρώθηκε· λήγει στις ${until}.` : `Ανανεώνεται στις ${until}.`}
            {plan.status === "past_due" && " Η τελευταία πληρωμή απέτυχε: έλεγξε την κάρτα σου."}
          </p>
        )}
      </div>
    );
  }
  if (activation === "waiting") {
    return (
      <p className={`${box} bg-panel-2 text-muted`}>Η πληρωμή έγινε· ενεργοποιούμε το Diamond…</p>
    );
  }
  if (activation === "late") {
    return (
      <p className={`${box} bg-warn/10 text-warn`}>
        Η ενεργοποίηση αργεί. Ανανέωσε τη σελίδα σε λίγο· αν δεν γίνει, γράψε μας από την πολιτική
        απορρήτου.
      </p>
    );
  }
  if (opening === "cancel") {
    return <p className={`${box} bg-panel-2 text-muted`}>Η πληρωμή ακυρώθηκε· δεν χρεώθηκες.</p>;
  }
  return null;
}

function Mascots({ kind }: { kind: "" | "-diamond" }) {
  return (
    <span className="flex items-center gap-1">
      <Image src={`/mascot-tutor${kind}.png`} alt="" width={28} height={28} className="h-7 w-auto" />
      <Image src={`/mascot-agent${kind}.png`} alt="" width={28} height={28} className="h-7 w-auto" />
    </span>
  );
}
