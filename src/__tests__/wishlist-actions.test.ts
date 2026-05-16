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
vi.mock("@/lib/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

beforeEach(() => {
  authMocks.getMemberSession.mockReset();
  veloMocks.callVelo.mockReset();
  mockLogError.mockClear();
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

  it("returns a generic error when Velo throws", async () => {
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
  });

  // Logger migration (cfw-logger batch 20): the addToWishlistFromPdp
  // catch forwards to logError with source="wishlist". One test
  // pins the source + op tag + err pass-through, plus a happy-path
  // no-op so we catch a future refactor that accidentally logs successes.
  it("calls logError source='wishlist' op='addToWishlistFromPdp' on Velo throw", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    const veloErr = new Error("rpc fail");
    veloMocks.callVelo.mockRejectedValueOnce(veloErr);
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");
    await addToWishlistFromPdp("P-1", "Monterey", 1299);
    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [source, op, err] = mockLogError.mock.calls[0];
    expect(source).toBe("wishlist");
    expect(op).toBe("addToWishlistFromPdp");
    expect(err).toBe(veloErr);
  });

  it("does NOT call logError on the requiresAuth path (no session — handled, not Sentry-worthy)", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(null);
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");
    await addToWishlistFromPdp("P-1", "Monterey", 1299);
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("does NOT call logError on the happy-path (success)", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockResolvedValueOnce({ success: true });
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");
    await addToWishlistFromPdp("P-1", "Monterey", 1299);
    expect(mockLogError).not.toHaveBeenCalled();
  });
});
