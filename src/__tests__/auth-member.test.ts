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
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    getCurrentMember.mockRejectedValueOnce(new Error("401"));
    const mod = await import("@/lib/auth/member");
    expect(await mod.getMemberSession()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "[getMemberSession] resolveMemberId threw:",
      expect.any(Error),
    );
    warnSpy.mockRestore();
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
