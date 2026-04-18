import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

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

const generateOAuthData = vi.fn(() => ({
  codeVerifier: "verifier-xyz",
  codeChallenge: "challenge-abc",
  state: "state-123",
  originalUri: "/account",
  redirectUri: "https://test.local/api/auth/session",
}));
const getAuthUrl = vi.fn(async () => ({ authUrl: "https://wix.local/auth?x=1" }));
const parseFromUrl = vi.fn(() => ({ code: "code-ok", state: "state-123" }));
const getMemberTokens = vi.fn<() => Promise<Tokens>>(async () => ({
  accessToken: { value: "access-new", expiresAt: 1_780_000_000 },
  refreshToken: { value: "refresh-new", role: "member" as Tokens["refreshToken"]["role"] },
}));
const logoutSdk = vi.fn(async () => ({ logoutUrl: "https://wix.local/logout" }));

vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({
    auth: { generateOAuthData, getAuthUrl, parseFromUrl, getMemberTokens, logout: logoutSdk },
  }),
}));

beforeEach(() => {
  cookieStore.clear();
  vi.clearAllMocks();
  vi.stubEnv("WIX_CLIENT_ID_HEADLESS", "test-client-id");
});

const makeReq = (url: string, init?: { body?: unknown; method?: string }) =>
  new Request(url, {
    method: init?.method ?? "POST",
    headers: { "content-type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

describe("POST /api/auth/session — initiate OAuth", () => {
  it("returns authUrl and stores oauthData cookie", async () => {
    const { POST } = await import("@/app/api/auth/session/route");
    const res = await POST(makeReq("https://test.local/api/auth/session", { body: { callbackUrl: "/account" } }) as never);
    const body = (await res.json()) as { authUrl: string };

    expect(body.authUrl).toBe("https://wix.local/auth?x=1");
    expect(cookieStore.has("wix-oauth-data")).toBe(true);
    expect(generateOAuthData).toHaveBeenCalledWith(
      "https://test.local/api/auth/session",
      "/account",
    );
  });

  it("rejects open-redirect callbackUrl — coerces to /", async () => {
    const { POST } = await import("@/app/api/auth/session/route");
    await POST(makeReq("https://test.local/api/auth/session", { body: { callbackUrl: "//evil.com" } }) as never);
    expect(generateOAuthData).toHaveBeenCalledWith(
      "https://test.local/api/auth/session",
      "/",
    );
  });

  it("tolerates missing body", async () => {
    const { POST } = await import("@/app/api/auth/session/route");
    const res = await POST(new Request("https://test.local/api/auth/session", { method: "POST" }) as never);
    expect(res.status).toBe(200);
    expect(generateOAuthData).toHaveBeenCalledWith(
      "https://test.local/api/auth/session",
      "/",
    );
  });
});

describe("GET /api/auth/session — OAuth callback", () => {
  const oauthData = {
    codeVerifier: "verifier-xyz",
    codeChallenge: "challenge-abc",
    state: "state-123",
    originalUri: "/account",
    redirectUri: "https://test.local/api/auth/session",
  };

  it("exchanges code for tokens, sets session cookie, redirects to originalUri", async () => {
    cookieStore.set("wix-oauth-data", { value: JSON.stringify(oauthData) });
    const { GET } = await import("@/app/api/auth/session/route");
    const res = await GET(
      new Request("https://test.local/api/auth/session?code=code-ok&state=state-123") as never,
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://test.local/account");
    expect(cookieStore.has("wix-session")).toBe(true);
    expect(cookieStore.has("wix-oauth-data")).toBe(false);
    expect(getMemberTokens).toHaveBeenCalledWith("code-ok", "state-123", oauthData);
  });

  it("redirects to /?auth_error=missing_state when no oauthData cookie", async () => {
    const { GET } = await import("@/app/api/auth/session/route");
    const res = await GET(
      new Request("https://test.local/api/auth/session?code=x&state=y") as never,
    );
    expect(res.headers.get("location")).toBe(
      "https://test.local/?auth_error=missing_state",
    );
    expect(cookieStore.has("wix-session")).toBe(false);
  });

  it("redirects with auth_error when parseFromUrl returns error", async () => {
    cookieStore.set("wix-oauth-data", { value: JSON.stringify(oauthData) });
    parseFromUrl.mockReturnValueOnce({ code: "", state: "", error: "access_denied" } as ReturnType<typeof parseFromUrl>);
    const { GET } = await import("@/app/api/auth/session/route");
    const res = await GET(
      new Request("https://test.local/api/auth/session?error=access_denied") as never,
    );
    expect(res.headers.get("location")).toBe(
      "https://test.local/?auth_error=access_denied",
    );
    expect(cookieStore.has("wix-oauth-data")).toBe(false);
  });

  it("redirects with bad_state when oauthData cookie is malformed JSON", async () => {
    cookieStore.set("wix-oauth-data", { value: "not-json{{{" });
    const { GET } = await import("@/app/api/auth/session/route");
    const res = await GET(
      new Request("https://test.local/api/auth/session?code=x&state=y") as never,
    );
    expect(res.headers.get("location")).toBe(
      "https://test.local/?auth_error=bad_state",
    );
  });
});

describe("DELETE /api/auth/session — logout", () => {
  it("clears session cookie + returns logoutUrl when logged in", async () => {
    const tokens: Tokens = {
      accessToken: { value: "a", expiresAt: 1_780_000_000 },
      refreshToken: { value: "r", role: "member" as Tokens["refreshToken"]["role"] },
    };
    cookieStore.set("wix-session", { value: JSON.stringify(tokens) });
    const { DELETE } = await import("@/app/api/auth/session/route");
    const res = await DELETE(
      new Request("https://test.local/api/auth/session", { method: "DELETE" }) as never,
    );
    const body = (await res.json()) as { ok: boolean; logoutUrl?: string };
    expect(body).toEqual({ ok: true, logoutUrl: "https://wix.local/logout" });
    expect(cookieStore.has("wix-session")).toBe(false);
    expect(logoutSdk).toHaveBeenCalledWith("https://test.local/");
  });

  it("returns ok:true without logoutUrl when not logged in", async () => {
    const { DELETE } = await import("@/app/api/auth/session/route");
    const res = await DELETE(
      new Request("https://test.local/api/auth/session", { method: "DELETE" }) as never,
    );
    const body = (await res.json()) as { ok: boolean; logoutUrl?: string };
    expect(body).toEqual({ ok: true });
    expect(logoutSdk).not.toHaveBeenCalled();
  });
});
