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

// cfw-437z: preferences.ts catches now route through logError →
// Sentry. Mock @sentry/nextjs so tests don't ship real events AND the
// new logError-integration describe below can assert on (scope, op)
// tags.
const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/auth/member", () => ({
  withMember: authMocks.withMember,
}));

vi.mock("@/lib/wix/velo-client", () => ({
  callVelo: veloMocks.callVelo,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentryMocks.captureException,
  flush: sentryMocks.flush,
}));

beforeEach(() => {
  veloMocks.callVelo.mockReset();
  sentryMocks.captureException.mockReset();
  sentryMocks.flush.mockReset().mockResolvedValue(true);
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

// cfw-437z: pin logError integration on both catches. Wix-side push-
// preference outages MUST surface to Sentry — a member who toggled
// marketing OFF and gets a silent "Could not save" with no operational
// signal is the exact compliance footgun this migration prevents.
describe("preferences — logError integration", () => {
  it("getMyPushPreferences throw → captures with scope='preferences' + op='getMyPushPreferences failed' + flush(2000)", async () => {
    const err = new Error("rpc 1");
    veloMocks.callVelo.mockRejectedValueOnce(err);
    const errSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { getMyPushPreferences } = await import(
      "@/app/actions/preferences"
    );

    await getMyPushPreferences();

    const matching = sentryMocks.captureException.mock.calls.find(
      ([, opts]) =>
        (opts as { tags?: { op?: string } }).tags?.op ===
        "getMyPushPreferences failed",
    );
    expect(matching).toBeDefined();
    const [reportedErr, opts] = matching!;
    expect(reportedErr).toBe(err);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "preferences",
      op: "getMyPushPreferences failed",
    });
    expect(sentryMocks.flush).toHaveBeenCalledWith(2000);
    errSpy.mockRestore();
  });

  it("managePushPreferences throw → captures with scope='preferences' + op='managePushPreferences failed'", async () => {
    const err = new Error("rpc 2");
    veloMocks.callVelo.mockRejectedValueOnce(err);
    const errSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { managePushPreferences } = await import(
      "@/app/actions/preferences"
    );

    await managePushPreferences({ marketing: false });

    const matching = sentryMocks.captureException.mock.calls.find(
      ([, opts]) =>
        (opts as { tags?: { op?: string } }).tags?.op ===
        "managePushPreferences failed",
    );
    expect(matching).toBeDefined();
    const [reportedErr] = matching!;
    expect(reportedErr).toBe(err);
    errSpy.mockRestore();
  });

  it("happy path on either action does NOT call Sentry — keeps signal-to-noise high", async () => {
    veloMocks.callVelo.mockResolvedValueOnce({
      success: true,
      prefs: { marketing: true },
    });
    const { getMyPushPreferences } = await import(
      "@/app/actions/preferences"
    );
    await getMyPushPreferences();

    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });
});
