import { describe, it, expect, beforeEach, vi } from "vitest";

const sendPasswordResetEmailMock = vi.fn();

vi.mock("@/lib/wix/auth", () => ({
  sendPasswordResetEmail: (email: string, redirectUrl: string) =>
    sendPasswordResetEmailMock(email, redirectUrl),
}));

// cfw-nxlm: the sendRecoveryEmail catch now routes through logError
// → Sentry. Mock @sentry/nextjs so tests don't ship events AND the
// new logError-integration describe below can assert (scope, op)
// tags + emailHash extra (cfw-coc PII pattern).
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

const makeReq = (body: unknown) =>
  new Request("https://test.local/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
  // PII hash needs a deterministic salt across runs.
  process.env.LOG_PII_SALT = "test-salt-cfw-nxlm";
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 when email is missing", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(makeReq({}) as never);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/valid email/i);
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it("returns 400 when email is malformed", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(makeReq({ email: "not-an-email" }) as never);
    expect(res.status).toBe(400);
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not JSON", async () => {
    const req = new Request("https://test.local/api/auth/forgot-password", {
      method: "POST",
      body: "not-json",
    });
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("calls sendPasswordResetEmail with redirect back to /account?reset=sent", async () => {
    sendPasswordResetEmailMock.mockResolvedValueOnce(undefined);
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(makeReq({ email: "user@example.com" }) as never);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      "user@example.com",
      "https://test.local/account?reset=sent",
    );
  });

  it("trims whitespace from email", async () => {
    sendPasswordResetEmailMock.mockResolvedValueOnce(undefined);
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    await POST(makeReq({ email: "  user@example.com  " }) as never);
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      "user@example.com",
      expect.any(String),
    );
  });

  it("returns ok=true even when Wix throws (no email enumeration)", async () => {
    sendPasswordResetEmailMock.mockRejectedValueOnce(new Error("Wix down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(makeReq({ email: "user@example.com" }) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    // cfw-nxlm: logError still calls console.error internally (via the
    // observability helper) so this assertion remains valid. The
    // logError-integration describe below is the more precise contract
    // for what reaches Sentry.
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[auth/forgot-password]"),
      expect.any(Error),
      expect.any(Object), // logError attaches { emailHash } as third arg
    );
    consoleSpy.mockRestore();
  });
});

// cfw-nxlm: pin logError integration on the sendRecoveryEmail catch.
// Forgot-password is a P0 user-recovery flow — a silent Wix outage
// means members lose accounts. Sentry must page on every failure.
// cfw-coc: the lead's email MUST NOT flow to Sentry; only its hash.
describe("POST /api/auth/forgot-password — logError integration on Wix throw", () => {
  it("captures scope='auth/forgot-password' + op='sendRecoveryEmail failed' + extra { emailHash } — raw email MUST NOT appear", async () => {
    const thrown = new Error("Wix members API 502");
    sendPasswordResetEmailMock.mockRejectedValueOnce(thrown);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(makeReq({ email: "brenda@example.com" }) as never);

    // Response shape preserved — anti-enumeration contract intact.
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "auth/forgot-password",
      op: "sendRecoveryEmail failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    const extra = (opts as { extra: Record<string, unknown> }).extra;
    expect(typeof extra.emailHash).toBe("string");
    expect((extra.emailHash as string).length).toBeGreaterThan(0);
    expect(extra.emailHash).not.toContain("brenda@example.com");
    expect(extra.emailHash).not.toContain("@");
    // cfw-coc: scan the entire Sentry payload — raw email MUST NOT
    // appear anywhere, not just in extra.
    const serialized = JSON.stringify(sentryCaptureException.mock.calls);
    expect(serialized).not.toContain("brenda@example.com");

    expect(sentryFlush).toHaveBeenCalledWith(2000);
    consoleSpy.mockRestore();
  });

  it("happy path (Wix accepts the reset request) does NOT call Sentry", async () => {
    sendPasswordResetEmailMock.mockResolvedValueOnce(undefined);

    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(makeReq({ email: "user@example.com" }) as never);

    expect(res.status).toBe(200);
    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("validation 400 (bad email format) → never reaches catch, no Sentry call", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(makeReq({ email: "not-an-email" }) as never);

    expect(res.status).toBe(400);
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
