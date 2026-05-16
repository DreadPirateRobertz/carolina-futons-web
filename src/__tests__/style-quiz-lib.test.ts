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

// cfw-eog2: style-quiz catches now route through logError → Sentry.
// Mock @sentry/nextjs so the runner doesn't ship events AND the new
// logError-integration describe below can assert (scope, op) tags
// + emailHash extra (cfw-coc PII redaction pattern).
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
  // PII hash needs a salt; set deterministic value so emailHash is
  // verifiable across runs.
  process.env.LOG_PII_SALT = "test-salt-cfw-eog2";
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

// cfw-eog2: pin logError integration on all four catches. Quiz-lead
// captures are a P1 marketing pipeline — every silent failure is a
// lost lead. Plus cfw-coc PII contract: the lead's email MUST NOT
// flow to Sentry, only its hash.
describe("style-quiz — logError integration", () => {
  it("getQuizRecommendations throw → captures scope='styleQuiz' + op='getQuizRecommendations failed' + flush(2000)", async () => {
    const err = new Error("rpc 1");
    veloMocks.callVelo.mockRejectedValueOnce(err);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getQuizRecommendations } = await import("@/lib/wix/style-quiz");
    await getQuizRecommendations({ roomType: "dorm" });

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(err);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "styleQuiz",
      op: "getQuizRecommendations failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryMocks.flush).toHaveBeenCalledWith(2000);
    errSpy.mockRestore();
  });

  it("captureQuizLead VeloRpcError → captures op='captureQuizLead rpc failed' + extra { emailHash, status } — raw email MUST NOT appear", async () => {
    const { VeloRpcError } = await import("@/lib/wix/velo-client");
    const veloErr = new VeloRpcError(
      "styleQuiz/captureQuizLead",
      429,
      "rate limited",
    );
    veloMocks.callVelo.mockRejectedValueOnce(veloErr);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { captureQuizLead } = await import("@/lib/wix/style-quiz");
    await captureQuizLead("brenda@example.com", { roomType: "dorm" });

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(veloErr);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "styleQuiz",
      op: "captureQuizLead rpc failed",
    });
    const extra = (opts as { extra: Record<string, unknown> }).extra;
    expect(extra.status).toBe(429);
    // cfw-coc: lead email MUST NOT leak to Sentry — only its hash.
    expect(typeof extra.emailHash).toBe("string");
    expect((extra.emailHash as string).length).toBeGreaterThan(0);
    expect(extra.emailHash).not.toContain("brenda@example.com");
    expect(extra.emailHash).not.toContain("@");
    // The Sentry payload as a whole MUST NOT contain the raw email.
    const serialized = JSON.stringify(sentryMocks.captureException.mock.calls);
    expect(serialized).not.toContain("brenda@example.com");
    errSpy.mockRestore();
  });

  it("captureQuizLead non-Velo throw → captures op='captureQuizLead failed' + extra { emailHash } (no status)", async () => {
    const thrown = new Error("ECONNRESET");
    veloMocks.callVelo.mockRejectedValueOnce(thrown);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { captureQuizLead } = await import("@/lib/wix/style-quiz");
    await captureQuizLead("brenda@example.com", {});

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "styleQuiz",
      op: "captureQuizLead failed",
    });
    const extra = (opts as { extra: Record<string, unknown> }).extra;
    expect(extra.emailHash).toBeDefined();
    expect("status" in extra).toBe(false);
    errSpy.mockRestore();
  });

  it("getPersonalizedCopy throw → captures op='getPersonalizedCopy failed' with the original err", async () => {
    const thrown = new Error("network");
    veloMocks.callVelo.mockRejectedValueOnce(thrown);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getPersonalizedCopy } = await import("@/lib/wix/style-quiz");
    await getPersonalizedCopy({});

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "styleQuiz",
      op: "getPersonalizedCopy failed",
    });
    errSpy.mockRestore();
  });

  it("happy paths across all three velo-backed functions do NOT call Sentry", async () => {
    veloMocks.callVelo
      .mockResolvedValueOnce([]) // getQuizRecommendations
      .mockResolvedValueOnce({ success: true }) // captureQuizLead
      .mockResolvedValueOnce({ copy: "x", profileType: "y" }); // getPersonalizedCopy

    const styleQuiz = await import("@/lib/wix/style-quiz");
    await styleQuiz.getQuizRecommendations({});
    await styleQuiz.captureQuizLead("test@example.com", {});
    await styleQuiz.getPersonalizedCopy({});

    expect(sentryMocks.captureException).not.toHaveBeenCalled();
    expect(sentryMocks.flush).not.toHaveBeenCalled();
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
