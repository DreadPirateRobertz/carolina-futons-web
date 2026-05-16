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

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

beforeEach(() => {
  storeMocks.upsertSubscriber.mockReset();
  storeMocks.upsertSubscriber.mockResolvedValue({ created: true });
  mockLogError.mockClear();
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

  // Logger migration (cfw-logger batch 15): upsertSubscriber catch
  // forwards to logError with source="newsletter".
  it("calls logError with source='newsletter' op='upsertSubscriber' when the store throws", async () => {
    const storeErr = new Error("EACCES");
    storeMocks.upsertSubscriber.mockRejectedValueOnce(storeErr);
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    await subscribeToNewsletter(null, fd({ email: "ok@example.com" }));
    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [source, op, err] = mockLogError.mock.calls[0];
    expect(source).toBe("newsletter");
    expect(op).toBe("upsertSubscriber");
    expect(err).toBe(storeErr);
  });

  it("does NOT call logError on success (happy path)", async () => {
    storeMocks.upsertSubscriber.mockResolvedValueOnce({ created: true });
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    await subscribeToNewsletter(null, fd({ email: "ok@example.com" }));
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("does NOT call logError on the rate-limit branch (uses console.warn, distinct from Sentry-worthy)", async () => {
    const { NewsletterRateLimitError } = await import(
      "@/lib/newsletter/newsletter-store"
    );
    storeMocks.upsertSubscriber.mockRejectedValueOnce(
      new NewsletterRateLimitError(),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { subscribeToNewsletter } = await import("@/app/newsletter/actions");
    await subscribeToNewsletter(null, fd({ email: "ok@example.com" }));
    expect(mockLogError).not.toHaveBeenCalled();
    warnSpy.mockRestore();
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
