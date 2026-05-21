import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  // cfw-r5x: route now imports SITE_CONTENT_CACHE_TAG from site-content.ts,
  // which wraps its Wix fetch in unstable_cache. Vitest doesn't provide a
  // Next request/work-store context, so stub unstable_cache as identity.
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

const SECRET = "test-secret";

function sign(body: string): string {
  return "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
}

async function post(body: string, headers: Record<string, string> = {}) {
  const { POST } = await import("@/app/api/revalidate/route");
  const req = new Request("http://localhost/api/revalidate", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
  return POST(req as never);
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("WIX_WEBHOOK_SECRET", SECRET);
  });

  it("rejects requests without a signature", async () => {
    const res = await post(JSON.stringify({ collectionId: "Promotions" }));
    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid signature", async () => {
    const body = JSON.stringify({ collectionId: "Promotions" });
    const res = await post(body, { "x-wix-signature": "sha256=deadbeef" });
    expect(res.status).toBe(401);
  });

  it("revalidates derived tags when signature matches", async () => {
    const body = JSON.stringify({ collectionId: "Promotions", itemId: "abc123" });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; revalidated: string[] };
    expect(json.ok).toBe(true);
    expect(json.revalidated).toEqual(
      expect.arrayContaining(["wix:collection:Promotions", "wix:item:abc123"]),
    );

    const { revalidateTag } = await import("next/cache");
    expect(revalidateTag).toHaveBeenCalledWith("wix:collection:Promotions", "default");
    expect(revalidateTag).toHaveBeenCalledWith("wix:item:abc123", "default");
  });

  it("maps SiteContent collection to the site-content reader tag (cfw-r5x)", async () => {
    const body = JSON.stringify({ collectionId: "SiteContent" });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; revalidated: string[] };
    expect(json.ok).toBe(true);
    expect(json.revalidated).toEqual(
      expect.arrayContaining(["wix:collection:SiteContent", "site-content"]),
    );

    const { revalidateTag } = await import("next/cache");
    expect(revalidateTag).toHaveBeenCalledWith("site-content", "default");
    expect(revalidateTag).toHaveBeenCalledWith(
      "wix:collection:SiteContent",
      "default",
    );
  });

  it("does not add the site-content tag for unrelated collections", async () => {
    const body = JSON.stringify({ collectionId: "Promotions" });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { revalidated: string[] };
    expect(json.revalidated).not.toContain("site-content");
  });

  it("returns 500 when WIX_WEBHOOK_SECRET is unset", async () => {
    vi.stubEnv("WIX_WEBHOOK_SECRET", "");
    const res = await post("{}", { "x-wix-signature": "sha256=deadbeef" });
    expect(res.status).toBe(500);
  });

  it("accepts request with a fresh ts", async () => {
    const body = JSON.stringify({ collectionId: "products", ts: Date.now() });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
  });

  it("rejects request with ts more than 5 min in the past", async () => {
    const staleTs = Date.now() - 6 * 60 * 1000;
    const body = JSON.stringify({ collectionId: "products", ts: staleTs });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/timestamp/i);
  });

  it("rejects request with ts more than 5 min in the future", async () => {
    const futureTs = Date.now() + 6 * 60 * 1000;
    const body = JSON.stringify({ collectionId: "products", ts: futureTs });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(401);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/timestamp/i);
  });

  it("accepts legacy request without ts field", async () => {
    const body = JSON.stringify({ collectionId: "products" });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
  });

  it("rejects request with ts = null (non-finite, 400)", async () => {
    // JSON.stringify({ts: NaN}) → '{"ts":null}' — null ts is non-finite, should 400
    const body = JSON.stringify({ collectionId: "products", ts: null });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
  });
});

// ── F1: observability (correlationId + errorId + logging) ─────────────────

describe("POST /api/revalidate — observability (F1)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("WIX_WEBHOOK_SECRET", SECRET);
  });

  it("success response includes correlationId", async () => {
    const body = JSON.stringify({ collectionId: "products" });
    const res = await post(body, { "x-wix-signature": sign(body) });
    const json = (await res.json()) as { correlationId: string };
    expect(typeof json.correlationId).toBe("string");
    expect(json.correlationId.length).toBeGreaterThan(0);
  });

  it("passes through caller-supplied x-correlation-id", async () => {
    const body = JSON.stringify({ collectionId: "products" });
    const res = await post(body, {
      "x-wix-signature": sign(body),
      "x-correlation-id": "caller-trace-abc",
    });
    const json = (await res.json()) as { correlationId: string };
    expect(json.correlationId).toBe("caller-trace-abc");
  });

  it("error responses include errorId", async () => {
    const body = JSON.stringify({ collectionId: "products" });
    const res = await post(body, { "x-wix-signature": "sha256=deadbeef" });
    expect(res.status).toBe(401);
    const json = (await res.json()) as { errorId: string };
    expect(typeof json.errorId).toBe("string");
    expect(json.errorId.length).toBeGreaterThan(0);
  });

  it("errorId in error matches correlationId from header", async () => {
    const body = JSON.stringify({ collectionId: "products" });
    const res = await post(body, {
      "x-wix-signature": "sha256=deadbeef",
      "x-correlation-id": "trace-xyz",
    });
    const json = (await res.json()) as { errorId: string };
    expect(json.errorId).toBe("trace-xyz");
  });

  it("logs warn on signature rejection", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const body = JSON.stringify({ collectionId: "products" });
    await post(body, { "x-wix-signature": "sha256=deadbeef" });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[revalidate]"),
      expect.objectContaining({ correlationId: expect.any(String) }),
    );
    warnSpy.mockRestore();
  });

  it("logs error on missing WIX_WEBHOOK_SECRET", async () => {
    vi.stubEnv("WIX_WEBHOOK_SECRET", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await post("{}", { "x-wix-signature": "sha256=deadbeef" });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[revalidate]"),
      expect.objectContaining({ correlationId: expect.any(String) }),
    );
    errorSpy.mockRestore();
  });

  it("logs info on successful processing", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const body = JSON.stringify({ collectionId: "products" });
    await post(body, { "x-wix-signature": sign(body) });
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("[revalidate]"),
      expect.objectContaining({
        correlationId: expect.any(String),
        tags: expect.arrayContaining(["wix:collection:products"]),
      }),
    );
    infoSpy.mockRestore();
  });
});

// Pins the logError migration so an accidental revert to a bare
// console.error("[revalidate] …") (or to a string-interpolated prefix
// that bypasses the helper) fails loudly. Asserts on the console.error
// sink because logError forwards there in every env; the Sentry
// forwarder is prod-only and unit-tested in log.test.ts.
describe("POST /api/revalidate — logError migration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("WIX_WEBHOOK_SECRET", SECRET);
  });

  it("emits the bracketed '[revalidate] misconfigured — WIX_WEBHOOK_SECRET missing' prefix with { correlationId } as the second arg", async () => {
    vi.stubEnv("WIX_WEBHOOK_SECRET", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await post("{}", { "x-wix-signature": "sha256=deadbeef" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]![0]).toBe(
      "[revalidate] misconfigured — WIX_WEBHOOK_SECRET missing",
    );
    const ctx = errorSpy.mock.calls[0]![1] as { correlationId: unknown };
    expect(typeof ctx).toBe("object");
    expect(typeof ctx.correlationId).toBe("string");
    errorSpy.mockRestore();
  });

  it("threads the request's x-correlation-id header through to the logged context", async () => {
    vi.stubEnv("WIX_WEBHOOK_SECRET", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await post("{}", {
      "x-wix-signature": "sha256=deadbeef",
      "x-correlation-id": "trace-abc-123",
    });
    expect(errorSpy.mock.calls[0]![1]).toEqual({
      correlationId: "trace-abc-123",
    });
    errorSpy.mockRestore();
  });

  it("does NOT log on a valid happy-path request (no console.error noise on 200)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const body = JSON.stringify({ collectionId: "products" });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });
});

// ── cfw-ujp: coverage gaps filled by formal review ────────────────────────

describe("POST /api/revalidate — revalidateTag error handling (cfw-ujp)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("WIX_WEBHOOK_SECRET", SECRET);
  });

  it("returns 500 with failed list when revalidateTag throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { revalidateTag } = await import("next/cache");
    vi.mocked(revalidateTag).mockImplementation(() => {
      throw new Error("Next.js cache invariant violated");
    });
    const body = JSON.stringify({ collectionId: "SiteContent" });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(500);
    const json = (await res.json()) as { ok: boolean; errorId: string; failed: string[] };
    expect(json.ok).toBe(false);
    expect(typeof json.errorId).toBe("string");
    expect(Array.isArray(json.failed)).toBe(true);
    expect(json.failed.length).toBeGreaterThan(0);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[revalidate]"),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it("continues processing remaining tags if one throws (partial coverage)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { revalidateTag } = await import("next/cache");
    let callCount = 0;
    vi.mocked(revalidateTag).mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error("first tag fails");
    });
    // SiteContent expands to 2 tags: wix:collection:SiteContent + site-content
    const body = JSON.stringify({ collectionId: "SiteContent" });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(500);
    // Both tags were attempted despite the first one throwing
    expect(revalidateTag).toHaveBeenCalledWith("wix:collection:SiteContent", "default");
    expect(revalidateTag).toHaveBeenCalledWith("site-content", "default");
    vi.spyOn(console, "error").mockRestore();
  });
});

describe("POST /api/revalidate — body size guard (cfw-ujp)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("WIX_WEBHOOK_SECRET", SECRET);
  });

  it("returns 413 when Content-Length exceeds the 64 KiB limit", async () => {
    const body = JSON.stringify({ collectionId: "products" });
    const { POST } = await import("@/app/api/revalidate/route");
    const req = new Request("http://localhost/api/revalidate", {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        "x-wix-signature": sign(body),
        "content-length": String(64 * 1024 + 1),
      },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(413);
  });
});

describe("POST /api/revalidate — signature and body edge cases (cfw-ujp)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("WIX_WEBHOOK_SECRET", SECRET);
  });

  it("accepts a raw hex signature without the sha256= prefix", async () => {
    const { createHmac: hmac } = await import("node:crypto");
    const body = JSON.stringify({ collectionId: "products" });
    const rawHex = hmac("sha256", SECRET).update(body).digest("hex");
    const res = await post(body, { "x-wix-signature": rawHex });
    expect(res.status).toBe(200);
  });

  it("accepts empty body with valid HMAC (Wix registration handshake)", async () => {
    // sign("") works because our sign() helper signs any string
    const emptyBody = "";
    const { POST } = await import("@/app/api/revalidate/route");
    const req = new Request("http://localhost/api/revalidate", {
      method: "POST",
      body: emptyBody,
      headers: { "content-type": "application/json", "x-wix-signature": sign(emptyBody) },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; revalidated: string[] };
    expect(json.ok).toBe(true);
    expect(json.revalidated).toEqual([]);
  });

  it("accepts non-object JSON body as empty (no collectionId extracted)", async () => {
    const body = JSON.stringify([1, 2, 3]);
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; revalidated: string[] };
    expect(json.ok).toBe(true);
    expect(json.revalidated).toEqual([]);
  });

  it("revalidates caller-supplied tags array when no collectionId/itemId", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const body = JSON.stringify({ tags: ["my-tag", "other-tag"] });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; revalidated: string[] };
    expect(json.ok).toBe(true);
    expect(json.revalidated).toEqual(expect.arrayContaining(["my-tag", "other-tag"]));
    const { revalidateTag } = await import("next/cache");
    expect(revalidateTag).toHaveBeenCalledWith("my-tag", "default");
    expect(revalidateTag).toHaveBeenCalledWith("other-tag", "default");
    infoSpy.mockRestore();
  });
});

describe("POST /api/revalidate — ts replay boundary (cfw-ujp)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("WIX_WEBHOOK_SECRET", SECRET);
  });

  it("rejects ts=0 (epoch 1970 — age far exceeds window)", async () => {
    const body = JSON.stringify({ collectionId: "products", ts: 0 });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/timestamp/i);
  });

  it("accepts ts at the inner boundary (500ms before cutoff)", async () => {
    const ts = Date.now() - (5 * 60 * 1000 - 500);
    const body = JSON.stringify({ collectionId: "products", ts });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
  });

  it("rejects ts at the outer boundary (500ms after cutoff)", async () => {
    const ts = Date.now() - (5 * 60 * 1000 + 500);
    const body = JSON.stringify({ collectionId: "products", ts });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(401);
  });
});
