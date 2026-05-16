// cfw-r6w8: contract tests for dashboard wishlist page's logError
// migration. Three cases pin the getWishlist failure path:
//   1. Happy: getWishlist resolves → no logError call
//   2. getWishlist returns { success: false } → no logError call, but
//      page sets wishlistLoadFailed=true (covered indirectly by no-error
//      rendering)
//   3. getWishlist throws → logError("wishlist", "getWishlist", err)

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetMemberSession = vi.fn();
vi.mock("@/lib/auth/member", () => ({
  getMemberSession: (...args: unknown[]) => mockGetMemberSession(...args),
}));

const mockGetWishlist = vi.fn();
vi.mock("@/app/actions/wishlist", () => ({
  getWishlist: (...args: unknown[]) => mockGetWishlist(...args),
}));

const getCurrentMember = vi.fn(async () => ({
  member: { profile: { firstName: "Ada" } },
}));
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({ members: { getCurrentMember } }),
}));

// Stub component imports so we don't pull React-renderable children
// into this test — we're only exercising the page's load-path branching.
vi.mock("@/components/member/DashboardShell", () => ({
  DashboardShell: () => null,
}));
vi.mock("@/components/member/WishlistList", () => ({
  WishlistList: () => null,
}));
vi.mock("@/components/member/WishlistShareButton", () => ({
  WishlistShareButton: () => null,
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
});

describe("dashboard/wishlist page — getWishlist failure path (cfw-r6w8)", () => {
  it("happy path: getWishlist resolves, no logError", async () => {
    mockGetWishlist.mockResolvedValueOnce({
      success: true,
      items: [{ productId: "p-1" }],
    });
    const { default: Page } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    await Page();
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("getWishlist returns { success: false }: no logError (handled inline)", async () => {
    mockGetWishlist.mockResolvedValueOnce({ success: false });
    const { default: Page } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    await Page();
    // Inline { success: false } is the expected "wishlist unavailable"
    // path that the page surfaces via empty-state UI; nothing to alert
    // on. Only THROWS bubble through to Sentry.
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("getWishlist throws: logError fires, page does not propagate the throw", async () => {
    mockGetWishlist.mockRejectedValueOnce(new Error("wix down"));
    const { default: Page } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    // Page must not throw — empty-state covers the failure for the member.
    await expect(Page()).resolves.toBeDefined();
    expect(mockLogError).toHaveBeenCalledWith(
      "wishlist",
      "getWishlist",
      expect.any(Error),
    );
  });
});
