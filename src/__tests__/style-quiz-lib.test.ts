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

describe("getQuizOptions", () => {
  it("calls styleQuiz/getQuizOptions with empty args", async () => {
    const mock = { roomTypes: [], primaryUses: [], stylePreferences: [], sizeOptions: [], budgetRanges: [] };
    veloMocks.callVelo.mockResolvedValueOnce(mock);
    const { getQuizOptions } = await import("@/lib/wix/style-quiz");
    const result = await getQuizOptions();
    expect(result).toEqual(mock);
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "styleQuiz/getQuizOptions",
      args: [],
    });
  });

  it("returns null on error without rethrowing", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("network error"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getQuizOptions } = await import("@/lib/wix/style-quiz");
    const result = await getQuizOptions();
    expect(result).toBeNull();
    errSpy.mockRestore();
  });
});

describe("getQuizRecommendations", () => {
  it("calls styleQuiz/getQuizRecommendations with answers", async () => {
    const answers = { roomType: "living-room", budgetRange: "500-1000" };
    const recs = [{ product: { _id: "p1", name: "Mesa 1000", slug: "mesa-1000", price: 599, formattedPrice: "$599" }, score: 80, reason: "Great for living rooms" }];
    veloMocks.callVelo.mockResolvedValueOnce(recs);
    const { getQuizRecommendations } = await import("@/lib/wix/style-quiz");
    const result = await getQuizRecommendations(answers);
    expect(result).toEqual(recs);
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "styleQuiz/getQuizRecommendations",
      args: [answers],
    });
  });

  it("returns [] on error without rethrowing", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("timeout"));
    const { getQuizRecommendations } = await import("@/lib/wix/style-quiz");
    const result = await getQuizRecommendations({});
    expect(result).toEqual([]);
  });
});

describe("captureQuizLead", () => {
  it("calls styleQuiz/captureQuizLead with email and partial answers", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({ success: true });
    const { captureQuizLead } = await import("@/lib/wix/style-quiz");
    const result = await captureQuizLead("test@example.com", { roomType: "dorm" });
    expect(result).toEqual({ success: true });
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "styleQuiz/captureQuizLead",
      args: ["test@example.com", { roomType: "dorm" }],
    });
  });

  it("returns success:false on error without rethrowing", async () => {
    const { VeloRpcError } = await import("@/lib/wix/velo-client");
    veloMocks.callVelo.mockRejectedValueOnce(
      new VeloRpcError("styleQuiz/captureQuizLead", 429, "rate limited"),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { captureQuizLead } = await import("@/lib/wix/style-quiz");
    const result = await captureQuizLead("bad@example.com", {});
    expect(result).toEqual({ success: false });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("getPersonalizedCopy", () => {
  it("calls styleQuiz/getPersonalizedCopy with answers", async () => {
    const answers = { roomType: "dorm", primaryUse: "both" };
    veloMocks.callVelo.mockResolvedValueOnce({ copy: "Great for small spaces", profileType: "compact" });
    const { getPersonalizedCopy } = await import("@/lib/wix/style-quiz");
    const result = await getPersonalizedCopy(answers);
    expect(result).toEqual({ copy: "Great for small spaces", profileType: "compact" });
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "styleQuiz/getPersonalizedCopy",
      args: [answers],
    });
  });

  it("returns empty fallback on error", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("network"));
    const { getPersonalizedCopy } = await import("@/lib/wix/style-quiz");
    const result = await getPersonalizedCopy({});
    expect(result).toEqual({ copy: "", profileType: "style" });
  });
});
