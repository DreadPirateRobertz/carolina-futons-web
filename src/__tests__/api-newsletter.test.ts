import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// cfw-98s: behavioral tests for /api/newsletter. Mirrors the api-delivery-zone
// pattern — we exercise the route handler directly, mocking the store helper
// to simulate Velo responses. The validation rules are owned by
// newsletter-schema.ts (covered by newsletter-actions.test.ts), so we only
// pin the wire contract here.

vi.mock("@/lib/newsletter/newsletter-store", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/newsletter/newsletter-store")
  >("@/lib/newsletter/newsletter-store");
  return {
    ...actual,
    upsertSubscriber: vi.fn(),
  };
});

// cfw-1hw7: timeout + store-fail paths route through logError. Hoisted
// so the route's import resolves to the stub before the test imports.
const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import {
  upsertSubscriber,
  NewsletterRateLimitError,
} from "@/lib/newsletter/newsletter-store";
import { POST } from "@/app/api/newsletter/route";

const mockUpsert = upsertSubscriber as unknown as ReturnType<typeof vi.fn>;

function makePost(body: unknown, opts: { rawBody?: string } = {}) {
  return new Request("https://carolinafutons.com/api/newsletter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

const ORIGINAL_VELO = process.env.WIX_VELO_SITE_URL;

beforeEach(() => {
  mockUpsert.mockReset();
  mockLogError.mockReset();
  process.env.WIX_VELO_SITE_URL = "https://www.carolinafutons.com";
});

afterEach(() => {
  if (ORIGINAL_VELO === undefined) delete process.env.WIX_VELO_SITE_URL;
  else process.env.WIX_VELO_SITE_URL = ORIGINAL_VELO;
});

describe("POST /api/newsletter — happy path", () => {
  it("returns ok:true with alreadySubscribed=false on a brand new subscriber", async () => {
    mockUpsert.mockResolvedValue({ created: true });

    const res = await POST(makePost({ email: "ada@example.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadySubscribed: false });
    expect(mockUpsert).toHaveBeenCalledWith("ada@example.com");
  });

  it("returns ok:true with alreadySubscribed=true when Velo reports duplicate", async () => {
    mockUpsert.mockResolvedValue({ created: false });

    const res = await POST(makePost({ email: "Ada@Example.COM" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadySubscribed: true });
    // schema lowercases on coerce
    expect(mockUpsert).toHaveBeenCalledWith("ada@example.com");
  });
});

describe("POST /api/newsletter — validation", () => {
  it("returns 400 invalid-json for non-JSON bodies", async () => {
    const res = await POST(makePost({}, { rawBody: "not-json" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid-json" });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 invalid-email for missing email", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid-email" });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 invalid-email for malformed input", async () => {
    const res = await POST(makePost({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid-email" });
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("POST /api/newsletter — backend errors", () => {
  it("returns 429 rate-limited when the store throws NewsletterRateLimitError", async () => {
    mockUpsert.mockRejectedValue(new NewsletterRateLimitError());

    const res = await POST(makePost({ email: "ada@example.com" }));

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: "rate-limited" });
  });

  it("returns 502 velo-unreachable + ships logError op=veloTimeout on TimeoutError (cfw-1hw7)", async () => {
    // cfw-coc PII guard: use a deterministic hash by stubbing the salt
    process.env.LOG_PII_SALT = "test-salt-cfw-1hw7";
    const timeoutErr = new Error("timed out");
    timeoutErr.name = "TimeoutError";
    mockUpsert.mockRejectedValue(timeoutErr);

    const res = await POST(makePost({ email: "ada@example.com" }));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "velo-unreachable" });
    expect(mockLogError).toHaveBeenCalledWith(
      "api/newsletter",
      "veloTimeout",
      expect.any(Error),
      expect.objectContaining({
        hashedEmail: expect.stringMatching(/^[0-9a-f]{12}$/),
      }),
    );
  });

  it("returns 502 velo-error + ships logError op=upsertSubscriber on other store failures (cfw-1hw7)", async () => {
    process.env.LOG_PII_SALT = "test-salt-cfw-1hw7";
    mockUpsert.mockRejectedValue(new Error("boom"));

    const res = await POST(makePost({ email: "ada@example.com" }));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "velo-error" });
    expect(mockLogError).toHaveBeenCalledWith(
      "api/newsletter",
      "upsertSubscriber",
      expect.any(Error),
      expect.objectContaining({
        hashedEmail: expect.stringMatching(/^[0-9a-f]{12}$/),
      }),
    );
    // PII guard: raw email never reaches the extras object
    const extras = mockLogError.mock.calls[0]?.[3] as
      | Record<string, unknown>
      | undefined;
    expect(JSON.stringify(extras ?? {})).not.toContain("ada@example.com");
  });
});

describe("POST /api/newsletter — environment fallback", () => {
  it("acks ok without calling the store when WIX_VELO_SITE_URL is unset", async () => {
    delete process.env.WIX_VELO_SITE_URL;

    const res = await POST(makePost({ email: "ada@example.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("POST /api/newsletter — PII redaction in logs (cfw-t22e)", () => {
  // cfw-t22e: the rate-limit path was logging `req.email` raw, mirroring the
  // pre-cfw-coc server-action leak. Same Vercel/Datadog/Sumo retention risk;
  // pin the redacted form so the regression can't sneak back in.
  const ORIGINAL_SALT = process.env.LOG_PII_SALT;
  beforeEach(() => {
    process.env.LOG_PII_SALT = "test-salt-cfw-t22e";
  });
  afterEach(() => {
    if (ORIGINAL_SALT === undefined) delete process.env.LOG_PII_SALT;
    else process.env.LOG_PII_SALT = ORIGINAL_SALT;
  });

  it("logs a short hash, not the raw email, on rate-limit", async () => {
    mockUpsert.mockRejectedValue(new NewsletterRateLimitError());
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await POST(makePost({ email: "leak-me@example.com" }));

    expect(res.status).toBe(429);
    const warned = warn.mock.calls
      .flat()
      .filter((arg): arg is string => typeof arg === "string")
      .join(" ");
    expect(warned).not.toContain("leak-me@example.com");
    expect(warned).toMatch(/\[api\/newsletter\] rate-limited:.*[0-9a-f]{12}/);
    warn.mockRestore();
  });
});
