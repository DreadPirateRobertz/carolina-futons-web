// cf-cart-session-dual-write — verifies the fire-and-forget dual-write helper
// (a) hits the right Velo method with the right args, (b) NEVER throws to
// the caller, and (c) bails out cleanly when there's no session token.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCallVelo = vi.fn();
vi.mock("@/lib/wix/velo-client", () => ({
  callVelo: (...args: unknown[]) => mockCallVelo(...args),
}));

import {
  notifyCartSessionUpdate,
  type CartSessionItem,
} from "@/lib/wix/cart-session-dual-write";

const SAMPLE_ITEMS: CartSessionItem[] = [
  { productId: "prod-1", qty: 2, price: 49900 },
  { productId: "prod-2", qty: 1 },
];

beforeEach(() => {
  mockCallVelo.mockReset();
});

describe("notifyCartSessionUpdate (cf-cart-session-dual-write)", () => {
  it("calls callVelo with method=updateCartItems and args=[sessionToken, items]", async () => {
    mockCallVelo.mockResolvedValueOnce({ success: true });
    await notifyCartSessionUpdate("session-abc", SAMPLE_ITEMS);

    expect(mockCallVelo).toHaveBeenCalledTimes(1);
    const call = mockCallVelo.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.method).toBe("updateCartItems");
    expect(call.args).toEqual(["session-abc", SAMPLE_ITEMS]);
  });

  it("attaches an AbortSignal so a hung Velo endpoint can't leak", async () => {
    mockCallVelo.mockResolvedValueOnce({ success: true });
    await notifyCartSessionUpdate("session-abc", SAMPLE_ITEMS);

    const call = mockCallVelo.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.signal).toBeInstanceOf(AbortSignal);
  });

  it("resolves to undefined on Velo success (caller doesn't get a body)", async () => {
    mockCallVelo.mockResolvedValueOnce({ success: true, ignored: 1 });
    const result = await notifyCartSessionUpdate("session-abc", SAMPLE_ITEMS);
    expect(result).toBeUndefined();
  });

  it("never throws when callVelo rejects (Velo 404, network error, etc.)", async () => {
    mockCallVelo.mockRejectedValueOnce(new Error("HTTP 404"));
    await expect(
      notifyCartSessionUpdate("session-abc", SAMPLE_ITEMS),
    ).resolves.toBeUndefined();
  });

  it("never throws when callVelo rejects with non-Error", async () => {
    mockCallVelo.mockRejectedValueOnce("not an Error");
    await expect(
      notifyCartSessionUpdate("session-abc", SAMPLE_ITEMS),
    ).resolves.toBeUndefined();
  });

  it("short-circuits when sessionToken is empty (no callVelo)", async () => {
    await notifyCartSessionUpdate("", SAMPLE_ITEMS);
    expect(mockCallVelo).not.toHaveBeenCalled();
  });
});
