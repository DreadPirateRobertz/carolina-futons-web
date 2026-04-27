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

beforeEach(() => {
  veloMocks.callVelo.mockReset();
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
