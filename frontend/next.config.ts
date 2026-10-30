import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // No other site may frame the app (clickjacking: a hidden Διαγραφή λογαριασμού
  // under a decoy button), and the browser never guesses a response's type.
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" }, // browsers without frame-ancestors
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "dimos-vasalakis",
  project: "aepp-max-frontend",
  // Uploads source maps on `next build`, so stack traces show our code. Unset
  // (local builds, CI) = no upload.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // The browser sends events through our own domain, so ad blockers don't drop
  // them. proxy.ts skips this path.
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
