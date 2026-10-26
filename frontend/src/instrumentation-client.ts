import * as Sentry from "@sentry/nextjs";
import { dataCollection, tracesSampleRate } from "@/lib/sentry";

// Error reports and page timings go to Sentry (project aepp-max-frontend) when
// NEXT_PUBLIC_SENTRY_DSN is set. No session replay: no recordings of what students type.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  dataCollection,
  tracesSampleRate,
  // Trace headers go to our own API too, so a request's backend spans join its trace.
  tracePropagationTargets: [/^\//, process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
