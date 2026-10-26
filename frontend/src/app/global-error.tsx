"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Replaces the root layout when it fails to render, so it brings its own
// document, styles and theme.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="el" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <title>AEPP Max</title>
      </head>
      <body>
        <main style={{ fontFamily: "system-ui, sans-serif" }} className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-4 text-text">
          <h1 className="text-lg font-semibold">Κάτι πήγε στραβά.</h1>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-md bg-accent px-4 py-2 text-sm text-on-accent hover:opacity-90"
          >
            Ξαναδοκίμασε
          </button>
        </main>
      </body>
    </html>
  );
}
