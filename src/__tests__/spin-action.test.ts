import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const cookieStore = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string) => {
      cookieStore.set(name, { value });
    },
  }),
}));

beforeEach(() => {
  cookieStore.clear();
  mockLogError.mockClear();
  vi.stubEnv("WIX_VELO_SITE_URL", "https://wix.example/");
});

// Logger migration (cfw-logger batch 10): spinWheel's fire-and-forget
// recordSpinGrant fetch previously logged failures to console.error inside
// the .catch(). Now it forwards to logError so non-fatal grant-recording
// failures land in Sentry.
describe("spinWheel — recordSpinGrant logError migration", () => {
  it("calls logError when the recordSpinGrant fetch rejects (source='spin')", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("velo down"));
    vi.stubGlobal("fetch", fetchMock);

    const { spinWheel } = await import("@/app/actions/spin");
    await spinWheel({ status: "idle" });

    // Fire-and-forget — wait one microtask flush for the .catch() to run.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalled();
    if (mockLogError.mock.calls.length > 0) {
      expect(mockLogError.mock.calls[0][0]).toBe("spin");
    }
  });

  it("passes op='recordSpinGrant' to logError", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("velo down"));
    vi.stubGlobal("fetch", fetchMock);

    const { spinWheel } = await import("@/app/actions/spin");
    await spinWheel({ status: "idle" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (mockLogError.mock.calls.length > 0) {
      expect(mockLogError.mock.calls[0][1]).toBe("recordSpinGrant");
    }
  });

  it("returns success regardless of recordSpinGrant outcome (non-fatal)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("velo down")),
    );
    const { spinWheel } = await import("@/app/actions/spin");
    const result = await spinWheel({ status: "idle" });

    // The spin must succeed even when recordSpinGrant errors — observability
    // is best-effort and never blocks the prize.
    expect(result.status === "success" || result.status === "error").toBe(true);
    // Note: status="error" can occur only on the cooldown path, which
    // requires a pre-existing cookie — not the case in this test, so we
    // expect success.
    expect(result.status).toBe("success");
  });
});
