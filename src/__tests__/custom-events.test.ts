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

// cfw-logger migration: trackCustomEvent catch branches route through logError.
const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

beforeEach(() => {
  veloMocks.callVelo.mockReset();
  logErrorMock.mockReset();
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
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    const result = await trackCustomEvent("winback_landing_view");
    expect(result).toEqual({ success: false });
    // Observability now routes through logError.
    expect(logErrorMock).toHaveBeenCalled();
  });

  it("returns success:false on a network/abort error without rethrowing", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("ECONNRESET"));
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    const result = await trackCustomEvent("winback_landing_view");
    expect(result).toEqual({ success: false });
    expect(logErrorMock).toHaveBeenCalled();
  });
});

// cfw-logger migration: trackCustomEvent catch routes through
// logError("customEvents", '<call>("<event>") <kind> failed', ...).
describe("trackCustomEvent — logError observability", () => {
  it("calls logError with a {status, message} payload when VeloRpcError fires", async () => {
    const { VeloRpcError } = await import("@/lib/wix/velo-client");
    veloMocks.callVelo.mockRejectedValueOnce(
      new VeloRpcError("trackCustomEvent", 500, "boom"),
    );
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    await trackCustomEvent("winback_landing_view");
    expect(logErrorMock).toHaveBeenCalledWith(
      "customEvents",
      'trackCustomEvent("winback_landing_view") rpc failed',
      expect.objectContaining({ status: 500 }),
    );
  });

  it("calls logError with the Error payload when the catch is a non-VeloRpcError", async () => {
    const err = new Error("ECONNRESET");
    veloMocks.callVelo.mockRejectedValueOnce(err);
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    await trackCustomEvent("winback_landing_view");
    expect(logErrorMock).toHaveBeenCalledWith(
      "customEvents",
      'trackCustomEvent("winback_landing_view") failed',
      err,
    );
  });

  it("interpolates the eventName into the logError message", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("boom"));
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    await trackCustomEvent("quiz_completed");
    expect(logErrorMock).toHaveBeenCalledWith(
      "customEvents",
      'trackCustomEvent("quiz_completed") failed',
      expect.anything(),
    );
  });
});
