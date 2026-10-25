import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** JSON headers plus the Supabase access token, so the backend can verify the user. */
export async function apiHeaders(): Promise<Headers> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (supabaseConfigured) {
    const { session } = (await createClient().auth.getSession()).data;
    if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return headers;
}

/** FastAPI's `{"detail": "..."}`, or the raw body. */
export async function errorFrom(res: Response): Promise<ApiError> {
  const body = await res.text();
  try {
    const { detail } = JSON.parse(body);
    if (typeof detail === "string") return new ApiError(res.status, detail);
  } catch {
    // not JSON
  }
  return new ApiError(res.status, body || res.statusText);
}

/** Calls the FastAPI backend (`/api/v1` + path) and returns its JSON. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await apiHeaders();
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));

  const res = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers });
  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
