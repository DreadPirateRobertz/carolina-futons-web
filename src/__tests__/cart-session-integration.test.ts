// Integration tests: addItemAction → hydrateCartAction share the same Wix
// visitor session (same mocked cookie jar). Tests the full action → cart.ts →
// wix-visitor-client.ts → cookie chain without mocking at the cart.ts level.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "wix-session",
  SESSION_COOKIE_OPTIONS: { httpOnly: true, path: "/" },
  parseSessionCookie: vi.fn(),
  serializeSessionTokens: vi.fn((t: unknown) => JSON.stringify(t)),
}));
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: vi.fn(),
}));

import { cookies } from "next/headers";
import { getWixClientWithTokens } from "@/lib/wix-client";
import { parseSessionCookie } from "@/lib/auth/session";

const MOCK_TOKENS = {
  accessToken: { value: "tok-abc", expiresAt: 9_999_999_999 },
  refreshToken: { value: "ref-xyz", role: "visitor" },
};

const mockGenerateVisitorTokens = vi.fn();
const mockAddToCurrentCart = vi.fn();
const mockGetCurrentCart = vi.fn();

const anonClient = { auth: { generateVisitorTokens: mockGenerateVisitorTokens } };
const seededClient = {
  currentCart: {
    addToCurrentCart: mockAddToCurrentCart,
    getCurrentCart: mockGetCurrentCart,
  },
};

// In-memory jar simulates one browser session shared across both action calls.
let cookieStore: Record<string, string> = {};
const mockJar = {
  get: vi.fn((name: string) =>
    cookieStore[name] !== undefined ? { value: cookieStore[name] } : undefined,
  ),
  set: vi.fn((name: string, value: string) => {
    cookieStore[name] = value;
  }),
};

beforeEach(() => {
  cookieStore = {};
  vi.clearAllMocks();
  mockJar.get.mockImplementation((name: string) =>
    cookieStore[name] !== undefined ? { value: cookieStore[name] } : undefined,
  );
  mockJar.set.mockImplementation((name: string, value: string) => {
    cookieStore[name] = value;
  });
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockJar);
  (parseSessionCookie as ReturnType<typeof vi.fn>).mockImplementation(
    (value?: string) => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
  );
  (getWixClientWithTokens as ReturnType<typeof vi.fn>).mockImplementation(
    (tokens?: unknown) => (tokens ? seededClient : anonClient),
  );
  mockGenerateVisitorTokens.mockResolvedValue(MOCK_TOKENS);
  mockAddToCurrentCart.mockResolvedValue({ cart: { _id: "cart1", lineItems: [] } });
  mockGetCurrentCart.mockResolvedValue({ _id: "cart1", lineItems: [] });
});

describe("cart session integration", () => {
  it("addItemAction mints visitor tokens that hydrateCartAction reuses from the cookie", async () => {
    const { addItemAction, hydrateCartAction } = await import(
      "@/app/actions/cart"
    );

    await addItemAction({ productId: "p1", quantity: 1 });
    expect(mockGenerateVisitorTokens).toHaveBeenCalledOnce();
    expect(mockJar.set).toHaveBeenCalledOnce();

    // Cookie now present — hydrateCartAction must NOT mint new tokens
    await hydrateCartAction();
    expect(mockGenerateVisitorTokens).toHaveBeenCalledOnce();
    expect(mockGetCurrentCart).toHaveBeenCalledOnce();
  });

  it("both actions operate on the seeded client (same Wix session identity)", async () => {
    const addedLine = {
      _id: "li1",
      catalogReference: { catalogItemId: "p1" },
      productName: "Daisy Futon",
      quantity: 1,
      price: { amount: "799.00", formattedAmount: "$799.00" },
    };
    mockAddToCurrentCart.mockResolvedValue({
      cart: { _id: "cart1", lineItems: [addedLine] },
    });
    mockGetCurrentCart.mockResolvedValue({
      _id: "cart1",
      lineItems: [addedLine],
    });

    const { addItemAction, hydrateCartAction } = await import(
      "@/app/actions/cart"
    );
    await addItemAction({ productId: "p1", quantity: 1 });
    const result = await hydrateCartAction();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].productId).toBe("p1");
    }
    expect(mockAddToCurrentCart).toHaveBeenCalledOnce();
    expect(mockGetCurrentCart).toHaveBeenCalledOnce();
  });

  it("hydrateCartAction returns empty lines without a session cookie", async () => {
    // cf-p7la: no cookie → getExistingVisitorCartClient returns null → no Wix
    // API call, no token generation. This is the critical half of the race fix.
    const { hydrateCartAction } = await import("@/app/actions/cart");
    const result = await hydrateCartAction();
    expect(result).toEqual({ ok: true, lines: [] });
    expect(mockGetCurrentCart).not.toHaveBeenCalled();
  });

  it("hydrateCartAction does NOT generate visitor tokens or set a cookie (cf-p7la race fix)", async () => {
    // Without this guarantee, a concurrent addItemAction and hydrateCartAction
    // both on first visit would each generate distinct visitor tokens. The later
    // Set-Cookie response would orphan the Wix cart written by the earlier add.
    const { hydrateCartAction } = await import("@/app/actions/cart");
    await hydrateCartAction();
    expect(mockGenerateVisitorTokens).not.toHaveBeenCalled();
    expect(mockJar.set).not.toHaveBeenCalled();
  });
});
