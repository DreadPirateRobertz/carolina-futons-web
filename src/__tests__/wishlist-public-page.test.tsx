// cfw-4tu9: contract tests for the public /wishlist page's logError
// migration. Three cases pin the load-path branching, parallel to the
// cfw-r6w8 dashboard wishlist page tests:
//   1. Happy: getWishlist resolves → no logError
//   2. { success: false } inline → no logError (unauthenticated /
//      gracefully-degraded state, not an alert-worthy event)
//   3. getWishlist throws → logError("wishlist/page", "getWishlist", err)

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetMemberSession = vi.fn();
vi.mock("@/lib/auth/member", () => ({
  getMemberSession: (...args: unknown[]) => mockGetMemberSession(...args),
}));

const mockGetWishlist = vi.fn();
vi.mock("@/app/actions/wishlist", () => ({
  getWishlist: (...args: unknown[]) => mockGetWishlist(...args),
}));

const mockRedirect = vi.fn((path: string) => {
  // Mirror Next's redirect by throwing so the page short-circuits.
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({
  redirect: (p: string) => mockRedirect(p),
}));

// Stub the WishlistView import so we don't pull a real React component.
vi.mock("@/components/wishlist/WishlistView", () => ({
  WishlistView: () => null,
}));

const mockLogError = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const VALID_SESSION = {
  tokens: { accessToken: { value: "a" }, refreshToken: { value: "r" } },
  accessToken: "a",
  memberId: "member-1",
};

beforeEach(() => {
  mockGetMemberSession.mockReset();
  mockGetMemberSession.mockResolvedValue(VALID_SESSION);
  mockGetWishlist.mockReset();
  mockLogError.mockReset();
  mockRedirect.mockClear();
});

describe("/wishlist public page (cfw-4tu9)", () => {
  it("happy path: getWishlist resolves, no logError", async () => {
    mockGetWishlist.mockResolvedValueOnce({
      success: true,
      items: [{ productId: "p-1" }],
    });
    const { default: Page } = await import("@/app/wishlist/page");
    await Page();
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("{ success: false } inline (no items): no logError, no throw", async () => {
    mockGetWishlist.mockResolvedValueOnce({ success: false });
    const { default: Page } = await import("@/app/wishlist/page");
    await expect(Page()).resolves.toBeDefined();
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("getWishlist throws: logError fires, page resolves to empty state", async () => {
    mockGetWishlist.mockRejectedValueOnce(new Error("wix down"));
    const { default: Page } = await import("@/app/wishlist/page");
    await expect(Page()).resolves.toBeDefined();
    expect(mockLogError).toHaveBeenCalledWith(
      "wishlist/page",
      "getWishlist",
      expect.any(Error),
    );
  });
});
