import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
