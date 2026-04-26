import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// cf-newsletter-velo-wire: upsertSubscriber POSTs to the Wix Velo HTTP
// function instead of writing to disk (Vercel serverless FS is read-only).

const VELO_BASE = "https://www.carolinafutons.com";

beforeEach(() => {
  process.env.WIX_VELO_SITE_URL = VELO_BASE;
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  delete process.env.WIX_VELO_SITE_URL;
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function freshStore() {
  vi.resetModules();
  return import("@/lib/newsletter/newsletter-store");
}

function mockFetch(body: object, status = 200) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("newsletter-store.upsertSubscriber — Velo HTTP wire", () => {
  it("POSTs to /_functions/mailingListSignups with the subscriber email", async () => {
    mockFetch({ success: true, discountCode: null });
    const { upsertSubscriber } = await freshStore();
    await upsertSubscriber("hello@example.com");
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toBe(`${VELO_BASE}/_functions/mailingListSignups`);
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.email).toBe("hello@example.com");
    expect(body.source).toBe("footer_newsletter");
  });

  it("returns { created: true } on HTTP 200 success", async () => {
    mockFetch({ success: true, discountCode: null });
    const { upsertSubscriber } = await freshStore();
    const result = await upsertSubscriber("new@example.com");
    expect(result.created).toBe(true);
  });

  it("throws when Velo returns HTTP 500", async () => {
    mockFetch({ success: false, error: "Internal server error" }, 500);
    const { upsertSubscriber } = await freshStore();
    await expect(upsertSubscriber("bad@example.com")).rejects.toThrow();
  });

  it("throws when Velo returns HTTP 429 (rate limited)", async () => {
    mockFetch({ success: false, error: "Too many requests" }, 429);
    const { upsertSubscriber } = await freshStore();
    await expect(upsertSubscriber("rate@example.com")).rejects.toThrow();
  });

  it("throws when Velo returns HTTP 400 (validation error)", async () => {
    mockFetch({ success: false, error: "Invalid email" }, 400);
    const { upsertSubscriber } = await freshStore();
    await expect(upsertSubscriber("notanemail")).rejects.toThrow();
  });

  it("throws when WIX_VELO_SITE_URL is not set", async () => {
    delete process.env.WIX_VELO_SITE_URL;
    const { upsertSubscriber } = await freshStore();
    await expect(upsertSubscriber("x@example.com")).rejects.toThrow(/WIX_VELO_SITE_URL/);
  });
});
