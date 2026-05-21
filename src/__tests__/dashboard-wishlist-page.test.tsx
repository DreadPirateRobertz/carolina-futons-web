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

const mockGetCurrentMember = vi.hoisted(() => vi.fn());
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({
    members: { getCurrentMember: mockGetCurrentMember },
  }),
}));

const mockGetWishlist = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/wishlist", () => ({
  getWishlist: (...args: unknown[]) => mockGetWishlist(...args),
}));

vi.mock("@/components/member/DashboardShell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/member/WishlistList", () => ({
  WishlistList: ({
    initialItems,
  }: {
    initialItems: ReadonlyArray<{ id?: string }>;
  }) => (
    <div data-testid="wishlist-list" data-count={initialItems.length} />
  ),
}));

vi.mock("@/components/member/WishlistShareButton", () => ({
  WishlistShareButton: ({ loadFailed }: { loadFailed: boolean }) => (
    <div data-testid="share-button" data-failed={loadFailed ? "1" : "0"} />
  ),
}));

const SESSION = { memberId: "M-1", accessToken: "tok", tokens: {} as never };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue({
    member: {
      profile: { nickname: "Jane" },
      contact: { firstName: "Jane", lastName: "Doe" },
      loginEmail: "jane@example.com",
    },
  });
});

// Logger migration (cfw-logger batch 26): the dashboard wishlist tab's
// getWishlist catch previously logged to console.error. Now it forwards
// to logError with source="dashboard-wishlist".
describe("DashboardWishlistPage logError migration", () => {
  it("calls logError with source='dashboard-wishlist' op='getWishlist' on throw", async () => {
    mockGetMemberSession.mockResolvedValueOnce(SESSION);
    const veloErr = new Error("velo down");
    mockGetWishlist.mockRejectedValueOnce(veloErr);

    const { default: Page } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    const element = await Page();
    render(element);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [source, op, err] = mockLogError.mock.calls[0];
    expect(source).toBe("dashboard-wishlist");
    expect(op).toBe("getWishlist");
    expect(err).toBe(veloErr);
  });

  it("marks the share button as loadFailed=true when getWishlist throws", async () => {
    mockGetMemberSession.mockResolvedValueOnce(SESSION);
    mockGetWishlist.mockRejectedValueOnce(new Error("velo down"));

    const { default: Page } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    const element = await Page();
    const { getByTestId } = render(element);
    expect(getByTestId("share-button").getAttribute("data-failed")).toBe("1");
    expect(getByTestId("wishlist-list").getAttribute("data-count")).toBe("0");
  });

  it("does NOT call logError on the happy path (getWishlist resolves)", async () => {
    mockGetMemberSession.mockResolvedValueOnce(SESSION);
    mockGetWishlist.mockResolvedValueOnce({
      success: true,
      items: [{ id: "p1" }],
    });

    const { default: Page } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    const element = await Page();
    const { getByTestId } = render(element);
    expect(mockLogError).not.toHaveBeenCalled();
    expect(getByTestId("wishlist-list").getAttribute("data-count")).toBe("1");
    expect(getByTestId("share-button").getAttribute("data-failed")).toBe("0");
  });
});
