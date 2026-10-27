import { type NextRequest, NextResponse } from "next/server";
import { authLinkTarget } from "@/lib/redirect";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // A sign-in link that landed outside /auth/callback (see authLinkTarget).
  const target = authLinkTarget(request.nextUrl);
  if (target) return NextResponse.redirect(target);
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!monitoring|_next/static|_next/image|icon.png|apple-icon.png|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
