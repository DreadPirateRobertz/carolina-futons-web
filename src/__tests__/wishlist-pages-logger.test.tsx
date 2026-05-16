// cfw-logger migration: both wishlist page server components (/wishlist
// + /(member)/dashboard/wishlist) route their catch through logError.
// The pages have no other dedicated tests — this file pins the logger
// contract only.

import { describe, it, expect, vi, beforeEach } from "vitest";

const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

const getWishlistMock = vi.fn();
vi.mock("@/app/actions/wishlist", () => ({
  getWishlist: () => getWishlistMock(),
}));

const getMemberSessionMock = vi.fn();
vi.mock("@/lib/auth/member", () => ({
  getMemberSession: () => getMemberSessionMock(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
}));

// Dashboard variant also reaches into the Wix client for memberName.
const getCurrentMemberMock = vi.fn();
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({
    members: { getCurrentMember: getCurrentMemberMock },
  }),
}));

// Heavy UI components — stub to identity-ish so server-render doesn't
// blow up on jsdom. We only assert on logError, not the JSX output.
vi.mock("@/components/wishlist/WishlistView", () => ({
  WishlistView: () => null,
}));
vi.mock("@/components/member/DashboardShell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/member/WishlistList", () => ({
  WishlistList: () => null,
}));
vi.mock("@/components/member/WishlistShareButton", () => ({
  WishlistShareButton: () => null,
}));

const VALID_SESSION = {
  accessToken: "tok",
  memberId: "m-1",
  tokens: {},
} as const;

beforeEach(() => {
  logErrorMock.mockReset();
  getWishlistMock.mockReset();
  getMemberSessionMock.mockReset();
  getCurrentMemberMock.mockReset();
  getMemberSessionMock.mockResolvedValue(VALID_SESSION);
  getCurrentMemberMock.mockResolvedValue({
    member: { _id: "m-1", loginEmail: "u@x.com" },
  });
});

describe("/wishlist page — logError on getWishlist throw", () => {
  it("routes the catch through logError with scope='wishlist-page'", async () => {
    const err = new Error("velo down");
    getWishlistMock.mockRejectedValueOnce(err);
    const { default: WishlistPage } = await import("@/app/wishlist/page");
    await WishlistPage();
    expect(logErrorMock).toHaveBeenCalledWith(
      "wishlist-page",
      "page load failed",
      err,
    );
  });

  it("does NOT call logError when getWishlist resolves with success:false (the catch only fires on throw)", async () => {
    getWishlistMock.mockResolvedValueOnce({ success: false, items: [] });
    const { default: WishlistPage } = await import("@/app/wishlist/page");
    await WishlistPage();
    expect(logErrorMock).not.toHaveBeenCalled();
  });
});

describe("/(member)/dashboard/wishlist page — logError on getWishlist throw", () => {
  it("routes the catch through logError with scope='dashboard-wishlist'", async () => {
    const err = new Error("velo down");
    getWishlistMock.mockRejectedValueOnce(err);
    const { default: DashboardWishlistPage } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    await DashboardWishlistPage();
    expect(logErrorMock).toHaveBeenCalledWith(
      "dashboard-wishlist",
      "getWishlist failed",
      err,
    );
  });
});
