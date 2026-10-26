import type * as Sentry from "@sentry/nextjs";

type DataCollection = NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["dataCollection"]>;

// What Sentry may collect, shared by the browser, server and edge runtimes.
// @sentry/nextjs 11 collects all of it unless told otherwise (there is no
// sendDefaultPii any more), and HTTP bodies would carry students' code and chats.
// Stack traces, URLs and timings are all we send.
export const dataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  stackFrameVariables: false,
} satisfies DataCollection;

export const tracesSampleRate = process.env.NODE_ENV === "development" ? 1.0 : 0.1;
