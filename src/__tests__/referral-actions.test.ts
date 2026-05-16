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

// cfw-logger migration: all four catch branches route through logError.
const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

const SESSION = { memberId: "M-1", accessToken: "tok", tokens: {} as never };

beforeEach(() => {
  authMocks.getMemberSession.mockReset();
  authMocks.withMember.mockReset();
  veloMocks.callVelo.mockReset();
  logErrorMock.mockReset();
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
    // Observability now routes through logError (cfw-logger migration).
    expect(logErrorMock).toHaveBeenCalled();
  });
});

// cfw-logger migration: all four catch branches route through
// logError("referral", "<fn> failed", err). Pin the contract.
describe("referral actions — logError observability", () => {
  it("getMyReferralCodeAction catch routes through logError", async () => {
    const err = new Error("rpc fail");
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    veloMocks.callVelo.mockRejectedValueOnce(err);
    const { getMyReferralCodeAction } = await import("@/app/actions/referral");
    await getMyReferralCodeAction();
    expect(logErrorMock).toHaveBeenCalledWith(
      "referral",
      "getMyReferralCodeAction failed",
      err,
    );
  });

  it("getMyReferralStatsAction catch routes through logError", async () => {
    const err = new Error("rpc fail");
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    veloMocks.callVelo.mockRejectedValueOnce(err);
    const { getMyReferralStatsAction } = await import("@/app/actions/referral");
    await getMyReferralStatsAction();
    expect(logErrorMock).toHaveBeenCalledWith(
      "referral",
      "getMyReferralStatsAction failed",
      err,
    );
  });

  it("claimReferralAction catch routes through logError", async () => {
    const err = new Error("rpc fail");
    authMocks.withMember.mockRejectedValueOnce(err);
    const { claimReferralAction } = await import("@/app/actions/referral");
    await claimReferralAction("CF-X");
    expect(logErrorMock).toHaveBeenCalledWith(
      "referral",
      "claimReferralAction failed",
      err,
    );
  });
});
