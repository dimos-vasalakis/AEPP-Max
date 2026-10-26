import * as Sentry from "@sentry/nextjs";
import { dataCollection, tracesSampleRate } from "@/lib/sentry";

// Server and edge side of Sentry; the browser's is instrumentation-client.ts.
export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    dataCollection,
    tracesSampleRate,
  });
}

export const onRequestError = Sentry.captureRequestError;
