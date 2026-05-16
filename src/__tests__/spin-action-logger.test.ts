import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// cfw-logger migration: the spin action's fire-and-forget
// recordSpinGrant call routes its rejection through logError.
const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

// Cookie store stub — the spin action reads a cooldown cookie before it
// awards a prize. Empty store = no cooldown = action proceeds and fires
// the Velo recordSpinGrant POST (which is where logError lives).
const cookieStore = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string) => {
      cookieStore.set(name, { value });
    },
  }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  cookieStore.clear();
  logErrorMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // pickPrize uses Math.random — index 0 of the weighted array is the
  // 5off prize (not 'nomatch'), so 0 deterministically takes the branch
  // that fires the recordSpinGrant POST + the logError catch we want
  // to exercise.
  vi.spyOn(Math, "random").mockReturnValue(0);
  process.env.WIX_VELO_SITE_URL = "https://velo.example.com";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.WIX_VELO_SITE_URL;
});

describe("spinWheel — recordSpinGrant fire-and-forget logError", () => {
  it("calls logError when the Velo POST rejects", async () => {
    const fetchErr = new Error("velo unreachable");
    fetchMock.mockRejectedValue(fetchErr);
    const { spinWheel } = await import("@/app/actions/spin");
    const result = await spinWheel({ status: "idle" });
    // The action returns success even on Velo failure (fire-and-forget).
    expect(result.status).toBe("success");
    // Give the fire-and-forget promise a microtask to settle.
    await new Promise((r) => setTimeout(r, 0));
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });

  it("tags logError with scope='spin' and message='recordSpinGrant failed (non-fatal)'", async () => {
    fetchMock.mockRejectedValue(new Error("velo unreachable"));
    const { spinWheel } = await import("@/app/actions/spin");
    await spinWheel({ status: "idle" });
    await new Promise((r) => setTimeout(r, 0));
    expect(logErrorMock).toHaveBeenCalledWith(
      "spin",
      "recordSpinGrant failed (non-fatal)",
      expect.anything(),
    );
  });

  it("passes the caught Error instance directly to logError (preserves stack)", async () => {
    const err = new Error("velo unreachable");
    fetchMock.mockRejectedValue(err);
    const { spinWheel } = await import("@/app/actions/spin");
    await spinWheel({ status: "idle" });
    await new Promise((r) => setTimeout(r, 0));
    const [, , payload] = logErrorMock.mock.calls[0]!;
    expect(payload).toBe(err);
  });
});
