import { describe, it, expect, vi, beforeEach } from "vitest";

// ── share-token unit tests ────────────────────────────────────────

import { signMemberId, verifyShareToken } from "@/lib/wishlist/share-token";

const SECRET = "test-secret-abc";

describe("share-token", () => {
  it("signMemberId returns a token containing two dot-separated segments", () => {
    const token = signMemberId("member-123", SECRET);
    expect(token.split(".")).toHaveLength(2);
  });

  it("verifyShareToken returns the original memberId for a valid token", () => {
    const token = signMemberId("member-abc", SECRET);
    expect(verifyShareToken(token, SECRET)).toBe("member-abc");
  });

  it("verifyShareToken returns null for a tampered signature", () => {
    const token = signMemberId("member-abc", SECRET);
    const [idPart] = token.split(".");
    const tampered = `${idPart}.invalidsignature`;
    expect(verifyShareToken(tampered, SECRET)).toBeNull();
  });

  it("verifyShareToken returns null for a token with a different secret", () => {
    const token = signMemberId("member-abc", SECRET);
    expect(verifyShareToken(token, "wrong-secret")).toBeNull();
  });

  it("verifyShareToken returns null when there is no dot separator", () => {
    expect(verifyShareToken("nodottoken", SECRET)).toBeNull();
  });

  it("verifyShareToken returns null for an empty string", () => {
    expect(verifyShareToken("", SECRET)).toBeNull();
  });

  it("different memberIds produce different tokens", () => {
    const t1 = signMemberId("member-1", SECRET);
    const t2 = signMemberId("member-2", SECRET);
    expect(t1).not.toBe(t2);
  });

  it("signMemberId is deterministic for the same inputs", () => {
    const t1 = signMemberId("member-xyz", SECRET);
    const t2 = signMemberId("member-xyz", SECRET);
    expect(t1).toBe(t2);
  });
});

// ── generateShareToken + getSharedWishlist actions ────────────────

const authMocks = vi.hoisted(() => ({
  getMemberSession: vi.fn(),
  withMember: vi.fn(),
}));
const veloMocks = vi.hoisted(() => ({
  callVelo: vi.fn(),
}));

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
  // Pin WISHLIST_SHARE_SECRET so HMAC is deterministic in tests
  process.env.WISHLIST_SHARE_SECRET = SECRET;
});

describe("generateShareToken", () => {
  it("returns success:false when there is no session", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce(null);
    const { generateShareToken } = await import("@/app/actions/wishlist");
    const result = await generateShareToken();
    expect(result.success).toBe(false);
  });

  it("returns a verifiable token containing the memberId when authenticated", async () => {
    authMocks.getMemberSession.mockResolvedValueOnce({
      memberId: "M-share-1",
      accessToken: "tok",
      tokens: {} as never,
    });
    const { generateShareToken } = await import("@/app/actions/wishlist");
    const result = await generateShareToken();
    expect(result.success).toBe(true);
    if (!result.success) return; // type narrowing
    // Token must decode back to the memberId
    const decoded = verifyShareToken(result.token, SECRET);
    expect(decoded).toBe("M-share-1");
  });
});

describe("getSharedWishlist", () => {
  it("returns success:false for an invalid token", async () => {
    const { getSharedWishlist } = await import("@/app/actions/wishlist");
    const result = await getSharedWishlist("not.avalid.token.at.all");
    expect(result.success).toBe(false);
    expect(veloMocks.callVelo).not.toHaveBeenCalled();
  });

  it("calls Velo getWishlistByMemberId with the decoded memberId for a valid token", async () => {
    const token = signMemberId("M-42", SECRET);
    veloMocks.callVelo.mockResolvedValueOnce({
      success: true,
      items: [{ id: "wl-1", productId: "P-1", name: "Classic Futon", price: 299, priceAtAdd: 299, imageUrl: "", productSlug: "classic-futon", inStock: true, addedAt: null }],
      total: 1,
    });
    const { getSharedWishlist } = await import("@/app/actions/wishlist");
    const result = await getSharedWishlist(token);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.items).toHaveLength(1);
    expect(veloMocks.callVelo).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "wishlistService/getWishlistByMemberId",
        args: ["M-42"],
      }),
    );
  });

  it("does NOT pass an accessToken to Velo for the share view (Permissions.Anyone)", async () => {
    const token = signMemberId("M-42", SECRET);
    veloMocks.callVelo.mockResolvedValueOnce({ success: true, items: [], total: 0 });
    const { getSharedWishlist } = await import("@/app/actions/wishlist");
    await getSharedWishlist(token);
    const call = veloMocks.callVelo.mock.calls[0]?.[0];
    expect(call).not.toHaveProperty("accessToken");
  });

  it("returns success:false when Velo returns success:false", async () => {
    const token = signMemberId("M-42", SECRET);
    veloMocks.callVelo.mockResolvedValueOnce({ success: false, items: [], total: 0 });
    const { getSharedWishlist } = await import("@/app/actions/wishlist");
    const result = await getSharedWishlist(token);
    expect(result.success).toBe(false);
  });

  it("returns success:false when Velo throws", async () => {
    const token = signMemberId("M-42", SECRET);
    veloMocks.callVelo.mockRejectedValueOnce(new Error("Velo error"));
    const { getSharedWishlist } = await import("@/app/actions/wishlist");
    const result = await getSharedWishlist(token);
    expect(result.success).toBe(false);
  });

  it("returns success:true with empty items array when Velo returns no items", async () => {
    const token = signMemberId("M-42", SECRET);
    veloMocks.callVelo.mockResolvedValueOnce({ success: true, items: [], total: 0 });
    const { getSharedWishlist } = await import("@/app/actions/wishlist");
    const result = await getSharedWishlist(token);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
