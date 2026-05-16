import { describe, it, expect, vi, beforeEach } from "vitest";

const authMocks = vi.hoisted(() => ({
  getMemberSession: vi.fn(),
  withMember: vi.fn(),
}));

const veloMocks = vi.hoisted(() => ({
  callVelo: vi.fn(),
}));

// cfw-9qoo: referral.ts now routes its 4 console.error sites through
// logError (Sentry.captureException + flush). Mock the @sentry/nextjs
// surface so tests don't ship real events from CI AND so the new
// "logError integration" describe block below can assert on tags.
const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/auth/member", () => ({
  getMemberSession: authMocks.getMemberSession,
  withMember: authMocks.withMember,
}));

vi.mock("@/lib/wix/velo-client", () => ({
  callVelo: veloMocks.callVelo,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentryMocks.captureException,
  flush: sentryMocks.flush,
}));

const SESSION = { memberId: "M-1", accessToken: "tok", tokens: {} as never };

beforeEach(() => {
  authMocks.getMemberSession.mockReset();
  authMocks.withMember.mockReset();
  veloMocks.callVelo.mockReset();
  sentryMocks.captureException.mockReset();
  sentryMocks.flush.mockReset().mockResolvedValue(true);
});

describe("getMyReferralCodeAction", () => {
  it("returns requiresAuth when no session", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(null);
    const { getMyReferralCodeAction } = await import("@/app/actions/referral");
    const result = await getMyReferralCodeAction();
    expect(result).toEqual({ success: false, requiresAuth: true });
    expect(veloMocks.callVelo).not.toHaveBeenCalled();
  });

  it("calls referralService/getMyReferralCode with member access token", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    veloMocks.callVelo.mockResolvedValueOnce({ success: true, code: "CF-ABC123" });
    const { getMyReferralCodeAction } = await import("@/app/actions/referral");
    const result = await getMyReferralCodeAction();
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "referralService/getMyReferralCode",
      args: [],
      accessToken: "tok",
    });
    expect(result).toEqual({ success: true, code: "CF-ABC123" });
  });

  it("returns error when Velo reports success:false", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    veloMocks.callVelo.mockResolvedValueOnce({ success: false, error: "Not enrolled" });
    const { getMyReferralCodeAction } = await import("@/app/actions/referral");
    const result = await getMyReferralCodeAction();
    expect(result).toEqual({ success: false, error: "Not enrolled" });
  });
});

describe("getMyReferralStatsAction", () => {
  it("returns stats when Velo succeeds", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    const stats = { totalReferrals: 3, pendingRewards: 25, earnedRewards: 50 };
    veloMocks.callVelo.mockResolvedValueOnce({ success: true, stats });
    const { getMyReferralStatsAction } = await import("@/app/actions/referral");
    const result = await getMyReferralStatsAction();
    expect(result).toEqual({ success: true, stats });
  });
});

describe("getReferralByCodeAction", () => {
  it("returns the referral for a valid code without auth", async () => {
    const referral = { valid: true, referrerName: "Jane", discountPct: 5 };
    veloMocks.callVelo.mockResolvedValueOnce({ success: true, referral });
    const { getReferralByCodeAction } = await import("@/app/actions/referral");
    const result = await getReferralByCodeAction("CF-ABC123");
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "referralService/getReferralByCode",
      args: ["CF-ABC123"],
    });
    expect(result).toEqual({ success: true, referral });
  });

  it("returns error when Velo throws", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getReferralByCodeAction } = await import("@/app/actions/referral");
    const result = await getReferralByCodeAction("CF-BAD");
    expect(result).toEqual({ success: false, error: "Could not validate referral link." });
    errSpy.mockRestore();
  });
});

// cfw-9qoo: pin the logError integration after migrating away from the
// four console.error("[referral] X failed:", err) hand-rolled log
// lines. A regression that drops any of these calls silently loses
// Sentry visibility on referral flow failures — and the four scopes
// share a single "scope" tag so Sentry dashboards can filter the
// whole subsystem.
describe("referral actions — logError integration", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  it("getMyReferralCodeAction Velo throw → captures with op='getMyReferralCodeAction failed'", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    const err = new Error("rpc 1");
    veloMocks.callVelo.mockRejectedValueOnce(err);
    const { getMyReferralCodeAction } = await import("@/app/actions/referral");

    await getMyReferralCodeAction();

    const matching = sentryMocks.captureException.mock.calls.find(
      ([, opts]) =>
        (opts as { tags?: { op?: string } }).tags?.op ===
        "getMyReferralCodeAction failed",
    );
    expect(matching).toBeDefined();
    const [reportedErr, opts] = matching!;
    expect(reportedErr).toBe(err);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "referral",
      op: "getMyReferralCodeAction failed",
    });
    expect(sentryMocks.flush).toHaveBeenCalledWith(2000);
  });

  it("getMyReferralStatsAction Velo throw → op='getMyReferralStatsAction failed'", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    const err = new Error("rpc 2");
    veloMocks.callVelo.mockRejectedValueOnce(err);
    const { getMyReferralStatsAction } = await import("@/app/actions/referral");

    await getMyReferralStatsAction();

    const matching = sentryMocks.captureException.mock.calls.find(
      ([, opts]) =>
        (opts as { tags?: { op?: string } }).tags?.op ===
        "getMyReferralStatsAction failed",
    );
    expect(matching).toBeDefined();
    const [, opts] = matching!;
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "referral",
      op: "getMyReferralStatsAction failed",
    });
  });

  it("getReferralByCodeAction Velo throw → op='getReferralByCodeAction failed'", async () => {
    const err = new Error("rpc 3");
    veloMocks.callVelo.mockRejectedValueOnce(err);
    const { getReferralByCodeAction } = await import("@/app/actions/referral");

    await getReferralByCodeAction("CF-BAD");

    const matching = sentryMocks.captureException.mock.calls.find(
      ([, opts]) =>
        (opts as { tags?: { op?: string } }).tags?.op ===
        "getReferralByCodeAction failed",
    );
    expect(matching).toBeDefined();
  });

  it("claimReferralAction withMember rejection routes through .catch + logError op='claimReferralAction failed'", async () => {
    const err = new Error("rpc 4");
    // withMember is the wrapper; make it return a rejecting promise so
    // the .catch async handler in claimReferralAction runs.
    authMocks.withMember.mockReturnValueOnce(Promise.reject(err));
    const { claimReferralAction } = await import("@/app/actions/referral");

    const result = await claimReferralAction("CF-XYZ");

    expect(result).toEqual({
      success: false,
      error: "Could not apply referral. Please try again.",
    });
    const matching = sentryMocks.captureException.mock.calls.find(
      ([, opts]) =>
        (opts as { tags?: { op?: string } }).tags?.op ===
        "claimReferralAction failed",
    );
    expect(matching).toBeDefined();
    const [reportedErr] = matching!;
    expect(reportedErr).toBe(err);
  });

  it("happy path (no Velo throws) does NOT call Sentry — keeps the dashboard signal-to-noise high", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    veloMocks.callVelo.mockResolvedValueOnce({ success: true, code: "CF-OK" });
    const { getMyReferralCodeAction } = await import("@/app/actions/referral");

    await getMyReferralCodeAction();

    expect(sentryMocks.captureException).not.toHaveBeenCalled();
    expect(sentryMocks.flush).not.toHaveBeenCalled();
  });

  consoleSpy.mockClear();
});
