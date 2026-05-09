import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

// cfw-wef (cfw-6qd.1): the /admin sign-out route is a thin wrapper around
// the existing DELETE /api/auth/session — exists so the layout's plain-form
// sign-out button works without client JS. Tests pin: cookie clearing,
// upstream logout call, redirect to "/", graceful handling of upstream
// failures (cookie still cleared).

const cookieStore = new Map<string, { value: string }>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
    delete: (arg: string | { name: string; path?: string }) => {
      cookieStore.delete(typeof arg === "string" ? arg : arg.name);
    },
  }),
}));

const logoutSdk = vi.fn(async () => ({ logoutUrl: "https://wix.local/logout" }));

vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({ auth: { logout: logoutSdk } }),
}));

const memberTokens: Tokens = {
  accessToken: { value: "access-m", expiresAt: 1_780_000_000 },
  refreshToken: { value: "refresh-m", role: "member" as Tokens["refreshToken"]["role"] },
};

beforeEach(() => {
  cookieStore.clear();
  vi.clearAllMocks();
});

const makeReq = (url: string) => new Request(url, { method: "POST" });

describe("POST /api/admin/sign-out", () => {
  it("redirects to / with 303 (form-friendly POST→GET)", async () => {
    const { POST } = await import("@/app/api/admin/sign-out/route");
    const res = await POST(
      makeReq("https://test.local/api/admin/sign-out") as never,
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://test.local/");
  });

  it("clears the wix-session cookie and the OAuth data cookie", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    cookieStore.set("wix-oauth-data", { value: '{"foo":"bar"}' });
    const { POST } = await import("@/app/api/admin/sign-out/route");
    await POST(makeReq("https://test.local/api/admin/sign-out") as never);
    expect(cookieStore.has("wix-session")).toBe(false);
    expect(cookieStore.has("wix-oauth-data")).toBe(false);
  });

  it("calls Wix client.auth.logout when a session cookie was present", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    const { POST } = await import("@/app/api/admin/sign-out/route");
    await POST(makeReq("https://test.local/api/admin/sign-out") as never);
    expect(logoutSdk).toHaveBeenCalledTimes(1);
    expect(logoutSdk).toHaveBeenCalledWith("https://test.local/");
  });

  it("does NOT call upstream logout when no session was present (visitor)", async () => {
    const { POST } = await import("@/app/api/admin/sign-out/route");
    await POST(makeReq("https://test.local/api/admin/sign-out") as never);
    expect(logoutSdk).not.toHaveBeenCalled();
  });

  it("still clears the cookie and redirects when upstream logout throws", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    logoutSdk.mockRejectedValueOnce(new Error("Wix down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/admin/sign-out/route");
    const res = await POST(
      makeReq("https://test.local/api/admin/sign-out") as never,
    );
    expect(res.status).toBe(303);
    expect(cookieStore.has("wix-session")).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
