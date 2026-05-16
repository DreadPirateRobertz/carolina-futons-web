// cfw-aatt: pin logError integration on /api/email/trigger.
// Two distinct catch branches:
//   1. VeloRpcError → Velo backend responded with non-2xx. Op tag
//      includes the velo method name (queueWelcomeEmail or
//      queueCartRecovery) so a flood from one method doesn't get
//      bucketed with the other in Sentry. status + body get pinned to
//      extra so the dashboard shows the upstream HTTP detail.
//   2. Anything else (network blip, abort, JSON parse from velo) →
//      op="unexpected error".
//
// Route returns 200 + { ok: false, error: "trigger-failed" } even on
// failure — email triggers MUST NOT block the user's primary action
// (signup / cart). That non-fatal contract is part of what the tests
// guard, alongside the logError shape.

import { describe, it, expect, beforeEach, vi } from "vitest";

const callVelo = vi.fn();

class FakeVeloRpcError extends Error {
  readonly name = "VeloRpcError";
  constructor(
    readonly method: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(`velo ${method} failed: HTTP ${status}`);
  }
}

vi.mock("@/lib/wix/velo-client", () => ({
  callVelo: (...args: unknown[]) => callVelo(...args),
  VeloRpcError: FakeVeloRpcError,
}));

const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

const consoleErrorSpy = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});

function makeReq(body: unknown): import("next/server").NextRequest {
  return {
    json: async () => body,
  } as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  callVelo.mockReset();
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
  consoleErrorSpy.mockClear();
  // Disable fixture short-circuit so the route actually hits the catch.
  delete process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS;
});

describe("/api/email/trigger — logError integration", () => {
  it("VeloRpcError on welcome → captures with scope='email/trigger' + op='Velo queueWelcomeEmail failed' + extra { status, body }", async () => {
    const veloErr = new FakeVeloRpcError(
      "queueWelcomeEmail",
      502,
      '{"message":"upstream timeout"}',
    );
    callVelo.mockRejectedValueOnce(veloErr);

    const { POST } = await import("@/app/api/email/trigger/route");
    const res = await POST(
      makeReq({ type: "welcome", email: "brenda@example.com" }),
    );

    // Non-fatal contract: still 200, ok:false. Email triggers must not
    // block the primary user flow.
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; error?: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("trigger-failed");

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(veloErr);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "email/trigger",
      op: "Velo queueWelcomeEmail failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      status: 502,
      body: '{"message":"upstream timeout"}',
    });
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("VeloRpcError on cart-recovery → op tag uses queueCartRecovery (not bucketed with welcome)", async () => {
    const veloErr = new FakeVeloRpcError("queueCartRecovery", 503, "");
    callVelo.mockRejectedValueOnce(veloErr);

    const { POST } = await import("@/app/api/email/trigger/route");
    const res = await POST(
      makeReq({
        type: "cart-recovery",
        items: [{ productId: "p1", quantity: 2 }],
      }),
    );
    expect(res.status).toBe(200);

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [, opts] = sentryCaptureException.mock.calls[0]!;
    expect((opts as { tags: Record<string, string> }).tags.op).toBe(
      "Velo queueCartRecovery failed",
    );
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      status: 503,
      body: "",
    });
  });

  it("non-VeloRpcError throw → captures with op='unexpected error' (no status/body extra)", async () => {
    const networkErr = new Error("fetch failed: ECONNRESET");
    callVelo.mockRejectedValueOnce(networkErr);

    const { POST } = await import("@/app/api/email/trigger/route");
    const res = await POST(
      makeReq({ type: "welcome", email: "brenda@example.com" }),
    );
    expect(res.status).toBe(200);

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(networkErr);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "email/trigger",
      op: "unexpected error",
    });
    // Non-Velo branch passes no extra — the helper omits it from the
    // Sentry options when extra is undefined.
    expect((opts as { extra?: unknown }).extra).toBeUndefined();
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("happy path (callVelo resolves) does NOT call Sentry — keeps signal-to-noise high", async () => {
    callVelo.mockResolvedValueOnce({ queued: true });

    const { POST } = await import("@/app/api/email/trigger/route");
    const res = await POST(
      makeReq({ type: "welcome", email: "brenda@example.com" }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);

    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("fixture-mode short-circuit never touches Velo and never logs to Sentry", async () => {
    process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS = "1";
    // Re-import the route so the module-level isFixtureMode reads the
    // updated env. (Route reads it once at module load.)
    vi.resetModules();

    const { POST } = await import("@/app/api/email/trigger/route");
    const res = await POST(
      makeReq({ type: "welcome", email: "brenda@example.com" }),
    );
    const json = (await res.json()) as { ok: boolean; skipped?: string };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.skipped).toBe("fixture-mode");

    expect(callVelo).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("validation failure (bad body) returns 400 and never reaches the catch (no Sentry)", async () => {
    const { POST } = await import("@/app/api/email/trigger/route");
    const res = await POST(makeReq({ type: "nonsense" }));
    expect(res.status).toBe(400);
    expect(callVelo).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
