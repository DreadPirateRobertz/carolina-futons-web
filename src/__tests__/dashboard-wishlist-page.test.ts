// cfw-fvqp: coverage for the catch path in
// src/app/(member)/dashboard/wishlist/page.tsx. RSC pages render as
// JSX/payload — we can't easily render the tree without the full RSC
// bundler harness, but we CAN invoke the async function and assert
// the side effects (logError + Sentry capture). The render output is
// discarded; what matters is that the catch routes through logError
// and Sentry is notified with the right tags.

import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from "vitest";

const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

const getMemberSession = vi.fn();
vi.mock("@/lib/auth/member", () => ({
  getMemberSession: () => getMemberSession(),
}));

const getCurrentMember = vi.fn();
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({
    members: { getCurrentMember: () => getCurrentMember() },
  }),
}));

const getWishlistMock = vi.fn();
vi.mock("@/app/actions/wishlist", () => ({
  getWishlist: () => getWishlistMock(),
}));

// Component imports are React; jsdom is fine. We don't render them.
vi.mock("@/components/member/DashboardShell", () => ({
  DashboardShell: () => null,
}));
vi.mock("@/components/member/WishlistList", () => ({
  WishlistList: () => null,
}));
vi.mock("@/components/member/WishlistShareButton", () => ({
  WishlistShareButton: () => null,
}));

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

const SESSION = {
  memberId: "M-1",
  accessToken: "tok",
  tokens: { accessToken: { value: "tok", expiresAt: 0 }, refreshToken: { value: "rt", role: "member" as const } },
};

beforeEach(() => {
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
  getMemberSession.mockReset();
  getCurrentMember.mockReset();
  getWishlistMock.mockReset();
  consoleError.mockClear();

  // Reasonable defaults: signed-in owner, member loaded, wishlist OK.
  getMemberSession.mockResolvedValue(SESSION);
  getCurrentMember.mockResolvedValue({
    member: {
      _id: "M-1",
      contact: { firstName: "Brenda", lastName: "S" },
      profile: { nickname: null },
      loginEmail: "brenda@example.com",
    },
  });
  getWishlistMock.mockResolvedValue({
    success: true,
    items: [],
    total: 0,
  });
});

describe("DashboardWishlistPage — logError integration on getWishlist throw", () => {
  it("captures with scope='wishlist' + op='getWishlist failed' + flush(2000) awaited", async () => {
    const err = new Error("velo down");
    getWishlistMock.mockRejectedValueOnce(err);

    const { default: DashboardWishlistPage } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    // Render output is RSC JSX — discard. We're asserting the catch
    // side-effect, not the rendered tree.
    await DashboardWishlistPage();

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(err);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "wishlist",
      op: "getWishlist failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("happy path (getWishlist returns success) does NOT call Sentry", async () => {
    getWishlistMock.mockResolvedValueOnce({
      success: true,
      items: [{ id: "x", productId: "p", name: "p", price: 0, priceAtAdd: 0, imageUrl: "", productSlug: "p", inStock: true, addedAt: null }],
      total: 1,
    });

    const { default: DashboardWishlistPage } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    await DashboardWishlistPage();

    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("getWishlist returns success:false (Velo soft-fail) does NOT call Sentry — that's the empty-state path, not a throw", async () => {
    getWishlistMock.mockResolvedValueOnce({
      success: false,
      items: [],
      total: 0,
    });

    const { default: DashboardWishlistPage } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    await DashboardWishlistPage();

    // success:false is a documented soft-fail shape that flips
    // wishlistLoadFailed without entering the catch. Sentry should
    // stay silent here — otherwise every cold-start wishlist with no
    // Velo backing would flood the dashboard.
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("not-signed-in early return: page exits before logError is reachable", async () => {
    getMemberSession.mockResolvedValueOnce(null);

    const { default: DashboardWishlistPage } = await import(
      "@/app/(member)/dashboard/wishlist/page"
    );
    const result = await DashboardWishlistPage();

    expect(result).toBeNull();
    expect(getWishlistMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
