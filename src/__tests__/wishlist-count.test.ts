// cfw-9vs: getWishlistCount Server Action contract tests.
//
// The header badge calls this on every page load. It must:
//   1. Return 0 silently for signed-out visitors (no auth round-trip)
//   2. Return 0 silently when Velo errors (a missing badge is preferable
//      to a global toast)
//   3. Return the number Velo reports when the call succeeds

import { describe, it, expect, vi, beforeEach } from "vitest";

const authMocks = vi.hoisted(() => ({
  getMemberSession: vi.fn(),
  withMember: vi.fn(),
}));
const veloMocks = vi.hoisted(() => ({ callVelo: vi.fn() }));

vi.mock("@/lib/auth/member", () => ({
  getMemberSession: authMocks.getMemberSession,
  withMember: authMocks.withMember,
}));
vi.mock("@/lib/wix/velo-client", () => ({
  callVelo: veloMocks.callVelo,
}));

beforeEach(() => {
  authMocks.getMemberSession.mockReset();
  veloMocks.callVelo.mockReset();
});

describe("getWishlistCount", () => {
  it("returns 0 without hitting Velo when there is no session", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(null);
    const { getWishlistCount } = await import("@/app/actions/wishlist");
    expect(await getWishlistCount()).toBe(0);
    expect(veloMocks.callVelo).not.toHaveBeenCalled();
  });

  it("returns Velo's total when the call succeeds", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockResolvedValueOnce({
      success: true,
      items: [{ id: "a" }, { id: "b" }, { id: "c" }],
      total: 3,
    });
    const { getWishlistCount } = await import("@/app/actions/wishlist");
    expect(await getWishlistCount()).toBe(3);
  });

  it("falls back to items.length when total is missing", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockResolvedValueOnce({
      success: true,
      items: [{ id: "a" }, { id: "b" }],
    });
    const { getWishlistCount } = await import("@/app/actions/wishlist");
    expect(await getWishlistCount()).toBe(2);
  });

  it("returns 0 (does not throw) when Velo returns success:false", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockResolvedValueOnce({ success: false });
    const { getWishlistCount } = await import("@/app/actions/wishlist");
    expect(await getWishlistCount()).toBe(0);
  });

  it("returns 0 (and logs) when Velo throws", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getWishlistCount } = await import("@/app/actions/wishlist");
    expect(await getWishlistCount()).toBe(0);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
