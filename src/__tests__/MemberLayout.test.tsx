import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock redirect so it throws a catchable error rather than crashing the test
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (p: string) => redirectMock(p) }));

// Mock getMemberSession — controlled per test
const getMemberSessionMock = vi.fn<() => Promise<{ memberId: string; tokens: unknown; accessToken: string } | null>>();
vi.mock("@/lib/auth/member", () => ({ getMemberSession: () => getMemberSessionMock() }));

import MemberLayout from "@/app/(member)/layout";

const CHILD = <span data-testid="child">content</span>;

beforeEach(() => {
  redirectMock.mockClear();
  getMemberSessionMock.mockClear();
});

describe("MemberLayout — auth guard (cf-w5ks)", () => {
  it("redirects unauthenticated users to /account?next=/dashboard", async () => {
    getMemberSessionMock.mockResolvedValue(null);
    await expect(
      MemberLayout({ children: CHILD }),
    ).rejects.toThrow("REDIRECT:/account?next=/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/account?next=/dashboard");
  });

  it("does NOT redirect when session is valid", async () => {
    getMemberSessionMock.mockResolvedValue({
      memberId: "m-1",
      tokens: {},
      accessToken: "tok",
    });
    await expect(MemberLayout({ children: CHILD })).resolves.not.toThrow();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does NOT redirect to /?auth_required=1 (regression guard for cf-w5ks)", async () => {
    getMemberSessionMock.mockResolvedValue(null);
    try {
      await MemberLayout({ children: CHILD });
    } catch {
      // expected
    }
    const calls = redirectMock.mock.calls.map(([p]) => p);
    expect(calls).not.toContain("/?auth_required=1");
    expect(calls.some((p) => p.startsWith("/account?next="))).toBe(true);
  });
});
