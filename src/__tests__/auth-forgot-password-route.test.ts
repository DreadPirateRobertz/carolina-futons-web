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
