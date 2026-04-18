import { describe, it, expect, beforeEach, vi } from "vitest";

const callVelo = vi.fn(async (x: unknown) => ({ veloCalledWith: x }));
vi.mock("@/lib/wix/velo-client", () => ({ callVelo }));

const withMember = vi.fn(
  async (fn: (m: { accessToken: string; memberId: string }) => Promise<unknown>) =>
    fn({ accessToken: "access-xyz", memberId: "member-42" }),
);
vi.mock("@/lib/auth/member", () => ({ withMember }));

beforeEach(() => {
  callVelo.mockClear();
  withMember.mockClear();
});

describe("wishlist actions", () => {
  it("addToWishlist passes full arg set + bearer token", async () => {
    const { addToWishlist } = await import("@/app/actions/wishlist");
    await addToWishlist("p1", "Eureka", 399, { variantId: "v1", image: "e.jpg" });
    expect(callVelo).toHaveBeenCalledWith({
      method: "wishlistService/addToWishlist",
      args: ["p1", "Eureka", 399, { variantId: "v1", image: "e.jpg" }],
      accessToken: "access-xyz",
    });
  });

  it("addToWishlist defaults opts to empty object", async () => {
    const { addToWishlist } = await import("@/app/actions/wishlist");
    await addToWishlist("p1", "Eureka", 399);
    const callArg = callVelo.mock.calls[0][0] as { args: unknown[] };
    expect(callArg.args[3]).toEqual({});
  });

  it("getWishlist + isOnWishlist + removeFromWishlist wrap with withMember", async () => {
    const mod = await import("@/app/actions/wishlist");
    await mod.getWishlist();
    await mod.isOnWishlist("p1");
    await mod.removeFromWishlist("p1");
    expect(withMember).toHaveBeenCalledTimes(3);
    expect(callVelo).toHaveBeenCalledTimes(3);
  });

  it("wishlist actions surface does NOT export updateWishlistStock (Admin-only)", async () => {
    const mod = await import("@/app/actions/wishlist");
    expect("updateWishlistStock" in mod).toBe(false);
  });
});

describe("loyalty actions", () => {
  it("getMyLoyaltyAccount passes empty args + bearer token", async () => {
    const { getMyLoyaltyAccount } = await import("@/app/actions/loyalty");
    await getMyLoyaltyAccount();
    expect(callVelo).toHaveBeenCalledWith({
      method: "loyaltyService/getMyLoyaltyAccount",
      args: [],
      accessToken: "access-xyz",
    });
  });

  it("getMyActivity passes limit arg", async () => {
    const { getMyActivity } = await import("@/app/actions/loyalty");
    await getMyActivity(50);
    expect(callVelo).toHaveBeenCalledWith({
      method: "loyaltyService/getMyActivity",
      args: [50],
      accessToken: "access-xyz",
    });
  });

  it("getLeaderboard routes to loyaltyService (member-scoped board)", async () => {
    const { getLeaderboard } = await import("@/app/actions/loyalty");
    await getLeaderboard(25);
    expect(callVelo.mock.calls[0][0]).toMatchObject({
      method: "loyaltyService/getLeaderboard",
      args: [25],
    });
  });

  it("redeemReward takes rewardId only (memberId comes from bearer)", async () => {
    const { redeemReward } = await import("@/app/actions/loyalty");
    await redeemReward("reward-1");
    expect(callVelo).toHaveBeenCalledWith({
      method: "loyaltyService/redeemReward",
      args: ["reward-1"],
      accessToken: "access-xyz",
    });
  });
});

describe("gamification actions", () => {
  it("getActiveChallenges passes memberId as first positional arg", async () => {
    const { getActiveChallenges } = await import("@/app/actions/gamification");
    await getActiveChallenges();
    expect(callVelo).toHaveBeenCalledWith({
      method: "gamificationCore/getActiveChallenges",
      args: ["member-42"],
      accessToken: "access-xyz",
    });
  });

  it("getActivityFeed passes [memberId, limit]", async () => {
    const { getActivityFeed } = await import("@/app/actions/gamification");
    await getActivityFeed(30);
    expect(callVelo.mock.calls[0][0]).toMatchObject({
      method: "gamificationCore/getActivityFeed",
      args: ["member-42", 30],
    });
  });

  it("recordChallengeProgress sends {memberId, challengeId}", async () => {
    const { recordChallengeProgress } = await import("@/app/actions/gamification");
    await recordChallengeProgress("challenge-1");
    expect(callVelo).toHaveBeenCalledWith({
      method: "gamificationCore/recordChallengeProgress",
      args: [{ memberId: "member-42", challengeId: "challenge-1" }],
      accessToken: "access-xyz",
    });
  });

  it("receiveGamificationEvent passes (eventName, payload, memberId)", async () => {
    const { receiveGamificationEvent } = await import("@/app/actions/gamification");
    await receiveGamificationEvent("purchase", { orderId: "o1" });
    expect(callVelo).toHaveBeenCalledWith({
      method: "gamificationCore/receiveGamificationEvent",
      args: ["purchase", { orderId: "o1" }, "member-42"],
      accessToken: "access-xyz",
    });
  });

  it("getLeaderboardPublic skips withMember AND accessToken (Anyone endpoint)", async () => {
    const { getLeaderboardPublic } = await import("@/app/actions/gamification");
    await getLeaderboardPublic(15, null);
    expect(withMember).not.toHaveBeenCalled();
    expect(callVelo).toHaveBeenCalledWith({
      method: "gamificationCore/getLeaderboard",
      args: [15, null],
    });
  });

  it("getLeaderboardPublic allows logged-in caller to pass own memberId for highlight", async () => {
    const { getLeaderboardPublic } = await import("@/app/actions/gamification");
    await getLeaderboardPublic(10, "member-99");
    expect(callVelo.mock.calls[0][0]).toMatchObject({
      args: [10, "member-99"],
    });
  });
});
