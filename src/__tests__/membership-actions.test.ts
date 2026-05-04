import { describe, it, expect, vi, beforeEach } from "vitest";

const authMocks = vi.hoisted(() => ({
  withMember: vi.fn(
    async (fn: (s: { accessToken: string; memberId: string }) => unknown) =>
      fn({ accessToken: "tok", memberId: "M-1" }),
  ),
}));

const veloMocks = vi.hoisted(() => ({
  callVelo: vi.fn(),
}));

vi.mock("@/lib/auth/member", () => ({
  withMember: authMocks.withMember,
}));

vi.mock("@/lib/wix/velo-client", () => ({
  callVelo: veloMocks.callVelo,
}));

beforeEach(() => {
  veloMocks.callVelo.mockReset();
});

describe("getMemberPerks", () => {
  it("calls rewardEngine/getMemberDeliveredPerks with no args and the member access token", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({ success: true, totalPoints: 120 });
    const { getMemberPerks } = await import("@/app/actions/membership");
    await getMemberPerks();
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "rewardEngine/getMemberDeliveredPerks",
      args: [],
      accessToken: "tok",
    });
  });

  it("passes through the Velo response when success=true", async () => {
    const payload = {
      success: true,
      currentTierName: "Trail Blazer",
      currentTierKey: "trail_blazer",
      totalPoints: 350,
      unlockedPerks: [{ tierKey: "trail_blazer", tierName: "Trail Blazer", perkId: "p1", label: "10% off", description: "Desc", icon: "🎉" }],
      nextTierName: "Mountain Guide",
      nextTierKey: "mountain_guide",
      nextTierPointsNeeded: 750,
      nextTierPerks: [],
    };
    veloMocks.callVelo.mockResolvedValueOnce(payload);
    const { getMemberPerks } = await import("@/app/actions/membership");
    const result = await getMemberPerks();
    expect(result).toEqual(payload);
  });

  it("passes through success=false from Velo", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({ success: false, error: "Not authenticated" });
    const { getMemberPerks } = await import("@/app/actions/membership");
    const result = await getMemberPerks();
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });
});
