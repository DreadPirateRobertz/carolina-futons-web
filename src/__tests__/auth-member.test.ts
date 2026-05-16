import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

const cookieStore = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
  }),
}));

const redirectMock = vi.fn<(path: string) => never>((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (p: string) => redirectMock(p) }));

const getCurrentMember = vi.fn(async () => ({ member: { _id: "member-42" } }));
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({ members: { getCurrentMember } }),
}));

// cfw-92b7: getMemberSession's resolveMemberId catch now routes
// through logError (Sentry.captureException + flush). Mock @sentry/nextjs
// so the runner doesn't ship real events AND the new logError-integration
// tests below can assert on the (scope, op) tag pair.
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
const visitorTokens: Tokens = {
  accessToken: { value: "access-v", expiresAt: 1_780_000_000 },
  refreshToken: { value: "refresh-v", role: "visitor" as Tokens["refreshToken"]["role"] },
};

beforeEach(() => {
  cookieStore.clear();
  vi.clearAllMocks();
});

describe("getMemberSession", () => {
  it("returns null when no session cookie", async () => {
    const mod = await import("@/lib/auth/member");
    expect(await mod.getMemberSession()).toBeNull();
  });

  it("returns null when session carries visitor role (anonymous)", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(visitorTokens) });
    const mod = await import("@/lib/auth/member");
    expect(await mod.getMemberSession()).toBeNull();
    expect(getCurrentMember).not.toHaveBeenCalled();
  });

  it("returns session with memberId on member-role tokens", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    const mod = await import("@/lib/auth/member");
    const s = await mod.getMemberSession();
    expect(s?.memberId).toBe("member-42");
    expect(s?.accessToken).toBe("access-m");
  });

  it("returns null if getCurrentMember throws (token may be expired)", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    getCurrentMember.mockRejectedValueOnce(new Error("401"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mod = await import("@/lib/auth/member");
    expect(await mod.getMemberSession()).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[auth] getMemberSession"),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});

describe("withMember", () => {
  it("redirects to /api/auth/session when not logged in", async () => {
    const mod = await import("@/lib/auth/member");
    await expect(mod.withMember(async () => "nope")).rejects.toThrow(
      "REDIRECT:/api/auth/session",
    );
  });

  it("passes MemberSession to fn when logged in as member", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    const mod = await import("@/lib/auth/member");
    const result = await mod.withMember(async (m) => m.memberId);
    expect(result).toBe("member-42");
  });
});

// cfw-92b7: pin logError integration on getMemberSession's
// resolveMemberId catch. Token-expired errors are common (members'
// 14-day refresh tokens lapse routinely) so this should NOT spam
// Sentry — but a genuine outage (Wix members API down, network
// blip) MUST surface. Today's logError captures every catch — the
// test below documents that, and notes for follow-up that an
// errorClassifier might be worth adding later.
describe("getMemberSession — logError integration on Wix members.getCurrentMember outage", () => {
  it("captures with scope='auth' + op='getMemberSession: resolveMemberId failed' + flush awaited", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    const err = new Error("Wix members API 502");
    getCurrentMember.mockRejectedValueOnce(err);
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const mod = await import("@/lib/auth/member");
    const result = await mod.getMemberSession();

    expect(result).toBeNull();
    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(err);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "auth",
      op: "getMemberSession: resolveMemberId failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryFlush).toHaveBeenCalledWith(2000);

    consoleSpy.mockRestore();
  });

  it("happy path (Wix returns member) does NOT call Sentry", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });

    const mod = await import("@/lib/auth/member");
    const result = await mod.getMemberSession();

    expect(result?.memberId).toBe("member-42");
    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("no-cookie + visitor-role paths do NOT call Sentry (short-circuit before the catch)", async () => {
    const mod = await import("@/lib/auth/member");

    // no cookie
    expect(await mod.getMemberSession()).toBeNull();

    // visitor cookie
    cookieStore.set("wix-session", { value: JSON.stringify(visitorTokens) });
    expect(await mod.getMemberSession()).toBeNull();

    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
