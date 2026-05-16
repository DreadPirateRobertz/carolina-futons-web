// cfw-dsgh: coverage for the catch path in src/app/wishlist/page.tsx.
// Top-level /wishlist is the deep-link surface for the wishlist (email
// shares, PDP CTA, etc.) — a silent Velo outage here would render the
// page with an empty wishlist and no operational signal. The logError
// catch makes that visible to Sentry.
//
// Analogous to cfw-fvqp / dashboard-wishlist-page.test.ts. RSC pages
// render as JSX/payload — we don't render the tree, we just invoke
// the async function and assert side-effects (logError → Sentry).

import { describe, it, expect, beforeEach, vi } from "vitest";

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

const getWishlistMock = vi.fn();
vi.mock("@/app/actions/wishlist", () => ({
  getWishlist: () => getWishlistMock(),
}));

const redirectMock = vi.fn<(path: string) => never>((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({
  redirect: (p: string) => redirectMock(p),
}));

// WishlistView is a React component; we don't render it.
vi.mock("@/components/wishlist/WishlistView", () => ({
  WishlistView: () => null,
}));

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

const SESSION = {
  memberId: "M-1",
  accessToken: "tok",
  tokens: {
    accessToken: { value: "tok", expiresAt: 0 },
    refreshToken: { value: "rt", role: "member" as const },
  },
};

beforeEach(() => {
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
  getMemberSession.mockReset();
  getWishlistMock.mockReset();
  redirectMock.mockClear();
  consoleError.mockClear();
});

describe("WishlistPage — logError integration on getWishlist throw", () => {
  it("captures with scope='wishlist' + op='page load failed' + flush(2000) awaited", async () => {
    getMemberSession.mockResolvedValueOnce(SESSION);
    const err = new Error("velo down");
    getWishlistMock.mockRejectedValueOnce(err);

    const { default: WishlistPage } = await import("@/app/wishlist/page");
    await WishlistPage();

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(err);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "wishlist",
      op: "page load failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("happy path (getWishlist returns success) does NOT call Sentry", async () => {
    getMemberSession.mockResolvedValueOnce(SESSION);
    getWishlistMock.mockResolvedValueOnce({
      success: true,
      items: [
        {
          id: "x",
          productId: "p",
          name: "p",
          price: 0,
          priceAtAdd: 0,
          imageUrl: "",
          productSlug: "p",
          inStock: true,
          addedAt: null,
        },
      ],
      total: 1,
    });

    const { default: WishlistPage } = await import("@/app/wishlist/page");
    await WishlistPage();

    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("getWishlist returns success:false (Velo soft-fail) does NOT call Sentry — empty-state path, not a throw", async () => {
    getMemberSession.mockResolvedValueOnce(SESSION);
    getWishlistMock.mockResolvedValueOnce({
      success: false,
      items: [],
      total: 0,
    });

    const { default: WishlistPage } = await import("@/app/wishlist/page");
    await WishlistPage();

    // Soft-fail flips initialItems to [] without entering the catch.
    // Sentry stays silent — otherwise every cold-start wishlist load
    // with no Velo backing would flood the dashboard.
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("no-session redirect: page exits before logError is reachable", async () => {
    getMemberSession.mockResolvedValueOnce(null);

    const { default: WishlistPage } = await import("@/app/wishlist/page");
    await expect(WishlistPage()).rejects.toThrow(
      "REDIRECT:/account?return_to=/wishlist",
    );
    expect(getWishlistMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
