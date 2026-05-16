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

// cfw-7yf2: wishlist.ts catches now route through logError → Sentry
// for the three thrown-error branches (addToWishlistFromPdp,
// getWishlistCount, getSharedWishlist). Mock @sentry/nextjs so the
// runner doesn't ship real events AND the new logError-integration
// describe below can assert on the (scope, op) tag pair.
const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentryMocks.captureException,
  flush: sentryMocks.flush,
}));

beforeEach(() => {
  authMocks.getMemberSession.mockReset();
  veloMocks.callVelo.mockReset();
  sentryMocks.captureException.mockReset();
  sentryMocks.flush.mockReset().mockResolvedValue(true);
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
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");
    const result = await addToWishlistFromPdp("P-1", "Monterey", 1299);
    expect(result).toEqual({
      success: false,
      error: "Could not save. Please try again.",
    });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

// cfw-7yf2: pin logError integration on all three migrated catches.
// wishlist failures are a P1 operational signal — a silent badge that
// stops counting (getWishlistCount returns 0 on throw) is the exact
// kind of degradation an end-member won't report but a Sentry alert
// will catch within minutes.
describe("wishlist actions — logError integration", () => {
  const SESSION = {
    memberId: "M-1",
    accessToken: "tok",
    tokens: {} as never,
  };

  it("addToWishlistFromPdp throw → captures scope='wishlist' + op='addToWishlistFromPdp failed' + flush(2000)", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    const thrown = new Error("rpc fail addToWishlistFromPdp");
    veloMocks.callVelo.mockRejectedValueOnce(thrown);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { addToWishlistFromPdp } = await import("@/app/actions/wishlist");

    const result = await addToWishlistFromPdp("P-1", "Monterey", 1299);

    expect(result).toEqual({
      success: false,
      error: "Could not save. Please try again.",
    });
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "wishlist",
      op: "addToWishlistFromPdp failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryMocks.flush).toHaveBeenCalledWith(2000);
    errSpy.mockRestore();
  });

  it("getWishlistCount throw → captures scope='wishlist' + op='getWishlistCount failed' AND returns 0 (badge silently hides, not server-error)", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    const thrown = new Error("rpc fail getWishlistCount");
    veloMocks.callVelo.mockRejectedValueOnce(thrown);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getWishlistCount } = await import("@/app/actions/wishlist");

    const count = await getWishlistCount();

    // Header-badge UX contract: a thrown error collapses to 0 so the
    // global header doesn't surface a toast — but the Sentry pin
    // means an outage still gets seen by ops.
    expect(count).toBe(0);
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "wishlist",
      op: "getWishlistCount failed",
    });
    expect(sentryMocks.flush).toHaveBeenCalledWith(2000);
    errSpy.mockRestore();
  });

  it("getSharedWishlist throw → captures scope='wishlist' + op='getSharedWishlist failed'", async () => {
    // signMemberId + verifyShareToken use a shared HMAC secret. Sign
    // a valid token so the route reaches the try-block instead of
    // short-circuiting on token verification.
    process.env.WISHLIST_SHARE_SECRET = "test-share-secret";
    const { signMemberId } = await import("@/lib/wishlist/share-token");
    const token = signMemberId("M-1", "test-share-secret");

    const thrown = new Error("rpc fail getSharedWishlist");
    veloMocks.callVelo.mockRejectedValueOnce(thrown);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getSharedWishlist } = await import("@/app/actions/wishlist");

    const result = await getSharedWishlist(token);

    expect(result).toEqual({ success: false });
    const matching = sentryMocks.captureException.mock.calls.find(
      ([, opts]) =>
        (opts as { tags?: { op?: string } }).tags?.op ===
        "getSharedWishlist failed",
    );
    expect(matching).toBeDefined();
    const [reportedErr] = matching!;
    expect(reportedErr).toBe(thrown);
    errSpy.mockRestore();
  });

  it("getWishlistCount happy path does NOT call Sentry — keeps signal-to-noise high", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(SESSION);
    veloMocks.callVelo.mockResolvedValueOnce({
      success: true,
      total: 3,
      items: [],
    });
    const { getWishlistCount } = await import("@/app/actions/wishlist");

    const count = await getWishlistCount();

    expect(count).toBe(3);
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
    expect(sentryMocks.flush).not.toHaveBeenCalled();
  });

  it("getWishlistCount no-session early-return does NOT call Sentry (short-circuit before catch)", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(null);
    const { getWishlistCount } = await import("@/app/actions/wishlist");

    const count = await getWishlistCount();

    expect(count).toBe(0);
    expect(veloMocks.callVelo).not.toHaveBeenCalled();
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });
});
