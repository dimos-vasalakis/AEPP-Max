export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * False until real keys are in .env.local. The IDE still works without
 * Supabase (running programs needs no account); only sign-in and the agent are off.
 */
export function isSupabaseConfigured(url: string, key: string): boolean {
  return /^https?:\/\//.test(url) && !url.includes("your-project") && key.trim().length > 0;
}

export const supabaseConfigured = isSupabaseConfigured(SUPABASE_URL, SUPABASE_KEY);
