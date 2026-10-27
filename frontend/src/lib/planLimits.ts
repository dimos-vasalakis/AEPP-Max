// The plans' numbers, server-safe (the landing page shows them); lib/plan.ts, the
// client side, re-exports them. They mirror backend/app/core/plans.py, which
// enforces them, so change both together.

export const DIAMOND_PRICE = "$5 / μήνα";

export const FREE_LIMITS = {
  daily_tokens: 20_000,
  max_programs: 5,
  max_themes: 3,
} as const;

/** Diamond's limits (the server's defaults; its env can change them). */
export const DIAMOND_LIMITS = {
  daily_tokens: 100_000,
  max_programs: 50,
  max_themes: 20,
} as const;
