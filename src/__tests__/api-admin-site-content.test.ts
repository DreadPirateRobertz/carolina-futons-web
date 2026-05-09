// cfw-6qd.3: POST /api/admin/site-content — owner-only writes to the
// SiteContent Wix Data collection. Tests cover auth gate, body validation,
// Wix-error classification, and revalidate-tag emission.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetOwnerSession = vi.fn();
vi.mock("@/lib/auth/owner", () => ({
  getOwnerSession: (...args: unknown[]) => mockGetOwnerSession(...args),
}));

const mockUpsert = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  upsertCollectionItemByKey: (...args: unknown[]) => mockUpsert(...args),
}));

const mockLogWixFailure = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => mockLogWixFailure(...args),
}));

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

// site-content reader exports SITE_CONTENT_CACHE_TAG. Mock it so we don't
// pull the real reader (which imports server-only Wix data plumbing).
vi.mock("@/lib/cms/site-content", () => ({
  SITE_CONTENT_CACHE_TAG: "site-content",
}));

const OWNER_SESSION = {
  email: "owner@example.com",
  tokens: {
    accessToken: { value: "acc", expiresAt: 9_999_999_999 },
    refreshToken: { value: "ref", role: "member" },
  },
};

async function callPost(
  body: unknown,
  init: { rawBody?: string } = {},
) {
  const { POST } = await import("@/app/api/admin/site-content/route");
  const req = new Request("http://localhost/api/admin/site-content", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: init.rawBody ?? JSON.stringify(body),
  });
  return POST(req as Parameters<typeof POST>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/site-content (cfw-6qd.3)", () => {
  it("returns 401 when no owner session", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(null);

    const res = await callPost({ key: "footer.tagline", value: "Hi" });

    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/owner/i);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 200 + upserts + revalidates tag on owner success", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpsert.mockResolvedValueOnce({
      _id: "row-1",
      key: "footer.tagline",
      value: "New tagline",
    });

    const res = await callPost({
      key: "footer.tagline",
      value: "New tagline",
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; key: string; value: string };
    expect(data).toEqual({
      ok: true,
      key: "footer.tagline",
      value: "New tagline",
    });
    expect(mockUpsert).toHaveBeenCalledWith({
      collectionId: "SiteContent",
      keyField: "key",
      keyValue: "footer.tagline",
      fields: { value: "New tagline" },
      tokens: OWNER_SESSION.tokens,
    });
    expect(mockRevalidateTag).toHaveBeenCalledWith("site-content", "default");
  });

  it("trims whitespace around the key before persisting", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpsert.mockResolvedValueOnce({});

    await callPost({ key: "  hero.headline  ", value: "Built to last" });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ keyValue: "hero.headline" }),
    );
  });

  it("preserves whitespace inside the value (does not trim)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpsert.mockResolvedValueOnce({});

    await callPost({ key: "hero.headline", value: "  Built to last  " });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ fields: { value: "  Built to last  " } }),
    );
  });

  it("returns 200 + persists empty string (clearing a key)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpsert.mockResolvedValueOnce({});

    const res = await callPost({ key: "hero.subhead", value: "" });

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ fields: { value: "" } }),
    );
  });

  it("returns 400 when key is missing", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const res = await callPost({ value: "x" });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/key/i);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 when key is whitespace-only", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const res = await callPost({ key: "   ", value: "x" });

    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 when value is missing (not a string)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const res = await callPost({ key: "footer.tagline" });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/value/i);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 when value is not a string (number)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const res = await callPost({ key: "footer.tagline", value: 42 });

    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 when key exceeds 256 chars", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const res = await callPost({ key: "a".repeat(257), value: "x" });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/256/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 when value exceeds 4096 chars", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const res = await callPost({
      key: "footer.tagline",
      value: "a".repeat(4097),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/4096/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 when body is malformed JSON", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const res = await callPost(undefined, { rawBody: "not-json" });

    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 422 when Wix throws code=invalidEmail-style validation (no Sentry)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpsert.mockRejectedValueOnce(
      Object.assign(new Error("bad value"), { code: "invalidEmail" }),
    );

    const res = await callPost({ key: "footer.tagline", value: "x" });

    expect(res.status).toBe(422);
    expect(mockLogWixFailure).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 422 + Sentry skip when Wix throws response.status=400", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpsert.mockRejectedValueOnce({ response: { status: 400 } });

    const res = await callPost({ key: "footer.tagline", value: "x" });

    expect(res.status).toBe(422);
    expect(mockLogWixFailure).not.toHaveBeenCalled();
  });

  it("returns 502 + logs to Sentry when Wix throws upstream 5xx", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpsert.mockRejectedValueOnce({ response: { status: 502 } });

    const res = await callPost({ key: "footer.tagline", value: "x" });

    expect(res.status).toBe(502);
    expect(mockLogWixFailure).toHaveBeenCalledWith(
      "admin/site-content",
      "items.save",
      expect.anything(),
    );
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 502 + logs to Sentry when Wix throws plain network error", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpsert.mockRejectedValueOnce(new Error("network down"));

    const res = await callPost({ key: "footer.tagline", value: "x" });

    expect(res.status).toBe(502);
    expect(mockLogWixFailure).toHaveBeenCalled();
  });
});
