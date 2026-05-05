import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginState } from "@wix/sdk";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockRegister,
  mockLogin,
  mockGetMemberTokensForDirectLogin,
  mockCookiesSet,
} = vi.hoisted(() => {
  const mockRegister = vi.fn();
  const mockLogin = vi.fn();
  const mockGetMemberTokensForDirectLogin = vi.fn();
  const mockCookiesSet = vi.fn();
  return {
    mockRegister,
    mockLogin,
    mockGetMemberTokensForDirectLogin,
    mockCookiesSet,
  };
});

vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({
    auth: {
      register: mockRegister,
      login: mockLogin,
      getMemberTokensForDirectLogin: mockGetMemberTokensForDirectLogin,
    },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      set: mockCookiesSet,
    }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function callRegister(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/auth/register/route");
  const req = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req as Parameters<typeof POST>[0]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when email is missing", async () => {
    const res = await callRegister({ password: "password123" });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/required/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await callRegister({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is not JSON", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
  });

  it("sets session cookie and returns ok+redirectTo on SUCCESS", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-123" },
    });
    mockGetMemberTokensForDirectLogin.mockResolvedValueOnce({
      accessToken: { value: "acc", expiresAt: 0 },
      refreshToken: { value: "ref", role: 0 },
    });

    const res = await callRegister({
      email: "new@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.redirectTo).toBe("/dashboard");
    expect(mockCookiesSet).toHaveBeenCalledOnce();
  });

  it("uses callbackUrl when provided and safe", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-abc" },
    });
    mockGetMemberTokensForDirectLogin.mockResolvedValueOnce({
      accessToken: { value: "acc", expiresAt: 0 },
      refreshToken: { value: "ref", role: 0 },
    });

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
      callbackUrl: "/wishlist",
    });
    const data = await res.json();
    expect(data.redirectTo).toBe("/wishlist");
  });

  it("sanitises external callbackUrl to /dashboard", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-abc" },
    });
    mockGetMemberTokensForDirectLogin.mockResolvedValueOnce({
      accessToken: { value: "acc", expiresAt: 0 },
      refreshToken: { value: "ref", role: 0 },
    });

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
      callbackUrl: "//evil.com/steal",
    });
    const data = await res.json();
    expect(data.redirectTo).toBe("/dashboard");
  });

  it("returns email_verification_required state on EMAIL_VERIFICATION_REQUIRED", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.EMAIL_VERIFICATION_REQUIRED,
    });

    const res = await callRegister({
      email: "verify@example.com",
      password: "password123",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state).toBe("email_verification_required");
    expect(mockCookiesSet).not.toHaveBeenCalled();
  });

  it("returns 403 on OWNER_APPROVAL_REQUIRED", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.OWNER_APPROVAL_REQUIRED,
    });

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/approval/i);
  });

  it("returns 409 with emailAlreadyExists message on duplicate email", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.FAILURE,
      errorCode: "emailAlreadyExists",
    });

    const res = await callRegister({
      email: "dup@example.com",
      password: "password123",
    });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already exists/i);
  });

  it("returns 422 with invalidEmail message on bad email format", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.FAILURE,
      errorCode: "invalidEmail",
    });

    const res = await callRegister({
      email: "notanemail",
      password: "password123",
    });
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toMatch(/invalid/i);
  });

  it("returns 400 with generic message on unknown FAILURE error code", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.FAILURE,
      errorCode: "missingCaptchaToken",
    });

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/please try again/i);
  });

  it("sanitises absolute http:// callbackUrl to /dashboard", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-abc" },
    });
    mockGetMemberTokensForDirectLogin.mockResolvedValueOnce({
      accessToken: { value: "acc", expiresAt: 0 },
      refreshToken: { value: "ref", role: 0 },
    });

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
      callbackUrl: "http://evil.com/steal",
    });
    const data = await res.json();
    expect(data.redirectTo).toBe("/dashboard");
  });

  it("returns 502 when client.auth.register throws", async () => {
    mockRegister.mockRejectedValueOnce(new Error("network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });
    expect(res.status).toBe(502);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[auth/register]"),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  // cfw-aik: when post-register token exchange fails, fall back to login()
  // with the same credentials and complete the session there.
  it("falls back to login() when getMemberTokensForDirectLogin throws and login SUCCEEDs", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-register" },
    });
    mockGetMemberTokensForDirectLogin.mockRejectedValueOnce(
      new Error("token exchange failed"),
    );
    mockLogin.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-login" },
    });
    mockGetMemberTokensForDirectLogin.mockResolvedValueOnce({
      accessToken: { value: "acc", expiresAt: 0 },
      refreshToken: { value: "ref", role: 0 },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.redirectTo).toBe("/dashboard");
    expect(mockCookiesSet).toHaveBeenCalledOnce();
    expect(mockLogin).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password123",
    });
    expect(mockGetMemberTokensForDirectLogin).toHaveBeenNthCalledWith(
      2,
      "tok-login",
    );
    consoleSpy.mockRestore();
  });

  it("returns email_verification_required when login fallback returns EMAIL_VERIFICATION_REQUIRED", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-register" },
    });
    mockGetMemberTokensForDirectLogin.mockRejectedValueOnce(
      new Error("token exchange failed"),
    );
    mockLogin.mockResolvedValueOnce({
      loginState: LoginState.EMAIL_VERIFICATION_REQUIRED,
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state).toBe("email_verification_required");
    expect(mockCookiesSet).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns email_verification_required when login fallback returns FAILURE (most likely unverified email)", async () => {
    // cfw-aik core repro: register SUCCESS but token exchange fails AND
    // a follow-up login also fails. The most actionable user-facing
    // message is "check your email" — better than the legacy
    // "Account created. Sign in to continue." dead end.
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-register" },
    });
    mockGetMemberTokensForDirectLogin.mockRejectedValueOnce(
      new Error("token exchange failed"),
    );
    mockLogin.mockResolvedValueOnce({
      loginState: LoginState.FAILURE,
      errorCode: "invalidPassword",
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state).toBe("email_verification_required");
    expect(data.error).toBeUndefined();
    expect(mockCookiesSet).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns 502 with verify-email guidance when login fallback throws", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-register" },
    });
    mockGetMemberTokensForDirectLogin.mockRejectedValueOnce(
      new Error("token exchange failed"),
    );
    mockLogin.mockRejectedValueOnce(new Error("login network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/verification link/i);
    expect(mockCookiesSet).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns email_verification_required when login fallback SUCCEEDs but second token exchange fails", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-register" },
    });
    mockGetMemberTokensForDirectLogin.mockRejectedValueOnce(
      new Error("first exchange failed"),
    );
    mockLogin.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-login" },
    });
    mockGetMemberTokensForDirectLogin.mockRejectedValueOnce(
      new Error("second exchange failed"),
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state).toBe("email_verification_required");
    expect(mockCookiesSet).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
