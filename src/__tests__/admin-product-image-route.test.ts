// cfw-6qd.7: POST /api/admin/product-image — owner-gated swap of a
// product's main image. Tests cover the auth ladder, body validation
// (productId, imageUrl shape + length), happy path with invalidateImage,
// and Wix-failure surfacing as 502.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetOwnerSession = vi.fn();
vi.mock("@/lib/auth/owner", () => ({
  getOwnerSession: (...args: unknown[]) => mockGetOwnerSession(...args),
}));

const mockUpdateProductMainImage = vi.fn();
vi.mock("@/lib/wix/product-image-write", () => ({
  updateProductMainImage: (...args: unknown[]) => mockUpdateProductMainImage(...args),
}));

const mockLogWixFailure = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => mockLogWixFailure(...args),
}));

// cfw-sej: route delegates cache invalidation to @/lib/admin/revalidate.
const mockInvalidateImage = vi.fn();
vi.mock("@/lib/admin/revalidate", () => ({
  invalidateImage: (...args: unknown[]) => mockInvalidateImage(...args),
}));

const OWNER_SESSION = {
  email: "owner@example.com",
  tokens: {
    accessToken: { value: "acc", expiresAt: 9_999_999_999 },
    refreshToken: { value: "ref", role: "member" },
  },
};

async function callPost(body: unknown, init: { rawBody?: string } = {}) {
  const { POST } = await import("@/app/api/admin/product-image/route");
  const req = new Request("http://localhost/api/admin/product-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: init.rawBody ?? JSON.stringify(body),
  });
  return POST(req as Parameters<typeof POST>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/product-image (cfw-6qd.7)", () => {
  it("returns 401 when no owner session", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(null);
    const res = await callPost({
      productId: "p1",
      imageUrl: "https://x.com/a.jpg",
    });
    expect(res.status).toBe(401);
    expect(mockUpdateProductMainImage).not.toHaveBeenCalled();
  });

  it("returns 200 + invalidates product image cache on owner success", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpdateProductMainImage.mockResolvedValueOnce({
      ok: true,
      productId: "prod-1",
      imageUrl: "https://static.wixstatic.com/media/abc.jpg",
    });
    const res = await callPost({
      productId: "prod-1",
      imageUrl: "https://static.wixstatic.com/media/abc.jpg",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      productId: "prod-1",
      imageUrl: "https://static.wixstatic.com/media/abc.jpg",
    });
    expect(mockUpdateProductMainImage).toHaveBeenCalledWith(
      OWNER_SESSION.tokens,
      "prod-1",
      "https://static.wixstatic.com/media/abc.jpg",
    );
    expect(mockInvalidateImage).toHaveBeenCalledWith("prod-1");
  });

  it("trims surrounding whitespace on productId and imageUrl", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpdateProductMainImage.mockResolvedValueOnce({
      ok: true,
      productId: "prod-1",
      imageUrl: "https://x.com/a.jpg",
    });
    await callPost({
      productId: "  prod-1  ",
      imageUrl: "  https://x.com/a.jpg  ",
    });
    expect(mockUpdateProductMainImage).toHaveBeenCalledWith(
      OWNER_SESSION.tokens,
      "prod-1",
      "https://x.com/a.jpg",
    );
  });

  it("accepts wix: scheme URLs (Wix-hosted media references)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpdateProductMainImage.mockResolvedValueOnce({
      ok: true,
      productId: "p",
      imageUrl: "wix:image://v1/xyz",
    });
    const res = await callPost({
      productId: "p",
      imageUrl: "wix:image://v1/xyz",
    });
    expect(res.status).toBe(200);
  });

  it("returns 400 when productId is missing", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    const res = await callPost({ imageUrl: "https://x.com/a.jpg" });
    expect(res.status).toBe(400);
    expect(mockUpdateProductMainImage).not.toHaveBeenCalled();
  });

  it("returns 400 when imageUrl is missing", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    const res = await callPost({ productId: "p" });
    expect(res.status).toBe(400);
    expect(mockUpdateProductMainImage).not.toHaveBeenCalled();
  });

  it("returns 400 when imageUrl uses a non-http/wix scheme", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    const res = await callPost({
      productId: "p",
      imageUrl: "javascript:alert(1)",
    });
    expect(res.status).toBe(400);
    expect(mockUpdateProductMainImage).not.toHaveBeenCalled();
  });

  it("returns 400 when productId exceeds 64 chars", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    const res = await callPost({
      productId: "a".repeat(65),
      imageUrl: "https://x.com/a.jpg",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when imageUrl exceeds 2048 chars", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    const res = await callPost({
      productId: "p",
      imageUrl: "https://x.com/" + "a".repeat(2050),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is malformed JSON", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    const res = await callPost(undefined, { rawBody: "not-json" });
    expect(res.status).toBe(400);
  });

  it("returns 502 + Sentry when Wix update fails (no invalidate)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpdateProductMainImage.mockResolvedValueOnce({
      ok: false,
      reason: "wix_error",
      status: 500,
    });
    const res = await callPost({
      productId: "p",
      imageUrl: "https://x.com/a.jpg",
    });
    expect(res.status).toBe(502);
    expect(mockLogWixFailure).toHaveBeenCalledWith(
      "admin/product-image",
      "products.updateProduct",
      expect.anything(),
    );
    expect(mockInvalidateImage).not.toHaveBeenCalled();
  });
});
