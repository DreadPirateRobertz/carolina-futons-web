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
const mockLookup = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  upsertCollectionItemByKey: (...args: unknown[]) => mockUpsert(...args),
  lookupCollectionItemByKey: (...args: unknown[]) => mockLookup(...args),
}));

// cfw-6qd.11: audit-log writer is a best-effort side-effect of the route.
// Mock its top-level export so the route's call doesn't try to talk to a
// real Wix client. Tests assert on the call shape below.
const mockRecordOwnerEdit = vi.fn();
vi.mock("@/lib/admin/audit-log", () => ({
  recordOwnerEdit: (...args: unknown[]) => mockRecordOwnerEdit(...args),
  AUDIT_LOG_COLLECTION_ID: "OwnerAuditLog",
}));

// cfw-jgl: writeSiteContentHistory is a sibling best-effort writer for the
// upcoming ↶ undo UI. Mock it so the route's call goes nowhere and tests
// can pin the call shape below.
const mockWriteSiteContentHistory = vi.fn();
vi.mock("@/lib/cms/site-content-history", () => ({
  writeSiteContentHistory: (...args: unknown[]) =>
    mockWriteSiteContentHistory(...args),
}));

const mockLogWixFailure = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => mockLogWixFailure(...args),
}));

// cfw-sej: route now delegates cache invalidation to @/lib/admin/revalidate.
// Mock the module here so (a) debounce state doesn't bleed across tests,
// and (b) we can assert that the route calls the right helper.
const mockInvalidateSiteContent = vi.fn();
vi.mock("@/lib/admin/revalidate", () => ({
  invalidateSiteContent: (...args: unknown[]) => mockInvalidateSiteContent(...args),
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
  // Default: lookup returns no existing row (so before="" in audit) and
  // both best-effort writers succeed. Individual tests override.
  mockLookup.mockResolvedValue(null);
  mockRecordOwnerEdit.mockResolvedValue({ ok: true });
  mockWriteSiteContentHistory.mockResolvedValue({ ok: true, id: "hist-1" });
});

describe("POST /api/admin/site-content (cfw-6qd.3)", () => {
  it("returns 401 when no owner session", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(null);

    const res = await callPost({ key: "footer.tagline", value: "Hi" });

    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/owner/i);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockInvalidateSiteContent).not.toHaveBeenCalled();
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
    expect(mockInvalidateSiteContent).toHaveBeenCalledTimes(1);
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
    expect(mockInvalidateSiteContent).not.toHaveBeenCalled();
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
    expect(mockInvalidateSiteContent).not.toHaveBeenCalled();
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
    expect(mockInvalidateSiteContent).not.toHaveBeenCalled();
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
    expect(mockInvalidateSiteContent).not.toHaveBeenCalled();
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

describe("POST /api/admin/site-content — cfw-6qd.11 audit log", () => {
  it("appends an audit row with action='edit' on a successful save", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old tagline" });
    mockUpsert.mockResolvedValueOnce({});

    const res = await callPost({ key: "footer.tagline", value: "new tagline" });

    expect(res.status).toBe(200);
    expect(mockRecordOwnerEdit).toHaveBeenCalledTimes(1);
    expect(mockRecordOwnerEdit).toHaveBeenCalledWith(
      {
        actorEmail: OWNER_SESSION.email,
        action: "edit",
        target: "footer.tagline",
        before: "old tagline",
        after: "new tagline",
      },
      OWNER_SESSION.tokens,
    );
  });

  it("records before='' when the row didn't exist (insert path)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce(null);
    mockUpsert.mockResolvedValueOnce({});

    await callPost({ key: "hero.subhead", value: "Brand new copy" });

    expect(mockRecordOwnerEdit).toHaveBeenCalledWith(
      expect.objectContaining({ before: "", after: "Brand new copy" }),
      OWNER_SESSION.tokens,
    );
  });

  it("records before='' when the existing row's value is non-string (defensive)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: { weird: "shape" } });
    mockUpsert.mockResolvedValueOnce({});

    await callPost({ key: "footer.tagline", value: "v" });

    expect(mockRecordOwnerEdit).toHaveBeenCalledWith(
      expect.objectContaining({ before: "" }),
      OWNER_SESSION.tokens,
    );
  });

  it("does NOT call recordOwnerEdit when the upsert itself failed", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old" });
    mockUpsert.mockRejectedValueOnce(new Error("permission denied"));

    const res = await callPost({ key: "footer.tagline", value: "new" });

    expect(res.status).toBe(502);
    expect(mockRecordOwnerEdit).not.toHaveBeenCalled();
  });

  it("does NOT call recordOwnerEdit when no owner session", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(null);

    await callPost({ key: "footer.tagline", value: "v" });

    expect(mockRecordOwnerEdit).not.toHaveBeenCalled();
  });

  it("still returns 200 + revalidates when audit-log write fails (best-effort contract)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old" });
    mockUpsert.mockResolvedValueOnce({});
    mockRecordOwnerEdit.mockResolvedValueOnce({
      ok: false,
      reason: "wix_outage",
      error: "audit collection down",
    });

    const res = await callPost({ key: "footer.tagline", value: "new" });

    expect(res.status).toBe(200);
    expect(mockInvalidateSiteContent).toHaveBeenCalledTimes(1);
  });

  it("survives a lookup failure with before='' (audit still records the after-value)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockRejectedValueOnce(new Error("query failed"));
    mockUpsert.mockResolvedValueOnce({});

    const res = await callPost({ key: "footer.tagline", value: "new" });

    expect(res.status).toBe(200);
    expect(mockRecordOwnerEdit).toHaveBeenCalledWith(
      expect.objectContaining({ before: "", after: "new" }),
      OWNER_SESSION.tokens,
    );
    // Lookup failure routes through logWixFailure with a distinct phase tag.
    expect(mockLogWixFailure).toHaveBeenCalledWith(
      "admin/site-content",
      "items.query (before)",
      expect.anything(),
    );
  });
});

describe("POST /api/admin/site-content — cfw-jgl history wire-up", () => {
  it("calls writeSiteContentHistory after a successful upsert with key/before/after/actorEmail/tokens", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old tagline" });
    mockUpsert.mockResolvedValueOnce({});

    const res = await callPost({
      key: "footer.tagline",
      value: "new tagline",
    });

    expect(res.status).toBe(200);
    expect(mockWriteSiteContentHistory).toHaveBeenCalledTimes(1);
    expect(mockWriteSiteContentHistory).toHaveBeenCalledWith({
      tokens: OWNER_SESSION.tokens,
      key: "footer.tagline",
      before: "old tagline",
      after: "new tagline",
      actorEmail: OWNER_SESSION.email,
    });
  });

  it("does NOT call writeSiteContentHistory when the upsert itself fails", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old" });
    mockUpsert.mockRejectedValueOnce(new Error("permission denied"));

    const res = await callPost({ key: "footer.tagline", value: "new" });

    expect(res.status).toBe(502);
    expect(mockWriteSiteContentHistory).not.toHaveBeenCalled();
  });

  it("does NOT call writeSiteContentHistory when no owner session", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(null);

    await callPost({ key: "footer.tagline", value: "v" });

    expect(mockWriteSiteContentHistory).not.toHaveBeenCalled();
  });

  it("still returns 200 + revalidates when writeSiteContentHistory itself fails (best-effort contract)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old" });
    mockUpsert.mockResolvedValueOnce({});
    mockWriteSiteContentHistory.mockResolvedValueOnce({
      ok: false,
      reason: "wix_error",
      status: 404,
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callPost({ key: "footer.tagline", value: "new" });

    expect(res.status).toBe(200);
    expect(mockInvalidateSiteContent).toHaveBeenCalledTimes(1);
    // The route logs failed history writes for diagnostics — collection
    // unprovisioned (404) is the most common production case.
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[admin/site-content] history write failed for footer.tagline",
      ),
    );
    consoleSpy.mockRestore();
  });

  it("history.before='' when no previous row existed (insert path)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce(null);
    mockUpsert.mockResolvedValueOnce({});

    await callPost({ key: "hero.headline", value: "fresh copy" });

    expect(mockWriteSiteContentHistory).toHaveBeenCalledWith(
      expect.objectContaining({ before: "", after: "fresh copy" }),
    );
  });

  it("history.after carries the SANITISED value (matches what was persisted)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "" });
    mockUpsert.mockResolvedValueOnce({});

    // Anything that looks like a script tag will be stripped by
    // sanitizeOwnerHtml so the persisted value differs from the raw input.
    await callPost({
      key: "footer.tagline",
      value: "Hello <script>alert(1)</script>world",
    });

    const args = mockWriteSiteContentHistory.mock.calls[0]![0] as {
      after: string;
    };
    // Same value is persisted via upsert — the test isn't asserting the
    // exact sanitiser output, just that history.after === upsert.fields.value.
    const upsertCall = mockUpsert.mock.calls[0]![0] as {
      fields: { value: string };
    };
    expect(args.after).toBe(upsertCall.fields.value);
  });
});

// Pins the logError migration of the history-write-failure diagnostic.
// Asserts on the console.error sink because logError forwards there in
// every env; the Sentry forwarder is prod-only and unit-tested in
// log.test.ts.
describe("POST /api/admin/site-content — logError migration", () => {
  it("emits the bracketed '[admin/site-content] history write failed …' prefix with status code when writeSiteContentHistory returns ok=false", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old" });
    mockUpsert.mockResolvedValueOnce({});
    mockWriteSiteContentHistory.mockResolvedValueOnce({
      ok: false,
      reason: "wix_error",
      status: 404,
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callPost({ key: "footer.tagline", value: "new" });

    expect(res.status).toBe(200);
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(errSpy.mock.calls[0]![0]).toBe(
      "[admin/site-content] history write failed for footer.tagline: wix_error (404)",
    );
    // logError with no err is called single-arg — guards against an
    // accidental trailing undefined slot.
    expect(errSpy.mock.calls[0]!.length).toBe(1);
    errSpy.mockRestore();
  });

  it("omits the trailing '(status)' segment when history returns ok=false without a status code", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old" });
    mockUpsert.mockResolvedValueOnce({});
    mockWriteSiteContentHistory.mockResolvedValueOnce({
      ok: false,
      reason: "wix_error",
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await callPost({ key: "footer.tagline", value: "new" });

    expect(errSpy.mock.calls[0]![0]).toBe(
      "[admin/site-content] history write failed for footer.tagline: wix_error",
    );
    errSpy.mockRestore();
  });

  it("does NOT log on the happy path (history write succeeds)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old" });
    mockUpsert.mockResolvedValueOnce({});
    mockWriteSiteContentHistory.mockResolvedValueOnce({ ok: true });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callPost({ key: "footer.tagline", value: "new" });
    expect(res.status).toBe(200);
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
