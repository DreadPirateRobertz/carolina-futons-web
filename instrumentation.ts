import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Direct re-export: Sentry owns the type contract and serverless flush.
// The previous async wrapper dropped the unawaited captureRequestError promise,
// losing events in Vercel serverless before the function could flush.
export const onRequestError = Sentry.captureRequestError;
