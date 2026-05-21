import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const mockGetMemberSession = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/member", () => ({
  getMemberSession: (...args: unknown[]) => mockGetMemberSession(...args),
}));

const mockGetWishlist = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/wishlist", () => ({
  getWishlist: (...args: unknown[]) => mockGetWishlist(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/components/wishlist/WishlistView", () => ({
  WishlistView: ({
    initialItems,
  }: {
    initialItems: ReadonlyArray<{ id?: string }>;
  }) => (
    <div data-testid="wishlist-view" data-count={initialItems.length} />
  ),
}));

const SESSION = { memberId: "M-1", accessToken: "tok", tokens: {} as never };

beforeEach(() => {
  vi.clearAllMocks();
});

// Logger migration (cfw-logger batch 13): the wishlist page's getWishlist
// catch previously logged to console.error. Now it forwards through
// logError so Velo outages on /wishlist land in Sentry with the
// "wishlist-page" source.
describe("WishlistPage logError migration", () => {
  it("calls logError with source='wishlist-page' op='getWishlist' on throw", async () => {
    mockGetMemberSession.mockResolvedValueOnce(SESSION);
    const veloErr = new Error("velo down");
    mockGetWishlist.mockRejectedValueOnce(veloErr);

    const { default: WishlistPage } = await import("@/app/wishlist/page");
    const element = await WishlistPage();
    render(element);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [source, op, err] = mockLogError.mock.calls[0];
    expect(source).toBe("wishlist-page");
    expect(op).toBe("getWishlist");
    expect(err).toBe(veloErr);
  });

  it("renders WishlistView with empty items when getWishlist throws (resilient page contract)", async () => {
    mockGetMemberSession.mockResolvedValueOnce(SESSION);
    mockGetWishlist.mockRejectedValueOnce(new Error("velo down"));

    const { default: WishlistPage } = await import("@/app/wishlist/page");
    const element = await WishlistPage();
    const { getByTestId } = render(element);
    expect(getByTestId("wishlist-view").getAttribute("data-count")).toBe("0");
  });

  it("does NOT call logError on the happy path (getWishlist resolves)", async () => {
    mockGetMemberSession.mockResolvedValueOnce(SESSION);
    mockGetWishlist.mockResolvedValueOnce({
      success: true,
      items: [{ id: "p1" }, { id: "p2" }],
    });

    const { default: WishlistPage } = await import("@/app/wishlist/page");
    const element = await WishlistPage();
    const { getByTestId } = render(element);
    expect(mockLogError).not.toHaveBeenCalled();
    expect(getByTestId("wishlist-view").getAttribute("data-count")).toBe("2");
  });
});
