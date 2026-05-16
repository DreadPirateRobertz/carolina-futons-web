/**
 * cf-h345.t1 — onRequestError wrapper tags Sentry events with
 * Next.js revalidateReason so on-call can filter ISR background
 * regeneration failures distinctly from user-facing render errors.
 *
 * Next.js 16 passes `context.revalidateReason: 'on-demand' | 'stale'
 * | undefined` to onRequestError. Without an explicit tag, Sentry
 * collapses revalidation errors into the same alert channel as
 * everything else and "silent ISR degradation" stays invisible.
 *
 * Contract pinned here:
 *   1. Tag is set BEFORE delegation to Sentry.captureRequestError
 *   2. 'stale' (time-based ISR background regen) → tag value 'stale'
 *   3. 'on-demand' (revalidatePath/Tag) → tag value 'on-demand'
 *   4. undefined (normal request) → tag value 'none' (filter-safe)
 *   5. Original (err, request, context) tuple reaches captureRequestError
 *      unmodified — wrapping must not alter the existing Sentry payload
 */
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { Instrumentation } from "next";

const setTag = vi.fn();
const captureRequestError = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  setTag: (...args: unknown[]) => setTag(...args),
  captureRequestError: (...args: unknown[]) => captureRequestError(...args),
}));

beforeEach(() => {
  setTag.mockReset();
  captureRequestError.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

type Args = Parameters<Instrumentation.onRequestError>;

function makeArgs(revalidateReason: Args[2]["revalidateReason"]): Args {
  const err = Object.assign(new Error("boom"), { digest: "deadbeef" });
  const request: Args[1] = {
    path: "/products/kingston-futon-frame",
    method: "GET",
    headers: { "user-agent": "next-revalidation" },
  };
  const context: Args[2] = {
    routerKind: "App Router",
    routePath: "/products/[slug]",
    routeType: "render",
    revalidateReason,
    renderSource: "server-rendering",
  };
  return [err, request, context];
}

describe("instrumentation onRequestError — cf-h345.t1 revalidateReason tag", () => {
  it("tags 'stale' for time-based ISR background regen errors", async () => {
    const { onRequestError } = await import("../../instrumentation");
    await onRequestError(...makeArgs("stale"));
    expect(setTag).toHaveBeenCalledWith("next.revalidate_reason", "stale");
  });

  it("tags 'on-demand' for revalidatePath/Tag-triggered errors", async () => {
    const { onRequestError } = await import("../../instrumentation");
    await onRequestError(...makeArgs("on-demand"));
    expect(setTag).toHaveBeenCalledWith("next.revalidate_reason", "on-demand");
  });

  it("tags 'none' for normal (non-revalidation) request errors", async () => {
    const { onRequestError } = await import("../../instrumentation");
    await onRequestError(...makeArgs(undefined));
    expect(setTag).toHaveBeenCalledWith("next.revalidate_reason", "none");
  });

  it("delegates original (err, request, context) to Sentry.captureRequestError unmodified", async () => {
    const { onRequestError } = await import("../../instrumentation");
    const args = makeArgs("stale");
    await onRequestError(...args);
    expect(captureRequestError).toHaveBeenCalledTimes(1);
    expect(captureRequestError).toHaveBeenCalledWith(args[0], args[1], args[2]);
  });

  it("sets the tag BEFORE invoking captureRequestError (ordering invariant)", async () => {
    const callOrder: string[] = [];
    setTag.mockImplementation(() => {
      callOrder.push("setTag");
    });
    captureRequestError.mockImplementation(() => {
      callOrder.push("captureRequestError");
    });
    const { onRequestError } = await import("../../instrumentation");
    await onRequestError(...makeArgs("on-demand"));
    expect(callOrder).toEqual(["setTag", "captureRequestError"]);
  });
});
