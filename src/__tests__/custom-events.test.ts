import { describe, it, expect, vi, beforeEach } from "vitest";

const veloMocks = vi.hoisted(() => ({
  callVelo: vi.fn(),
}));

vi.mock("@/lib/wix/velo-client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/wix/velo-client")>(
      "@/lib/wix/velo-client",
    );
  return { ...actual, callVelo: veloMocks.callVelo };
});

// cfw-wuju: trackCustomEvent catches now route through logError →
// Sentry. Mock @sentry/nextjs so tests don't ship events AND the new
// logError-integration describe below can assert (scope, op) tags +
// eventName extra.
const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: sentryMocks.captureException,
  flush: sentryMocks.flush,
}));

beforeEach(() => {
  veloMocks.callVelo.mockReset();
  sentryMocks.captureException.mockReset();
  sentryMocks.flush.mockReset().mockResolvedValue(true);
});

describe("trackCustomEvent", () => {
  it("calls /_functions/trackCustomEvent (HTTP fn) with [eventName, params] args", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({ success: true });
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    const result = await trackCustomEvent("winback_landing_view", {
      source: "winback",
      utm_source: "email",
    });
    expect(result).toEqual({ success: true });
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "trackCustomEvent",
      args: [
        "winback_landing_view",
        { source: "winback", utm_source: "email" },
      ],
    });
  });

  it("defaults params to {} when omitted", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({ success: true });
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    await trackCustomEvent("quiz_completed");
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "trackCustomEvent",
      args: ["quiz_completed", {}],
    });
  });

  it("returns success:false on VeloRpcError without rethrowing", async () => {
    const { VeloRpcError } = await import("@/lib/wix/velo-client");
    veloMocks.callVelo.mockRejectedValueOnce(
      new VeloRpcError("trackCustomEvent", 500, "boom"),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    const result = await trackCustomEvent("winback_landing_view");
    expect(result).toEqual({ success: false });
    // cfw-wuju: status now flows through Sentry extra, not the log
    // message string. The console.error from logError still fires
    // (for the deploy-log audit trail), so just assert it was called.
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("returns success:false on a network/abort error without rethrowing", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("ECONNRESET"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    const result = await trackCustomEvent("winback_landing_view");
    expect(result).toEqual({ success: false });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

// cfw-wuju: pin logError integration on both catches. Analytics
// outages are sneaky — events are fire-and-forget, so a Velo backend
// returning 500 to every trackCustomEvent call is silent unless an
// ops dashboard surfaces it. Sentry (scope, op, eventName) now does.
describe("trackCustomEvent — logError integration", () => {
  it("VeloRpcError branch captures scope='customEvents' + op='trackCustomEvent rpc failed' + extra { eventName, status } + flush(2000)", async () => {
    const { VeloRpcError } = await import("@/lib/wix/velo-client");
    const veloErr = new VeloRpcError("trackCustomEvent", 503, "upstream");
    veloMocks.callVelo.mockRejectedValueOnce(veloErr);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    const result = await trackCustomEvent("quiz_completed", { source: "pdp" });

    expect(result).toEqual({ success: false });
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(veloErr);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "customEvents",
      op: "trackCustomEvent rpc failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      eventName: "quiz_completed",
      status: 503,
    });
    expect(sentryMocks.flush).toHaveBeenCalledWith(2000);
    errSpy.mockRestore();
  });

  it("non-Velo throw branch captures op='trackCustomEvent failed' (no status, eventName only)", async () => {
    const thrown = new Error("ECONNRESET");
    veloMocks.callVelo.mockRejectedValueOnce(thrown);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    await trackCustomEvent("winback_landing_view");

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "customEvents",
      op: "trackCustomEvent failed",
    });
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      eventName: "winback_landing_view",
    });
    errSpy.mockRestore();
  });

  it("happy path (success:true) does NOT call Sentry — analytics noise floor would drown out real outages", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({ success: true });

    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    await trackCustomEvent("quiz_completed");

    expect(sentryMocks.captureException).not.toHaveBeenCalled();
    expect(sentryMocks.flush).not.toHaveBeenCalled();
  });
});
