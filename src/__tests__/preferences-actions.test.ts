import { describe, it, expect, vi, beforeEach } from "vitest";

const authMocks = vi.hoisted(() => ({
  withMember: vi.fn(
    async (fn: (s: { accessToken: string; memberId: string }) => unknown) =>
      fn({ accessToken: "tok", memberId: "M-1" }),
  ),
}));

const veloMocks = vi.hoisted(() => ({
  callVelo: vi.fn(),
}));

vi.mock("@/lib/auth/member", () => ({
  withMember: authMocks.withMember,
}));

vi.mock("@/lib/wix/velo-client", () => ({
  callVelo: veloMocks.callVelo,
}));

beforeEach(() => {
  veloMocks.callVelo.mockReset();
});

describe("getMyPushPreferences", () => {
  it("forwards to pushNotificationService/getMyPushPreferences with no args", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({ success: true, prefs: {} });
    const { getMyPushPreferences } = await import("@/app/actions/preferences");
    await getMyPushPreferences();
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "pushNotificationService/getMyPushPreferences",
      args: [],
      accessToken: "tok",
    });
  });

  it("merges defaults so callers always get every category", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({
      success: true,
      prefs: { marketing: false },
    });
    const { getMyPushPreferences } = await import("@/app/actions/preferences");
    const result = await getMyPushPreferences();
    expect(result).toEqual({
      success: true,
      prefs: {
        challenges: true,
        streak: true,
        marketing: false,
        tier: true,
        badges: true,
      },
    });
  });

  it("returns success:false with the velo error message", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({
      success: false,
      error: "unauthenticated",
    });
    const { getMyPushPreferences } = await import("@/app/actions/preferences");
    const result = await getMyPushPreferences();
    expect(result).toEqual({ success: false, error: "unauthenticated" });
  });

  it("returns success:false on a thrown velo error without rethrowing", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getMyPushPreferences } = await import("@/app/actions/preferences");
    const result = await getMyPushPreferences();
    expect(result).toEqual({
      success: false,
      error: "Could not load preferences.",
    });
    errSpy.mockRestore();
  });
});

describe("managePushPreferences", () => {
  it("forwards a cleaned prefs object as a single positional arg", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({
      success: true,
      prefs: { marketing: false },
    });
    const { managePushPreferences } = await import(
      "@/app/actions/preferences"
    );
    await managePushPreferences({
      marketing: false,
      challenges: true,
      streak: false,
    });
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "pushNotificationService/managePushPreferences",
      args: [{ marketing: false, challenges: true, streak: false }],
      accessToken: "tok",
    });
  });

  it("strips unknown / non-boolean keys before forwarding", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({ success: true, prefs: {} });
    const { managePushPreferences } = await import(
      "@/app/actions/preferences"
    );
    // Cast to bypass the typed signature so we exercise the runtime guard
    // that drops unknown keys + non-boolean values from a stale or buggy
    // client.
    await managePushPreferences({
      marketing: false,
      bogus: true,
      challenges: "yes",
    } as unknown as Parameters<typeof managePushPreferences>[0]);
    expect(veloMocks.callVelo).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [{ marketing: false }],
      }),
    );
  });

  it("returns success:false with the velo error message", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({
      success: false,
      error: "unknown category: nonsense",
    });
    const { managePushPreferences } = await import(
      "@/app/actions/preferences"
    );
    const result = await managePushPreferences({ marketing: false });
    expect(result).toEqual({
      success: false,
      error: "unknown category: nonsense",
    });
  });

  it("returns success:false on a thrown velo error without rethrowing", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("rpc fail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { managePushPreferences } = await import(
      "@/app/actions/preferences"
    );
    const result = await managePushPreferences({ marketing: false });
    expect(result).toEqual({
      success: false,
      error: "Could not save preferences.",
    });
    errSpy.mockRestore();
  });
});
