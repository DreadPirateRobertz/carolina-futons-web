import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginState } from "@wix/sdk";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockRegister, mockGetMemberTokensForDirectLogin, mockCookiesSet } =
  vi.hoisted(() => {
    const mockRegister = vi.fn();
    const mockGetMemberTokensForDirectLogin = vi.fn();
    const mockCookiesSet = vi.fn();
    return { mockRegister, mockGetMemberTokensForDirectLogin, mockCookiesSet };
  });

vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({
    auth: {
      register: mockRegister,
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

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });
    expect(res.status).toBe(502);
  });

  it("returns registered_sign_in_required when getMemberTokensForDirectLogin throws", async () => {
    mockRegister.mockResolvedValueOnce({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok-xyz" },
    });
    mockGetMemberTokensForDirectLogin.mockRejectedValueOnce(
      new Error("token exchange failed"),
    );

    const res = await callRegister({
      email: "a@b.com",
      password: "password123",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state).toBe("registered_sign_in_required");
    expect(mockCookiesSet).not.toHaveBeenCalled();
  });
});
