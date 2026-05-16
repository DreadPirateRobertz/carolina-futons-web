import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// cf-h345.t1: tag every onRequestError event with the Next.js
// revalidateReason so on-call can filter ISR background regen
// failures distinctly. Default `undefined` (normal render) maps to
// 'none' so the Sentry filter is exhaustive over a known value set.
export const onRequestError: Instrumentation.onRequestError = (
  err,
  request,
  context,
) => {
  Sentry.setTag(
    "next.revalidate_reason",
    context.revalidateReason ?? "none",
  );
  return Sentry.captureRequestError(err, request, context);
};
