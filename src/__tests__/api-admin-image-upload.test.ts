// cfw-6qd.8: POST /api/admin/image-upload — owner-only Wix Media Manager
// upload via direct REST. Tests cover auth, MIME/size guards, key validation,
// the two-step Wix REST flow (generate-upload-url → PUT), SiteContent
// upsert, audit append, and revalidate-tag emission.

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

const mockLogWixFailure = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => mockLogWixFailure(...args),
}));

// cfw-41ty: WIX_API_KEY-missing + lookup-non-fatal catches now route
// through logError → Sentry. Mock @sentry/nextjs so the runner
// doesn't ship events AND the new logError-integration tests below
// can assert (scope, op) tags.
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock("@/lib/cms/site-content", () => ({
  SITE_CONTENT_CACHE_TAG: "site-content",
}));

const mockRecordOwnerEdit = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/admin/audit-log", () => ({
  recordOwnerEdit: (...args: unknown[]) => mockRecordOwnerEdit(...args),
}));

// Don't mock owner-edit-validation — real implementation is small + pure
// and shared with /api/admin/site-content. Mocking here would just
// duplicate the regex.

const OWNER_SESSION = {
  email: "owner@example.com",
  tokens: {
    accessToken: { value: "owner-bearer-token", expiresAt: 9_999_999_999 },
    refreshToken: { value: "ref", role: "member" },
  },
};

const GENERATE_URL_ENDPOINT =
  "https://www.wixapis.com/site-media/v1/files/generate-upload-url";

function makeFile(
  bytes: Uint8Array,
  type = "image/jpeg",
  name = "photo.jpg",
): File {
  const blob = new Blob([bytes.buffer.slice(0) as ArrayBuffer], { type });
  return new File([blob], name, { type });
}

// vitest's environment truncates File bodies during the multipart Request
// → formData() round-trip (a 5 MiB file comes back as a few bytes), which
// makes the size-cap branch impossible to exercise via the standard
// `new Request({ body: formData })` pattern. We sidestep by handing the
// route a fake NextRequest whose `formData()` returns the FormData
// directly — the route only ever calls `req.formData()`, so this is a
// faithful stand-in.
async function callPost(formData: FormData) {
  const { POST } = await import("@/app/api/admin/image-upload/route");
  const req = {
    formData: async () => formData,
  } as Parameters<typeof POST>[0];
  return POST(req);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.stubEnv("WIX_API_KEY", "test-wix-api-key");
  // env() also requires these even though this route only consumes
  // WIX_API_KEY — env.ts trips on any required var being absent the
  // moment any helper from `@/lib/env` resolves a value.
  vi.stubEnv("WIX_BACKEND_KEY", "test-backend-key");
  vi.stubEnv("WIX_CLIENT_ID_HEADLESS", "test-client-id");
  vi.stubEnv("WIX_WEBHOOK_SECRET", "test-webhook-secret");
});

describe("POST /api/admin/image-upload (cfw-6qd.8)", () => {
  it("returns 503 when WIX_API_KEY is unset (deploy gate)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    vi.stubEnv("WIX_API_KEY", "");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff]), "image/jpeg", "x.jpg"));
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(503);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/not configured/i);

    // cfw-41ty: WIX_API_KEY-missing branch now routes through
    // logError → Sentry. The env() helper throws, so the catch
    // receives a real Error to pass through.
    const matching = sentryCaptureException.mock.calls.find(
      ([, opts]) =>
        (opts as { tags?: { op?: string } }).tags?.op === "WIX_API_KEY not set",
    );
    expect(matching).toBeDefined();
    const [reportedErr, opts] = matching!;
    expect(reportedErr).toBeInstanceOf(Error);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "admin/image-upload",
      op: "WIX_API_KEY not set",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryFlush).toHaveBeenCalledWith(2000);
    consoleSpy.mockRestore();
  });

  it("returns 401 when no owner session", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(null);

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff, 0xd8])));
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(401);
    expect(global.fetch).not.toBe(undefined); // ensure default fetch unchanged
  });

  it("returns 400 when 'file' field is missing", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const fd = new FormData();
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/file/i);
  });

  it("returns 415 for an unsupported MIME (e.g. application/pdf)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const fd = new FormData();
    fd.set(
      "file",
      makeFile(new Uint8Array([0]), "application/pdf", "doc.pdf"),
    );
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(415);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/mime|application\/pdf/i);
  });

  it("returns 413 when the file exceeds the 5 MiB cap", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    // 5 MiB + 1 byte
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    const fd = new FormData();
    fd.set("file", makeFile(oversized, "image/png", "huge.png"));
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(413);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/5/);
  });

  it("returns 400 when 'key' is missing", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff])));

    const res = await callPost(fd);

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/key/i);
  });

  it("returns 400 when 'key' fails the SiteContent pattern (camelCase)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff])));
    fd.set("key", "Hero.Image");

    const res = await callPost(fd);

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/dotted-path|lowercase/i);
  });

  it("uploads, upserts SiteContent, audits, and revalidates on success", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce({ value: "old-cdn-url" });
    mockUpsert.mockResolvedValueOnce({});

    const mockFetch = vi.fn(async (url: string | URL | Request) => {
      if (typeof url === "string" && url === GENERATE_URL_ENDPOINT) {
        return new Response(
          JSON.stringify({ uploadUrl: "https://upload.wixmp.com/x" }),
          { status: 200 },
        );
      }
      // upload PUT
      return new Response(
        JSON.stringify({
          file: { id: "wix-media-123", url: "https://static.wixstatic.com/photo.jpg" },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", mockFetch);

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg", "photo.jpg"));
    fd.set("key", "hero.image");
    fd.set("ifMatch", "old-cdn-url");

    const res = await callPost(fd);

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      ok: boolean;
      wixMediaId: string;
      resolvedUrl: string;
      updatedAt: string;
    };
    expect(data.ok).toBe(true);
    expect(data.wixMediaId).toBe("wix-media-123");
    expect(data.resolvedUrl).toBe("https://static.wixstatic.com/photo.jpg");
    expect(data.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);

    // generate-upload-url called with the Wix API key (no "Bearer" prefix
    // — that's reserved for OAuth tokens) + json body
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      GENERATE_URL_ENDPOINT,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "test-wix-api-key",
          "Content-Type": "application/json",
        }),
      }),
    );
    // PUT to the signed upload URL
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://upload.wixmp.com/x",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ "Content-Type": "image/jpeg" }),
      }),
    );

    // SiteContent upsert with the new URL
    expect(mockUpsert).toHaveBeenCalledWith({
      collectionId: "SiteContent",
      keyField: "key",
      keyValue: "hero.image",
      fields: { value: "https://static.wixstatic.com/photo.jpg" },
      tokens: OWNER_SESSION.tokens,
    });

    // Audit row uses the looked-up before value
    expect(mockRecordOwnerEdit).toHaveBeenCalledWith(
      {
        actorEmail: "owner@example.com",
        action: "upload",
        target: "hero.image",
        before: "old-cdn-url",
        after: "https://static.wixstatic.com/photo.jpg",
      },
      OWNER_SESSION.tokens,
    );

    // Cache busted
    expect(mockRevalidateTag).toHaveBeenCalledWith("site-content", "default");
  });

  it("falls back to ifMatch as audit 'before' when SiteContent lookup throws", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockRejectedValueOnce(new Error("wix outage"));
    mockUpsert.mockResolvedValueOnce({});
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ uploadUrl: "https://up.example/x" }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ file: { id: "m1", url: "https://cdn/y.jpg" } }),
            { status: 200 },
          ),
        ),
    );

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff]), "image/png", "y.png"));
    fd.set("key", "hero.image");
    fd.set("ifMatch", "client-saw-url");

    const res = await callPost(fd);

    expect(res.status).toBe(200);
    expect(mockRecordOwnerEdit).toHaveBeenCalledWith(
      expect.objectContaining({ before: "client-saw-url" }),
      OWNER_SESSION.tokens,
    );

    // cfw-41ty: lookup-non-fatal branch now routes through logError →
    // Sentry. Filter for the op to avoid mistaking another logError
    // emit (none expected here, but defensive).
    const matching = sentryCaptureException.mock.calls.find(
      ([, opts]) =>
        (opts as { tags?: { op?: string } }).tags?.op ===
        "lookupCollectionItemByKey failed (non-fatal)",
    );
    expect(matching).toBeDefined();
    const [reportedErr, opts] = matching!;
    expect((reportedErr as Error).message).toBe("wix outage");
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "admin/image-upload",
      op: "lookupCollectionItemByKey failed (non-fatal)",
    });
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      key: "hero.image",
    });
    consoleSpy.mockRestore();
  });

  it("returns 502 when generate-upload-url returns non-2xx", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "forbidden" }), { status: 403 }),
      ),
    );

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff]), "image/jpeg", "x.jpg"));
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(502);
    expect(mockLogWixFailure).toHaveBeenCalledWith(
      "admin/image-upload",
      "generate-upload-url",
      expect.anything(),
    );
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 502 when generate-upload-url returns 200 but no uploadUrl", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 }),
      ),
    );

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff]), "image/jpeg", "x.jpg"));
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(502);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 502 when the upload PUT returns non-2xx", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ uploadUrl: "https://up.example/x" }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response("upstream broken", { status: 500 }),
        ),
    );

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff]), "image/jpeg", "x.jpg"));
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(502);
    expect(mockLogWixFailure).toHaveBeenCalledWith(
      "admin/image-upload",
      "upload PUT",
      expect.anything(),
    );
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 502 when SiteContent upsert throws after a successful upload", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce(null);
    mockUpsert.mockRejectedValueOnce(new Error("wix data outage"));

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ uploadUrl: "https://up.example/x" }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ file: { id: "m1", url: "https://cdn/y.jpg" } }),
            { status: 200 },
          ),
        ),
    );

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff]), "image/jpeg", "x.jpg"));
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(502);
    expect(mockLogWixFailure).toHaveBeenCalledWith(
      "admin/image-upload",
      "upsertCollectionItemByKey",
      expect.anything(),
    );
    expect(mockRecordOwnerEdit).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("does NOT fail the request when audit append fails (best-effort)", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce(null);
    mockUpsert.mockResolvedValueOnce({});
    mockRecordOwnerEdit.mockResolvedValueOnce({
      ok: false,
      reason: "wix_outage",
      error: "audit collection unreachable",
    });

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ uploadUrl: "https://up.example/x" }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ file: { id: "m1", url: "https://cdn/y.jpg" } }),
            { status: 200 },
          ),
        ),
    );

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff]), "image/jpeg", "x.jpg"));
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(200);
    expect(mockRecordOwnerEdit).toHaveBeenCalledTimes(1);
    expect(mockRevalidateTag).toHaveBeenCalledWith("site-content", "default");
  });

  it("treats a flat (non-nested) Wix file descriptor as success", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(OWNER_SESSION);
    mockLookup.mockResolvedValueOnce(null);
    mockUpsert.mockResolvedValueOnce({});

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ uploadUrl: "https://up.example/x" }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          // No `file` wrapper — descriptor at top level
          new Response(
            JSON.stringify({ id: "m-flat", url: "https://cdn/flat.jpg" }),
            { status: 200 },
          ),
        ),
    );

    const fd = new FormData();
    fd.set("file", makeFile(new Uint8Array([0xff]), "image/webp", "x.webp"));
    fd.set("key", "hero.image");

    const res = await callPost(fd);

    expect(res.status).toBe(200);
    const data = (await res.json()) as { resolvedUrl: string };
    expect(data.resolvedUrl).toBe("https://cdn/flat.jpg");
  });
});
