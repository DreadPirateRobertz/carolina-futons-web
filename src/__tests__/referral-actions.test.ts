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

// cfw-x2at: four referral actions route failures through logError.
const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const SESSION = { memberId: "M-1", accessToken: "tok", tokens: {} as never };

beforeEach(() => {
  authMocks.getMemberSession.mockReset();
  authMocks.withMember.mockReset();
  veloMocks.callVelo.mockReset();
  mockLogError.mockReset();
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

  it("returns error + ships logError with code in extras when Velo throws (cfw-x2at)", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const { getReferralByCodeAction } = await import("@/app/actions/referral");
    const result = await getReferralByCodeAction("CF-BAD");
    expect(result).toEqual({ success: false, error: "Could not validate referral link." });
    expect(mockLogError).toHaveBeenCalledWith(
      "referral",
      "getReferralByCode",
      expect.any(Error),
      expect.objectContaining({ code: "CF-BAD" }),
    );
  });
});

// cfw-x2at: getMyReferralCode + getMyReferralStats + claimReferral
// had no failure-path coverage before this commit. Three focused
// tests pin their logError contracts and the "log even though we
// returned a friendly error" behaviour.

describe("getMyReferralCodeAction — failure path (cfw-x2at)", () => {
  it("returns error + ships logError when Velo throws", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const { getMyReferralCodeAction } = await import("@/app/actions/referral");
    const result = await getMyReferralCodeAction();
    expect(result).toEqual({
      success: false,
      error: "Could not load referral code. Please try again.",
    });
    expect(mockLogError).toHaveBeenCalledWith(
      "referral",
      "getMyReferralCode",
      expect.any(Error),
    );
  });
});

describe("getMyReferralStatsAction — failure path (cfw-x2at)", () => {
  it("returns error + ships logError when Velo throws", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const { getMyReferralStatsAction } = await import("@/app/actions/referral");
    const result = await getMyReferralStatsAction();
    expect(result).toEqual({
      success: false,
      error: "Could not load stats. Please try again.",
    });
    expect(mockLogError).toHaveBeenCalledWith(
      "referral",
      "getMyReferralStats",
      expect.any(Error),
    );
  });
});

describe("claimReferralAction — failure path (cfw-x2at)", () => {
  it("returns error + ships logError with code in extras when withMember chain rejects", async () => {
    // claimReferralAction uses .catch on the withMember promise; mock
    // withMember to reject so the .catch handler fires.
    authMocks.withMember.mockRejectedValueOnce(new Error("rpc fail"));
    const { claimReferralAction } = await import("@/app/actions/referral");
    const result = await claimReferralAction("CF-X");
    expect(result).toEqual({
      success: false,
      error: "Could not apply referral. Please try again.",
    });
    expect(mockLogError).toHaveBeenCalledWith(
      "referral",
      "claimReferral",
      expect.any(Error),
      expect.objectContaining({ code: "CF-X" }),
    );
  });
});
