import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";
import { LoginState } from "@wix/sdk";

const cookieStore = new Map<string, { value: string }>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string) => {
      cookieStore.set(name, { value });
    },
    delete: (arg: string | { name: string; path?: string }) => {
      cookieStore.delete(typeof arg === "string" ? arg : arg.name);
    },
  }),
}));

const loginFn = vi.fn();
const getMemberTokensForDirectLogin = vi.fn<() => Promise<Tokens>>();

vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({
    auth: { login: loginFn, getMemberTokensForDirectLogin },
  }),
}));

const TOKENS: Tokens = {
  accessToken: { value: "access-tok", expiresAt: 9_999_999_999 },
  refreshToken: { value: "refresh-tok", role: "member" as Tokens["refreshToken"]["role"] },
};

const makeReq = (body: unknown) =>
  new Request("https://test.local/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  cookieStore.clear();
  vi.clearAllMocks();
  vi.stubEnv("WIX_CLIENT_ID_HEADLESS", "test-client-id");
});

describe("POST /api/auth/login — email+password in-app auth", () => {
  it("sets session cookie and returns ok=true on SUCCESS", async () => {
    loginFn.mockResolvedValue({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "session-tok" },
    });
    getMemberTokensForDirectLogin.mockResolvedValue(TOKENS);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "test@example.com", password: "secret" }) as never);
    const body = await res.json() as { ok: boolean; redirectTo: string };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.redirectTo).toBe("/dashboard");
    expect(cookieStore.has("wix-session")).toBe(true);
    expect(getMemberTokensForDirectLogin).toHaveBeenCalledWith("session-tok");
  });

  it("uses callbackUrl as redirectTo when safe", async () => {
    loginFn.mockResolvedValue({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "session-tok" },
    });
    getMemberTokensForDirectLogin.mockResolvedValue(TOKENS);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "pw", callbackUrl: "/orders" }) as never);
    const body = await res.json() as { redirectTo: string };
    expect(body.redirectTo).toBe("/orders");
  });

  it("falls back to /dashboard for unsafe callbackUrl (absolute URL)", async () => {
    loginFn.mockResolvedValue({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok" },
    });
    getMemberTokensForDirectLogin.mockResolvedValue(TOKENS);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "pw", callbackUrl: "https://evil.com" }) as never);
    const body = await res.json() as { redirectTo: string };
    expect(body.redirectTo).toBe("/dashboard");
  });

  it("returns state=email_verification_required without setting session", async () => {
    loginFn.mockResolvedValue({ loginState: LoginState.EMAIL_VERIFICATION_REQUIRED });

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "pw" }) as never);
    const body = await res.json() as { state: string };

    expect(res.status).toBe(200);
    expect(body.state).toBe("email_verification_required");
    expect(cookieStore.has("wix-session")).toBe(false);
  });

  it("returns 403 + message for OWNER_APPROVAL_REQUIRED", async () => {
    loginFn.mockResolvedValue({ loginState: LoginState.OWNER_APPROVAL_REQUIRED });

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "pw" }) as never);

    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("approval");
  });

  it("returns 401 + generic message for invalidEmail error code", async () => {
    loginFn.mockResolvedValue({
      loginState: LoginState.FAILURE,
      errorCode: "invalidEmail",
    });

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "pw" }) as never);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Email or password is incorrect.");
  });

  it("returns 401 + generic message for invalidPassword (no email enumeration)", async () => {
    loginFn.mockResolvedValue({
      loginState: LoginState.FAILURE,
      errorCode: "invalidPassword",
    });

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "wrong" }) as never);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Email or password is incorrect.");
  });

  it("returns 400 when email is missing", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "", password: "pw" }) as never);

    expect(res.status).toBe(400);
    expect(loginFn).not.toHaveBeenCalled();
  });

  it("returns 400 when password is missing", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "" }) as never);

    expect(res.status).toBe(400);
    expect(loginFn).not.toHaveBeenCalled();
  });

  it("returns 502 when Wix SDK throws during login", async () => {
    loginFn.mockRejectedValue(new Error("network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "pw" }) as never);

    expect(res.status).toBe(502);
    expect(cookieStore.has("wix-session")).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[auth/login]"),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("returns 502 when getMemberTokensForDirectLogin throws", async () => {
    loginFn.mockResolvedValue({
      loginState: LoginState.SUCCESS,
      data: { sessionToken: "tok" },
    });
    getMemberTokensForDirectLogin.mockRejectedValue(new Error("token error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "pw" }) as never);

    expect(res.status).toBe(502);
    expect(cookieStore.has("wix-session")).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[auth/login]"),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
