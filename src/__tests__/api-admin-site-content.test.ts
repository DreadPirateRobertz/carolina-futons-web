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

  // ── cfw-6qd.12: key naming convention enforcement ────────────────────
  // The SiteContent collection convention is lowercase dotted-path with
  // hyphenated segments (≥ 2 segments). Without app-level validation, a
  // typo'd key would silently land an orphan row that no reader can see.

  it.each([
    ["camelCase segment", "footer.showroomHours"],
    ["capital initial", "Footer.tagline"],
    ["single segment (no dot)", "footer"],
    ["empty inner segment", "footer..tagline"],
    ["leading dot", ".footer.tagline"],
    ["trailing dot", "footer.tagline."],
    ["space in key", "footer tagline"],
    ["special char", "footer.tagline!"],
    ["non-ASCII", "footer.taglinę"],
  ])("returns 400 for malformed key: %s (cfw-6qd.12)", async (_label, key) => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const res = await callPost({ key, value: "ok" });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/lowercase|dotted|key/i);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("accepts the seed-convention key shapes (cfw-6qd.12)", async () => {
    const validKeys = [
      "footer.tagline",
      "footer.showroom-hours.label",
      "announcement.rotation.0.cta-href",
      "visit.hours.sun-tue",
    ];
    for (const key of validKeys) {
      mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
      mockUpsert.mockResolvedValueOnce({});
      const res = await callPost({ key, value: "ok" });
      expect(res.status).toBe(200);
    }
    expect(mockUpsert).toHaveBeenCalledTimes(validKeys.length);
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

  // cfw-6qd.12: dangerous URL schemes are rejected at the write boundary —
  // some keys (e.g. `announcement.rotation.3.cta-href`) end up in
  // `<a href={value}>`, where React doesn't pre-block `javascript:` hrefs
  // before render-time.
  it.each([
    ["javascript:alert(1)"],
    ["JavaScript:alert(1)"],
    ["vbscript:msgbox(1)"],
    ["data:text/html,<script>alert(1)</script>"],
  ])("returns 400 + rejects dangerous URL scheme value: %s (cfw-6qd.12)", async (value) => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const res = await callPost({ key: "announcement.rotation.3.cta-href", value });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/javascript|vbscript|data/i);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("strips ASCII control bytes from value before persisting (cfw-6qd.12)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockUpsert.mockResolvedValueOnce({});

    const res = await callPost({
      key: "footer.tagline",
      value: "Quality\x00 futon\x07 since\x1B 1991",
    });

    expect(res.status).toBe(200);
    // The persisted value has the control bytes removed; whitespace
    // (\t \n \r) is preserved by sanitizeOwnerEditValue.
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: { value: "Quality futon since 1991" },
      }),
    );
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

  // cfw-qyy: HTML allowlist sanitisation runs between body validation and
  // the upsert. These tests pin the contract at the route layer so a future
  // refactor that bypasses sanitizeOwnerHtml() fails CI loudly.
  describe("cfw-qyy — html sanitisation pipeline", () => {
    it("strips <script> tag + content before persisting", async () => {
      mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
      mockUpsert.mockResolvedValueOnce({});

      const res = await callPost({
        key: "footer.tagline",
        value: 'Hello <script>alert("xss")</script>world',
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { value: string };
      expect(data.value).toBe("Hello world");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ fields: { value: "Hello world" } }),
      );
    });

    it("strips on*= event handlers from <a> while keeping the link", async () => {
      mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
      mockUpsert.mockResolvedValueOnce({});

      await callPost({
        key: "footer.contact",
        value: '<a href="https://example.com" onclick="evil()">site</a>',
      });

      const persisted = (mockUpsert.mock.calls[0]?.[0] as { fields: { value: string } })
        .fields.value;
      expect(persisted).not.toMatch(/onclick/i);
      expect(persisted).toContain("https://example.com");
    });

    it("preserves the simple-emphasis allowlist round-trip", async () => {
      mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
      mockUpsert.mockResolvedValueOnce({});

      await callPost({
        key: "hero.headline",
        value: "<strong>Sale</strong> — <em>limited time</em>",
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: { value: "<strong>Sale</strong> — <em>limited time</em>" },
        }),
      );
    });
  });
});
