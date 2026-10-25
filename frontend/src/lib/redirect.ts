/**
 * Returns `next` only if it's a same-site relative path, so login links can't
 * be used to bounce users to another site (open redirect).
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null;
  }
  return next;
}

export const AUTH_CALLBACK_PATH = "/auth/callback";
const LOGIN_PATH = "/login";

/**
 * Supabase sends a confirmation link to the Site URL (e.g. `/?code=…`) instead
 * of /auth/callback when the callback isn't in its allowed redirect URLs. Such a
 * link would land on a page that ignores the code, leaving the student signed
 * out. Returns the callback URL to forward it to, or null if there's nothing to do.
 */
export function authLinkTarget(url: URL): URL | null {
  if (url.pathname === AUTH_CALLBACK_PATH || url.pathname === LOGIN_PATH) return null;
  // A failed link (expired, already used) lands the same way: send it to the login
  // page, which explains the error. The browser carries the #fragment along.
  if (url.searchParams.has("error_code")) {
    const target = new URL(LOGIN_PATH, url);
    url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
    return target;
  }
  if (!url.searchParams.has("code") && !url.searchParams.has("token_hash")) return null;
  const target = new URL(AUTH_CALLBACK_PATH, url);
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  if (!target.searchParams.has("next") && url.pathname !== "/") {
    target.searchParams.set("next", url.pathname);
  }
  return target;
}

/** Greek text for the error Supabase puts in the URL (fragment or query) when a link fails. */
export function authLinkError(fragmentOrQuery: string): string | null {
  const params = new URLSearchParams(fragmentOrQuery.replace(/^[#?]/, ""));
  const code = params.get("error_code");
  if (!code && !params.get("error")) return null;
  if (code === "otp_expired") {
    return "Ο σύνδεσμος έληξε ή έχει ήδη χρησιμοποιηθεί. Ζήτησε νέο σύνδεσμο.";
  }
  return "Ο σύνδεσμος δεν ήταν έγκυρος. Ζήτησε νέο σύνδεσμο.";
}
