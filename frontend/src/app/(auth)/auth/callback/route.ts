import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { safeNext } from "@/lib/redirect";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES: readonly string[] = [
  "email",
  "signup",
  "magiclink",
  "invite",
  "recovery",
  "email_change",
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next")) ?? "/";

  if (supabaseConfigured && (code || tokenHash)) {
    const supabase = await createClient();
    // Email links with a token_hash verify in any browser; a PKCE `code` (OAuth,
    // or the default email templates) only in the browser that started the flow.
    const { error } =
      tokenHash && type && EMAIL_OTP_TYPES.includes(type)
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
        : code
          ? await supabase.auth.exchangeCodeForSession(code)
          : { error: new Error("unsupported link") };
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
