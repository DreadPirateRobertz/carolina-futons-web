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

// cfw-d49k: upstream-logout-failure catch now routes through
// logError → Sentry. Mock @sentry/nextjs so the runner doesn't ship
// events AND the new logError-integration test below can assert
// (scope, op) tags.
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
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

// cfw-d49k: pin logError integration on upstream-logout-failure.
// Sign-out failure is a low-stakes diagnostic (cookie is already
// cleared, owner is signed out client-side) but persistent upstream
// logout failures could indicate a Wix auth incident worth paging on.
describe("POST /api/admin/sign-out — logError integration on upstream logout throw", () => {
  it("captures scope='admin/sign-out' + op='upstream logout failed' + flush(2000) — redirect still completes", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    const thrown = new Error("Wix logout API 502");
    logoutSdk.mockRejectedValueOnce(thrown);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/admin/sign-out/route");
    const res = await POST(
      makeReq("https://test.local/api/admin/sign-out") as never,
    );

    // The cookie-clear + 303 redirect contract holds even on upstream
    // failure — owner is NOT stranded in owner mode.
    expect(res.status).toBe(303);
    expect(cookieStore.has("wix-session")).toBe(false);

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "admin/sign-out",
      op: "upstream logout failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryFlush).toHaveBeenCalledWith(2000);
    consoleSpy.mockRestore();
  });

  it("happy logout (Wix accepts) does NOT call Sentry", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });

    const { POST } = await import("@/app/api/admin/sign-out/route");
    await POST(makeReq("https://test.local/api/admin/sign-out") as never);

    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("no-session sign-out (visitor) does NOT call Sentry — short-circuit before upstream call", async () => {
    const { POST } = await import("@/app/api/admin/sign-out/route");
    await POST(makeReq("https://test.local/api/admin/sign-out") as never);

    expect(logoutSdk).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
