import { describe, it, expect, beforeEach, vi } from "vitest";

const sendPasswordResetEmailMock = vi.fn();

vi.mock("@/lib/wix/auth", () => ({
  sendPasswordResetEmail: (email: string, redirectUrl: string) =>
    sendPasswordResetEmailMock(email, redirectUrl),
}));

const makeReq = (body: unknown) =>
  new Request("https://test.local/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
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
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[auth/forgot-password]"),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});

// Pins the logError migration so an accidental revert to a bare
// console.error("[auth/forgot-password] …") (or to a string-interpolated
// prefix that bypasses the helper) fails loudly. Asserts on the
// console.error sink because logError forwards there in every env; the
// Sentry forwarder is prod-only and unit-tested in log.test.ts.
describe("POST /api/auth/forgot-password — logError migration", () => {
  it("emits the bracketed '[auth/forgot-password] sendRecoveryEmail failed' prefix with the thrown err as the second arg", async () => {
    const thrown = new Error("Wix down");
    sendPasswordResetEmailMock.mockRejectedValueOnce(thrown);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    await POST(makeReq({ email: "user@example.com" }) as never);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0]![0]).toBe(
      "[auth/forgot-password] sendRecoveryEmail failed",
    );
    expect(consoleSpy.mock.calls[0]![1]).toBe(thrown);
    consoleSpy.mockRestore();
  });

  it("forwards non-Error throws (string reason) as the second arg, unchanged", async () => {
    sendPasswordResetEmailMock.mockRejectedValueOnce("wix-degraded");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    await POST(makeReq({ email: "user@example.com" }) as never);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0]![0]).toBe(
      "[auth/forgot-password] sendRecoveryEmail failed",
    );
    expect(consoleSpy.mock.calls[0]![1]).toBe("wix-degraded");
    consoleSpy.mockRestore();
  });

  it("does NOT log on the happy path (Wix resolves cleanly)", async () => {
    sendPasswordResetEmailMock.mockResolvedValueOnce(undefined);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(makeReq({ email: "user@example.com" }) as never);
    expect(res.status).toBe(200);
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
