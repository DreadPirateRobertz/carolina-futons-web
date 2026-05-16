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

// cfw-0tpn: the timeout + upsert-fail catches now route through
// logError → Sentry. Mock @sentry/nextjs so the runner doesn't ship
// events AND the new logError-integration describe below can assert
// (scope, op) tags + emailHash extra (cfw-coc PII pattern).
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
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
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
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

  it("returns 502 velo-unreachable on a TimeoutError from the store", async () => {
    const timeoutErr = new Error("timed out");
    timeoutErr.name = "TimeoutError";
    mockUpsert.mockRejectedValue(timeoutErr);

    const res = await POST(makePost({ email: "ada@example.com" }));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "velo-unreachable" });
  });

  it("returns 502 velo-error on any other store failure", async () => {
    mockUpsert.mockRejectedValue(new Error("boom"));

    const res = await POST(makePost({ email: "ada@example.com" }));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "velo-error" });
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
    // cfw-d2vn: migrated to logWarn — shape is now
    // console.warn("[api/newsletter] rate-limited", err, { emailHash }).
    const serialized = JSON.stringify(
      warn.mock.calls.flat().map((arg) =>
        arg instanceof Error ? arg.message : arg,
      ),
    );
    expect(serialized).not.toContain("leak-me@example.com");
    expect(serialized).toMatch(/[0-9a-f]{12}/);
    const stringArgs = warn.mock.calls
      .flat()
      .filter((arg): arg is string => typeof arg === "string");
    expect(stringArgs[0]).toBe("[api/newsletter] rate-limited");
    warn.mockRestore();
  });
});

// cfw-0tpn: pin logError integration on both backend-error catches.
// Newsletter signup is a top-of-funnel marketing pipeline — silent
// Velo outages drop leads. cfw-coc PII contract: email NEVER flows
// raw to Sentry; only its hash.
describe("POST /api/newsletter — logError integration", () => {
  const ORIGINAL_SALT = process.env.LOG_PII_SALT;
  beforeEach(() => {
    process.env.LOG_PII_SALT = "test-salt-cfw-0tpn";
  });
  afterEach(() => {
    if (ORIGINAL_SALT === undefined) delete process.env.LOG_PII_SALT;
    else process.env.LOG_PII_SALT = ORIGINAL_SALT;
  });

  it("TimeoutError → captures scope='api/newsletter' + op='velo timeout' + extra { emailHash } — raw email MUST NOT appear", async () => {
    const timeoutErr = new Error("timed out");
    timeoutErr.name = "TimeoutError";
    mockUpsert.mockRejectedValue(timeoutErr);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makePost({ email: "brenda@example.com" }));

    expect(res.status).toBe(502);
    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(timeoutErr);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "api/newsletter",
      op: "velo timeout",
    });
    expect((opts as { level: string }).level).toBe("error");
    const extra = (opts as { extra: Record<string, unknown> }).extra;
    expect(typeof extra.emailHash).toBe("string");
    expect((extra.emailHash as string).length).toBeGreaterThan(0);
    expect(extra.emailHash).not.toContain("brenda@example.com");
    const serialized = JSON.stringify(sentryCaptureException.mock.calls);
    expect(serialized).not.toContain("brenda@example.com");
    expect(sentryFlush).toHaveBeenCalledWith(2000);
    errSpy.mockRestore();
  });

  it("upsertSubscriber throw → captures op='upsertSubscriber failed' + extra { emailHash }", async () => {
    const thrown = new Error("velo 500");
    mockUpsert.mockRejectedValue(thrown);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makePost({ email: "brenda@example.com" }));

    expect(res.status).toBe(502);
    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "api/newsletter",
      op: "upsertSubscriber failed",
    });
    const extra = (opts as { extra: Record<string, unknown> }).extra;
    expect(extra.emailHash).toBeDefined();
    expect((extra.emailHash as string)).not.toContain("brenda@example.com");
    errSpy.mockRestore();
  });

  it("rate-limit (NewsletterRateLimitError) → captures Sentry at level='warning' (NOT 'error') — keeps trend signal without paging on-call", async () => {
    mockUpsert.mockRejectedValue(new NewsletterRateLimitError());
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await POST(makePost({ email: "user@example.com" }));

    expect(res.status).toBe(429);
    // cfw-d2vn: migrated console.warn → logWarn. Rate limits now
    // surface to Sentry at level='warning' so the trend is visible
    // on the dashboard, but Sentry alert routing filters on
    // level='error' so on-call doesn't get paged on user-induced
    // traffic.
    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [, opts] = sentryCaptureException.mock.calls[0]!;
    expect((opts as { level: string }).level).toBe("warning");
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "api/newsletter",
      op: "rate-limited",
    });
    warn.mockRestore();
  });

  it("happy path (success) does NOT call Sentry", async () => {
    mockUpsert.mockResolvedValue({ created: true });

    const res = await POST(makePost({ email: "user@example.com" }));

    expect(res.status).toBe(200);
    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });
});
