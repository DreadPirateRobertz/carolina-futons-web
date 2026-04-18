import * as Sentry from "@sentry/nextjs";

export function initServerSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}
