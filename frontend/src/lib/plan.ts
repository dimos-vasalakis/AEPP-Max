"use client";

// The two plans, Free and Diamond ($5 a month through Stripe). The numbers mirror
// backend/app/core/plans.py, which enforces them; GET /billing says which plan the
// student is on.
import { useEffect, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api/client";
import { DIAMOND_LIMITS, DIAMOND_PRICE, FREE_LIMITS } from "@/lib/planLimits";
import { useUser } from "@/lib/supabase/useUser";

/** What /effort picks: how hard the model thinks before it answers. */
export type Effort = "low" | "medium" | "high";
export const EFFORTS: Effort[] = ["low", "medium", "high"];

export type PlanName = "free" | "diamond";

/** GET /billing (backend endpoints/billing.py PlanOut). */
export type PlanInfo = {
  plan: PlanName;
  /** Stripe's status, when there is a subscription. */
  status: string | null;
  /** The current period's end (ISO): the renewal, or the end if cancelled. */
  renews_at: string | null;
  cancel_at_period_end: boolean;
  /** Payments are set up on the server. */
  can_buy: boolean;
  daily_tokens: number;
  max_programs: number;
  max_themes: number;
  efforts: Effort[];
};

export { DIAMOND_PRICE };

export const FREE: PlanInfo = {
  plan: "free",
  status: null,
  renews_at: null,
  cancel_at_period_end: false,
  can_buy: false,
  ...FREE_LIMITS,
  efforts: ["low", "medium"],
};

/** Diamond's limits (lib/planLimits.ts), for the page that offers it. */
export const DIAMOND = { ...DIAMOND_LIMITS, efforts: EFFORTS } as const;

// One copy for the whole page, so every component sees the same plan. `loaded`: the
// last read worked; a failed one keeps what was known and is tried again later.
type State = { userId: string | null; info: PlanInfo | null; loaded: boolean };
let state: State = { userId: null, info: null, loaded: false };
const listeners = new Set<() => void>();
let loading: string | null = null;
let lastTry = 0;
// Read again when the student comes back to the tab, at most this often: Diamond may
// have started or ended meanwhile (in another tab, or at the end of the month).
const STALE_MS = 60_000;

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !state.userId) return;
    if (Date.now() - lastTry > STALE_MS) void refreshPlan(state.userId);
  });
}

function set(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Reads the student's plan again: when the page opens, the tab comes back, the
 * server refuses something the plan should allow, or after paying. `fromStripe`
 * (POST /billing/sync) asks Stripe itself, without waiting for its webhook.
 */
export async function refreshPlan(userId: string, fromStripe = false): Promise<PlanInfo | null> {
  loading = userId;
  lastTry = Date.now();
  let info: PlanInfo | null = null;
  try {
    info = fromStripe
      ? await apiFetch<PlanInfo>("/billing/sync", { method: "POST" })
      : await apiFetch<PlanInfo>("/billing");
  } catch {
    // Unreachable for now: keep what we knew (Free if nothing), and try again later.
  }
  if (loading === userId) loading = null;
  const known = state.userId === userId ? state.info : null;
  set({ userId, info: info ?? known, loaded: info !== null });
  return info;
}

/**
 * The student's plan (Free while signed out, while it loads, or if it was never
 * read), and whether it has been read from the server.
 */
export function usePlanState(): { plan: PlanInfo; loaded: boolean } {
  const user = useUser();
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  const userId = user?.id ?? null;
  useEffect(() => {
    if (userId && current.userId !== userId && loading !== userId) void refreshPlan(userId);
  }, [userId, current.userId]);
  const mine = userId !== null && current.userId === userId;
  return { plan: (mine && current.info) || FREE, loaded: mine && current.loaded };
}

export function usePlan(): PlanInfo {
  return usePlanState().plan;
}

/** The mascots: Diamond's are set with diamonds. */
export function mascot(kind: "tutor" | "agent", plan: PlanName): string {
  return plan === "diamond" ? `/mascot-${kind}-diamond.png` : `/mascot-${kind}.png`;
}

// The student's /effort, kept per browser as Claude Code keeps its own; null is the
// server's default (config.openai_reasoning_effort).
const EFFORT_KEY = "aepp-agent-effort";
const effortListeners = new Set<() => void>();
let effort: Effort | null | undefined; // undefined: not read yet

function loadEffort(): Effort | null {
  if (effort !== undefined) return effort;
  try {
    const saved = localStorage.getItem(EFFORT_KEY);
    effort = EFFORTS.includes(saved as Effort) ? (saved as Effort) : null;
  } catch {
    effort = null;
  }
  return effort;
}

function subscribeEffort(listener: () => void) {
  effortListeners.add(listener);
  return () => effortListeners.delete(listener);
}

export function useEffort(): Effort | null {
  return useSyncExternalStore(subscribeEffort, loadEffort, () => null);
}

export function setEffort(next: Effort | null) {
  effort = next;
  try {
    if (next) localStorage.setItem(EFFORT_KEY, next);
    else localStorage.removeItem(EFFORT_KEY);
  } catch {
    // Storage blocked: it lasts until the page reloads.
  }
  effortListeners.forEach((listener) => listener());
}
