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

// cfw-6ngi: all three style-quiz reader catches now route through the
// shared logError helper. Mock here so failure-path tests assert call
// shape rather than parsing console output.
const mockLogError = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

beforeEach(() => {
  veloMocks.callVelo.mockReset();
  mockLogError.mockReset();
});

describe("getQuizOptions", () => {
  // cf-gnli: getQuizOptions now returns a local static constant instead of
  // a Velo RPC call. Velo webMethods are only callable from within the Wix
  // site runtime; the Next.js host cannot reach them, so the call always
  // returned null in production. Velo is still used for getQuizRecommendations
  // which requires a real wix-data product query.
  it("returns a non-null result with all five option categories", async () => {
    const { getQuizOptions } = await import("@/lib/wix/style-quiz");
    const result = await getQuizOptions();
    expect(result).not.toBeNull();
    // Use non-null assertion — if null slips back in, the assertions below
    // must catch it rather than silently passing via optional chaining.
    const opts = result!;
    expect(opts.roomTypes).toHaveLength(5);
    expect(opts.primaryUses).toHaveLength(3);
    expect(opts.stylePreferences).toHaveLength(3);
    expect(opts.sizeOptions).toHaveLength(3);
    expect(opts.budgetRanges).toHaveLength(4);
  });

  it("every option in every category has a value and label string", async () => {
    const { getQuizOptions } = await import("@/lib/wix/style-quiz");
    const result = await getQuizOptions();
    const opts = result!;
    const allOpts = [
      ...opts.roomTypes,
      ...opts.primaryUses,
      ...opts.stylePreferences,
      ...opts.sizeOptions,
      ...opts.budgetRanges,
    ];
    for (const opt of allOpts) {
      expect(typeof opt.value).toBe("string");
      expect(opt.value.length).toBeGreaterThan(0);
      expect(typeof opt.label).toBe("string");
      expect(opt.label.length).toBeGreaterThan(0);
    }
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
    // cfw-6ngi: failure routes through logError("style-quiz", "getQuizRecommendations", err)
    expect(mockLogError).toHaveBeenCalledWith(
      "style-quiz",
      "getQuizRecommendations",
      expect.any(Error),
    );
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

  it("returns success:false on VeloRpcError and tags httpStatus", async () => {
    const { VeloRpcError } = await import("@/lib/wix/velo-client");
    veloMocks.callVelo.mockRejectedValueOnce(
      new VeloRpcError("styleQuiz/captureQuizLead", 429, "rate limited"),
    );
    const { captureQuizLead } = await import("@/lib/wix/style-quiz");
    const result = await captureQuizLead("bad@example.com", {});
    expect(result).toEqual({ success: false });
    // cfw-6ngi: VeloRpcError surfaces httpStatus in Sentry extras
    expect(mockLogError).toHaveBeenCalledWith(
      "style-quiz",
      "captureQuizLead",
      expect.any(VeloRpcError),
      expect.objectContaining({ httpStatus: 429 }),
    );
  });

  it("returns success:false on unexpected (non-VeloRpcError) error", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("network down"));
    const { captureQuizLead } = await import("@/lib/wix/style-quiz");
    const result = await captureQuizLead("x@example.com", {});
    expect(result).toEqual({ success: false });
    // Non-VeloRpcError: httpStatus undefined, helper still captures stack
    expect(mockLogError).toHaveBeenCalledWith(
      "style-quiz",
      "captureQuizLead",
      expect.any(Error),
      expect.objectContaining({ httpStatus: undefined }),
    );
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
    // cfw-6ngi: failure routes through logError("style-quiz", "getPersonalizedCopy", err)
    expect(mockLogError).toHaveBeenCalledWith(
      "style-quiz",
      "getPersonalizedCopy",
      expect.any(Error),
    );
  });
});
