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

const logWixFailure = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

const TOKENS: Tokens = {
  accessToken: { value: "access-tok", expiresAt: 9_999_999_999 },
  refreshToken: { value: "refresh-tok", role: "member" as Tokens["refreshToken"]["role"] },
};

const makeReq = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://test.local/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
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

  // cfw-ipr: malformed-input throws (e.g. email "@@") get classified as 422
  // instead of bleeding through to the 502 + Sentry path.
  describe("cfw-ipr 422 input-validation throws", () => {
    it("returns 422 + email message when login throws code=invalidEmail (no Sentry)", async () => {
      loginFn.mockRejectedValue(
        Object.assign(new Error("invalid email"), { code: "invalidEmail" }),
      );

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(makeReq({ email: "@@", password: "pw" }) as never);
      const body = (await res.json()) as { error: string };

      expect(res.status).toBe(422);
      expect(body.error).toMatch(/email/i);
      expect(body.error).toMatch(/invalid/i);
      expect(logWixFailure).not.toHaveBeenCalled();
      expect(cookieStore.has("wix-session")).toBe(false);
    });

    it("returns 422 + password message when login throws code=invalidPassword (no Sentry)", async () => {
      loginFn.mockRejectedValue(
        Object.assign(new Error("invalid password"), {
          code: "invalidPassword",
        }),
      );

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(
        makeReq({ email: "a@b.com", password: "x" }) as never,
      );
      const body = (await res.json()) as { error: string };

      expect(res.status).toBe(422);
      expect(body.error).toMatch(/password/i);
      expect(logWixFailure).not.toHaveBeenCalled();
    });

    it("returns 422 + generic message when login throws response.status=400 with no known code (no Sentry)", async () => {
      loginFn.mockRejectedValue({ response: { status: 400 } });

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(
        makeReq({ email: "a@b.com", password: "pw" }) as never,
      );
      const body = (await res.json()) as { error: string };

      expect(res.status).toBe(422);
      expect(body.error).toMatch(/email|password/i);
      expect(logWixFailure).not.toHaveBeenCalled();
    });

    it("classifies validation via details.applicationError.code", async () => {
      loginFn.mockRejectedValue({
        message: "x",
        details: { applicationError: { code: "invalidEmail" } },
      });

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(makeReq({ email: "@@", password: "pw" }) as never);

      expect(res.status).toBe(422);
      expect(logWixFailure).not.toHaveBeenCalled();
    });

    it("does NOT classify upstream 5xx as validation (still 502 + Sentry)", async () => {
      loginFn.mockRejectedValue({ response: { status: 502 } });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(
        makeReq({ email: "a@b.com", password: "pw" }) as never,
      );

      expect(res.status).toBe(502);
      expect(logWixFailure).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });

  it("returns 502 when Wix SDK throws during login", async () => {
    loginFn.mockRejectedValue(new Error("network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeReq({ email: "a@b.com", password: "pw" }) as never);

    expect(res.status).toBe(502);
    expect(cookieStore.has("wix-session")).toBe(false);
    expect(logWixFailure).toHaveBeenCalledWith(
      "auth/login",
      expect.any(String),
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
    expect(logWixFailure).toHaveBeenCalledWith(
      "auth/login",
      expect.any(String),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  // cfw-hb3: env-gated diag block ships in the 502 response so a curl with
  // x-debug-token can read the SDK error message + env byte fingerprint
  // without needing Vercel function logs access.
  describe("cfw-hb3 diag response (gated by WIX_AUTH_DEBUG_TOKEN)", () => {
    it("does NOT include diag when WIX_AUTH_DEBUG_TOKEN is unset", async () => {
      vi.stubEnv("WIX_AUTH_DEBUG_TOKEN", "");
      loginFn.mockRejectedValue(new Error("vercel-runtime-boom"));

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(
        makeReq({ email: "a@b.com", password: "pw" }, { "x-debug-token": "anything" }) as never,
      );
      const body = (await res.json()) as { error: string; diag?: unknown };

      expect(res.status).toBe(502);
      expect(body.diag).toBeUndefined();
    });

    it("does NOT include diag when token header is missing", async () => {
      vi.stubEnv("WIX_AUTH_DEBUG_TOKEN", "secret");
      loginFn.mockRejectedValue(new Error("vercel-runtime-boom"));

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(makeReq({ email: "a@b.com", password: "pw" }) as never);
      const body = (await res.json()) as { error: string; diag?: unknown };

      expect(res.status).toBe(502);
      expect(body.diag).toBeUndefined();
    });

    it("does NOT include diag when token mismatches", async () => {
      vi.stubEnv("WIX_AUTH_DEBUG_TOKEN", "secret");
      loginFn.mockRejectedValue(new Error("vercel-runtime-boom"));

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(
        makeReq({ email: "a@b.com", password: "pw" }, { "x-debug-token": "wrong" }) as never,
      );
      const body = (await res.json()) as { error: string; diag?: unknown };

      expect(res.status).toBe(502);
      expect(body.diag).toBeUndefined();
    });

    it("includes diag.err.message + diag.env + diag.runtime when token matches", async () => {
      vi.stubEnv("WIX_AUTH_DEBUG_TOKEN", "secret");
      vi.stubEnv("WIX_CLIENT_ID_HEADLESS", "abcd-1234-efgh-5678");
      loginFn.mockRejectedValue(new Error("vercel-runtime-boom"));

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(
        makeReq({ email: "a@b.com", password: "pw" }, { "x-debug-token": "secret" }) as never,
      );
      const body = (await res.json()) as {
        error: string;
        diag: {
          err: { message: string; name: string };
          env: { length: number; prefix4: string; suffix4: string; hex8Prefix: string };
          runtime: { nodeVersion: string };
        };
      };

      expect(res.status).toBe(502);
      expect(body.diag.err.message).toBe("vercel-runtime-boom");
      expect(body.diag.env.length).toBe("abcd-1234-efgh-5678".length);
      expect(body.diag.env.prefix4).toBe("abcd");
      expect(body.diag.env.suffix4).toBe("5678");
      expect(body.diag.runtime.nodeVersion).toMatch(/^v\d+\./);
    });

    it("also gates diag on the post-success token-exchange failure path", async () => {
      vi.stubEnv("WIX_AUTH_DEBUG_TOKEN", "secret");
      loginFn.mockResolvedValue({
        loginState: LoginState.SUCCESS,
        data: { sessionToken: "tok" },
      });
      getMemberTokensForDirectLogin.mockRejectedValue(new Error("exchange-boom"));

      const { POST } = await import("@/app/api/auth/login/route");
      const res = await POST(
        makeReq({ email: "a@b.com", password: "pw" }, { "x-debug-token": "secret" }) as never,
      );
      const body = (await res.json()) as { diag: { err: { message: string } } };
      expect(body.diag.err.message).toBe("exchange-boom");
    });
  });
});
