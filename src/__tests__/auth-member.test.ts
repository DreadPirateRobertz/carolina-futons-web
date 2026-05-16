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

// cfw-logger migration: getMemberSession's catch routes through logError.
const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
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
    const mod = await import("@/lib/auth/member");
    expect(await mod.getMemberSession()).toBeNull();
    // Observability now routes through logError (cfw-logger migration).
    expect(logErrorMock).toHaveBeenCalled();
  });
});

// cfw-logger migration: getMemberSession's catch branch routes through
// logError("auth/member", "getMemberSession: resolveMemberId failed", err).
describe("getMemberSession — logError observability", () => {
  it("calls logError when resolveMemberId throws", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    getCurrentMember.mockRejectedValueOnce(new Error("401"));
    const mod = await import("@/lib/auth/member");
    await mod.getMemberSession();
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });

  it("tags logError with scope='auth/member' + resolveMemberId message", async () => {
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    getCurrentMember.mockRejectedValueOnce(new Error("401"));
    const mod = await import("@/lib/auth/member");
    await mod.getMemberSession();
    expect(logErrorMock).toHaveBeenCalledWith(
      "auth/member",
      "getMemberSession: resolveMemberId failed",
      expect.anything(),
    );
  });

  it("passes the caught Error instance directly to logError (preserves stack)", async () => {
    const err = new Error("401");
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    getCurrentMember.mockRejectedValueOnce(err);
    const mod = await import("@/lib/auth/member");
    await mod.getMemberSession();
    const [, , payload] = logErrorMock.mock.calls[0]!;
    expect(payload).toBe(err);
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
