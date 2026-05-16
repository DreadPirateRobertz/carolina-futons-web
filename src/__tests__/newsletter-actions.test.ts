import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// cf-newsletter-footer: Server Action for the footer signup.
// Validates email → upserts to a store (file on disk under /data by default).
// Store is injected via module mock so we can assert calls without touching FS.

const storeMocks = vi.hoisted(() => ({
  upsertSubscriber: vi.fn<(email: string) => Promise<{ created: boolean }>>(
    async () => ({ created: true }),
  ),
}));

vi.mock("@/lib/newsletter/newsletter-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/newsletter/newsletter-store")>();
  return { ...actual, upsertSubscriber: storeMocks.upsertSubscriber };
});

// cfw-2nqq: upsertSubscriber catch now routes through logError →
// Sentry. Mock @sentry/nextjs so the runner doesn't ship events AND
// the new logError-integration tests can assert on (scope, op) tags +
// the emailHash extra (cfw-coc PII-redaction pattern preserved).
const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: sentryMocks.captureException,
  flush: sentryMocks.flush,
}));

beforeEach(() => {
  storeMocks.upsertSubscriber.mockReset();
  storeMocks.upsertSubscriber.mockResolvedValue({ created: true });
  sentryMocks.captureException.mockReset();
  sentryMocks.flush.mockReset().mockResolvedValue(true);
});

function fd(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  return data;
}

describe("subscribeToNewsletter — validation", () => {
  it("rejects empty email with a field error and does not touch the store", async () => {
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    const result = await subscribeToNewsletter(null, fd({ email: "" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.email).toBeTruthy();
    expect(storeMocks.upsertSubscriber).not.toHaveBeenCalled();
  });

  it("rejects a malformed email with a field error", async () => {
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    const result = await subscribeToNewsletter(null, fd({ email: "nope" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.email).toBeTruthy();
    expect(storeMocks.upsertSubscriber).not.toHaveBeenCalled();
  });
});

describe("subscribeToNewsletter — persistence", () => {
  it("lowercases + trims before upserting (one canonical form per address)", async () => {
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    const result = await subscribeToNewsletter(
      null,
      fd({ email: "  Jane@Example.COM  " }),
    );
    expect(result.status).toBe("success");
    expect(storeMocks.upsertSubscriber).toHaveBeenCalledWith(
      "jane@example.com",
    );
  });

  it("returns success:new on first signup", async () => {
    storeMocks.upsertSubscriber.mockResolvedValueOnce({ created: true });
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    const result = await subscribeToNewsletter(
      null,
      fd({ email: "new@example.com" }),
    );
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.alreadySubscribed).toBe(false);
  });

  it("returns success:already when the store reports the email existed", async () => {
    storeMocks.upsertSubscriber.mockResolvedValueOnce({ created: false });
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    const result = await subscribeToNewsletter(
      null,
      fd({ email: "existing@example.com" }),
    );
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.alreadySubscribed).toBe(true);
  });

  it("surfaces a friendly error when the store throws", async () => {
    storeMocks.upsertSubscriber.mockRejectedValueOnce(new Error("EACCES"));
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    const result = await subscribeToNewsletter(
      null,
      fd({ email: "ok@example.com" }),
    );
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.storeError).toBeTruthy();
  });
});

describe("subscribeToNewsletter — PII redaction in logs (cfw-coc)", () => {
  const ORIGINAL_SALT = process.env.LOG_PII_SALT;
  beforeEach(() => {
    process.env.LOG_PII_SALT = "test-salt-cfw-coc";
  });

  it("logs a short hash, not the raw email, on success", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    await subscribeToNewsletter(null, fd({ email: "leak-me@example.com" }));

    const logged = log.mock.calls
      .flat()
      .filter((arg): arg is string => typeof arg === "string")
      .join(" ");
    expect(logged).not.toContain("leak-me@example.com");
    expect(logged).toMatch(
      /\[newsletter\] (NEW|DUPLICATE) subscriber: [0-9a-f]{12}/,
    );
    log.mockRestore();
  });

  it("logs a short hash, not the raw email, on rate-limit", async () => {
    const { NewsletterRateLimitError } =
      await import("@/lib/newsletter/newsletter-store");
    storeMocks.upsertSubscriber.mockRejectedValueOnce(
      new NewsletterRateLimitError(),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    await subscribeToNewsletter(null, fd({ email: "leak-me@example.com" }));

    const warned = warn.mock.calls
      .flat()
      .filter((arg): arg is string => typeof arg === "string")
      .join(" ");
    expect(warned).not.toContain("leak-me@example.com");
    expect(warned).toMatch(/\[newsletter\] rate-limited:.*[0-9a-f]{12}/);
    warn.mockRestore();
  });

  afterEach(() => {
    if (ORIGINAL_SALT === undefined) delete process.env.LOG_PII_SALT;
    else process.env.LOG_PII_SALT = ORIGINAL_SALT;
  });
});

// cfw-2nqq: pin logError integration on the upsertSubscriber catch.
// PII redaction is part of the contract — the email itself MUST NOT
// flow to Sentry; only its hash. This is the cfw-coc compliance
// pattern that was previously in console.error; the migration must
// preserve it.
describe("subscribeToNewsletter — logError integration on upsertSubscriber throw", () => {
  it("captures with scope='newsletter' + op='upsertSubscriber failed' + emailHash (NOT raw email) in extra", async () => {
    const thrown = new Error("store write 500");
    storeMocks.upsertSubscriber.mockRejectedValueOnce(thrown);
    const { subscribeToNewsletter } = await import(
      "@/app/newsletter/actions"
    );

    const result = await subscribeToNewsletter(
      null,
      fd({ email: "brenda@carolinafutons.com" }),
    );

    // User-visible error preserved.
    expect(result.status).toBe("error");

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "newsletter",
      op: "upsertSubscriber failed",
    });

    // PII: raw email MUST NOT appear in extra. The hash MUST be a
    // non-empty string distinct from the email.
    const extra = (
      opts as { extra: { emailHash?: string } }
    ).extra;
    expect(extra?.emailHash).toBeDefined();
    expect(extra?.emailHash).not.toContain("brenda@carolinafutons.com");
    expect(typeof extra?.emailHash).toBe("string");
    expect((extra?.emailHash ?? "").length).toBeGreaterThan(0);

    expect(sentryMocks.flush).toHaveBeenCalledWith(2000);
  });

  it("rate-limit error (NewsletterRateLimitError) does NOT call Sentry — it's user-induced traffic", async () => {
    // Import the class so we can construct it.
    const { NewsletterRateLimitError } = await import(
      "@/lib/newsletter/newsletter-store"
    );
    storeMocks.upsertSubscriber.mockRejectedValueOnce(
      new NewsletterRateLimitError(),
    );
    const { subscribeToNewsletter } = await import(
      "@/app/newsletter/actions"
    );

    const result = await subscribeToNewsletter(
      null,
      fd({ email: "brenda@carolinafutons.com" }),
    );

    expect(result.status).toBe("error");
    // Rate limits are a user-induced state; would drown the dashboard
    // if every spammer's hammering surfaced as a Sentry event.
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });

  it("happy path does NOT call Sentry", async () => {
    storeMocks.upsertSubscriber.mockResolvedValueOnce({ created: true });
    const { subscribeToNewsletter } = await import(
      "@/app/newsletter/actions"
    );

    const result = await subscribeToNewsletter(
      null,
      fd({ email: "brenda@carolinafutons.com" }),
    );

    expect(result.status).toBe("success");
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });
});
