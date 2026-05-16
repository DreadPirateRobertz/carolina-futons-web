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

// cfw-vuqd: trackCustomEvent failure path routes through logError.
const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

beforeEach(() => {
  veloMocks.callVelo.mockReset();
  mockLogError.mockReset();
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

  it("returns success:false + ships logError with httpStatus on VeloRpcError (cfw-vuqd)", async () => {
    const { VeloRpcError } = await import("@/lib/wix/velo-client");
    veloMocks.callVelo.mockRejectedValueOnce(
      new VeloRpcError("trackCustomEvent", 500, "boom"),
    );
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    const result = await trackCustomEvent("winback_landing_view");
    expect(result).toEqual({ success: false });
    expect(mockLogError).toHaveBeenCalledWith(
      "customEvents",
      "trackCustomEvent",
      expect.any(VeloRpcError),
      expect.objectContaining({
        eventName: "winback_landing_view",
        httpStatus: 500,
      }),
    );
  });

  it("returns success:false + ships logError with httpStatus undefined on unexpected (cfw-vuqd)", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("ECONNRESET"));
    const { trackCustomEvent } = await import("@/lib/wix/custom-events");
    const result = await trackCustomEvent("winback_landing_view");
    expect(result).toEqual({ success: false });
    expect(mockLogError).toHaveBeenCalledWith(
      "customEvents",
      "trackCustomEvent",
      expect.any(Error),
      expect.objectContaining({
        eventName: "winback_landing_view",
        httpStatus: undefined,
      }),
    );
  });
});
