import { describe, it, expect, vi, beforeEach } from "vitest";

const authMocks = vi.hoisted(() => ({
  getMemberSession: vi.fn(),
  withMember: vi.fn(),
}));

const veloMocks = vi.hoisted(() => ({
  callVelo: vi.fn(),
}));

vi.mock("@/lib/auth/member", () => ({
  getMemberSession: authMocks.getMemberSession,
  withMember: authMocks.withMember,
}));

vi.mock("@/lib/wix/velo-client", () => ({
  callVelo: veloMocks.callVelo,
}));

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const SESSION = { memberId: "M-1", accessToken: "tok", tokens: {} as never };

beforeEach(() => {
  authMocks.getMemberSession.mockReset();
  authMocks.withMember.mockReset();
  veloMocks.callVelo.mockReset();
  mockLogError.mockClear();
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
    const { getReferralByCodeAction } = await import("@/app/actions/referral");
    const result = await getReferralByCodeAction("CF-BAD");
    expect(result).toEqual({ success: false, error: "Could not validate referral link." });
  });
});

// Logger migration (cfw-logger batch 12): all 4 referral action catches
// forward through logError so transient Velo failures land in Sentry
// with the "referral" source. One test per action pins the op tag.
describe("referral logError migration", () => {
  it("calls logError source='referral' op='getMyReferralCodeAction' on throw", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    const veloErr = new Error("rpc fail");
    veloMocks.callVelo.mockRejectedValueOnce(veloErr);
    const { getMyReferralCodeAction } = await import("@/app/actions/referral");
    await getMyReferralCodeAction();
    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [source, op, err] = mockLogError.mock.calls[0];
    expect(source).toBe("referral");
    expect(op).toBe("getMyReferralCodeAction");
    expect(err).toBe(veloErr);
  });

  it("calls logError op='getMyReferralStatsAction' on throw", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const { getMyReferralStatsAction } = await import("@/app/actions/referral");
    await getMyReferralStatsAction();
    expect(mockLogError.mock.calls[0][1]).toBe("getMyReferralStatsAction");
  });

  it("calls logError op='getReferralByCodeAction' on throw", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const { getReferralByCodeAction } = await import("@/app/actions/referral");
    await getReferralByCodeAction("CF-BAD");
    expect(mockLogError.mock.calls[0][1]).toBe("getReferralByCodeAction");
  });
});
