// cfw-mbx0: contract tests for spinWheel's recordSpinGrant logger
// migration. Three cases pin the fire-and-forget behaviour:
//   1. Happy spin (no fetch failure) — does NOT call logError
//   2. Velo fetch rejects — logError fires with { prizeId } in extras,
//      but the action still returns success
//   3. Velo not configured (no WIX_VELO_SITE_URL) — skips fetch, no
//      logError

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { SpinActionState } from "@/app/spin/spin-state";

const cookieStore = new Map<string, { value: string }>();
const cookieMock = {
  get: (name: string) => cookieStore.get(name),
  set: (name: string, value: string) => {
    cookieStore.set(name, { value });
  },
};
vi.mock("next/headers", () => ({
  cookies: async () => cookieMock,
}));

const mockLogError = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

// Stable prize selection so each test knows what was picked. spin.ts only
// fires the fetch for non-"nomatch" prizes, so forcing Math.random() to 0
// picks SPIN_PRIZES[0] (5off) — guaranteed to trigger the fetch path.
let mathRandomSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  cookieStore.clear();
  mockLogError.mockReset();
  vi.unstubAllGlobals();
  process.env.WIX_VELO_SITE_URL = "https://velo.example.com";
  mathRandomSpy = vi.spyOn(Math, "random").mockReturnValue(0); // → 5off prize
});

afterEach(() => {
  mathRandomSpy.mockRestore();
});

// Flush microtasks so the fire-and-forget .catch chain runs before
// assertions. Two ticks: one for the fetch promise to settle, one for
// the .catch handler to run.
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("spinWheel — recordSpinGrant (cfw-mbx0)", () => {
  it("happy path: fetch resolves, spinWheel returns success, no logError call", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { spinWheel } = await import("@/app/actions/spin");
    const initial = { status: "idle" } as unknown as SpinActionState;
    const result = await spinWheel(initial);

    expect(result.status).toBe("success");
    await flushMicrotasks();
    expect(fetchMock).toHaveBeenCalled();
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("Velo fetch rejects: logError called with prizeId in extras, spin still succeeds", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("velo down"));
    vi.stubGlobal("fetch", fetchMock);
    const { spinWheel } = await import("@/app/actions/spin");
    const initial = { status: "idle" } as unknown as SpinActionState;
    const result = await spinWheel(initial);

    // User-facing: prize awarded regardless. The Velo failure is opaque
    // to the visitor — that's the whole point of fire-and-forget.
    expect(result.status).toBe("success");
    await flushMicrotasks();
    expect(mockLogError).toHaveBeenCalledWith(
      "spin",
      "recordSpinGrant",
      expect.any(Error),
      expect.objectContaining({ prizeId: expect.any(String) }),
    );
  });

  it("Velo not configured (WIX_VELO_SITE_URL empty): no fetch, no logError", async () => {
    delete process.env.WIX_VELO_SITE_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { spinWheel } = await import("@/app/actions/spin");
    const initial = { status: "idle" } as unknown as SpinActionState;
    const result = await spinWheel(initial);

    expect(result.status).toBe("success");
    await flushMicrotasks();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockLogError).not.toHaveBeenCalled();
  });
});
