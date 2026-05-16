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

// cfw-387y: three wishlist action catches now route through logError.
// Mock here so failure tests assert call shape rather than parsing
// console output.
const mockLogError = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

beforeEach(() => {
  authMocks.getMemberSession.mockReset();
  veloMocks.callVelo.mockReset();
  mockLogError.mockReset();
});

describe("addToWishlistFromPdp", () => {
  it("returns {success:false, requiresAuth:true} when there is no session, without hitting Velo", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(null);
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");
    const result = await addToWishlistFromPdp("P-1", "Monterey", 1299);
    expect(result).toEqual({ success: false, requiresAuth: true });
    expect(veloMocks.callVelo).not.toHaveBeenCalled();
  });

  it("forwards productId/name/price/opts to wishlistService/addToWishlist with the member access token", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockResolvedValueOnce({ success: true });
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");
    await addToWishlistFromPdp("P-1", "Monterey", 1299, {
      variantId: "V-7",
      image: "https://example.test/p.jpg",
    });
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "wishlistService/addToWishlist",
      args: [
        "P-1",
        "Monterey",
        1299,
        { variantId: "V-7", image: "https://example.test/p.jpg" },
      ],
      accessToken: "tok",
    });
  });

  it("returns {success:true} when Velo confirms success", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockResolvedValueOnce({ success: true });
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");
    const result = await addToWishlistFromPdp("P-1", "Monterey", 1299);
    expect(result).toEqual({ success: true });
  });

  it("propagates the Velo error message on success:false", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockResolvedValueOnce({
      success: false,
      error: "Wishlist full",
    });
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");
    const result = await addToWishlistFromPdp("P-1", "Monterey", 1299);
    expect(result).toEqual({ success: false, error: "Wishlist full" });
  });

  it("returns a generic error and ships logError when Velo throws (cfw-387y)", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");
    const result = await addToWishlistFromPdp("P-1", "Monterey", 1299);
    expect(result).toEqual({
      success: false,
      error: "Could not save. Please try again.",
    });
    expect(mockLogError).toHaveBeenCalledWith(
      "wishlist",
      "addToWishlistFromPdp",
      expect.any(Error),
    );
  });
});

// cfw-387y: getWishlistCount and getSharedWishlist had no test coverage
// before this commit. Two focused tests pin their logError contracts.

describe("getWishlistCount (cfw-387y)", () => {
  it("returns 0 + ships logError when fetchWishlist throws (silent badge)", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockRejectedValueOnce(new Error("wix down"));
    const { getWishlistCount } = await import("@/app/actions/wishlist");
    const count = await getWishlistCount();
    expect(count).toBe(0);
    expect(mockLogError).toHaveBeenCalledWith(
      "wishlist",
      "getWishlistCount",
      expect.any(Error),
    );
  });
});

describe("getSharedWishlist (cfw-387y)", () => {
  it("returns {success:false} + ships logError when fetchWishlistByMemberId throws", async () => {
    process.env.WISHLIST_SHARE_SECRET = "test-secret-cfw-387y";
    const { signMemberId } = await import("@/lib/wishlist/share-token");
    const token = signMemberId("M-1", process.env.WISHLIST_SHARE_SECRET!);
    veloMocks.callVelo.mockRejectedValueOnce(new Error("wix down"));
    const { getSharedWishlist } = await import("@/app/actions/wishlist");
    const result = await getSharedWishlist(token);
    expect(result).toEqual({ success: false });
    expect(mockLogError).toHaveBeenCalledWith(
      "wishlist",
      "getSharedWishlist",
      expect.any(Error),
    );
  });
});
