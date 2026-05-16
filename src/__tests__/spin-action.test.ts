// cfw-yklr: coverage for src/app/actions/spin.ts. Validates the
// migration from .catch console.error → .catch async logError, and
// confirms the recordSpinGrant call is fire-and-forget (no await on
// the fetch result, but the .catch now awaits logError internally
// before the catch's micro-task settles).

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

const cookieJar = new Map<string, { value: string }>();
const cookieSet = vi.fn(
  (
    name: string,
    value: string,
    _opts: Record<string, unknown>,
  ) => {
    cookieJar.set(name, { value });
  },
);
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: cookieSet,
  }),
}));

const fetchMock = vi.fn<typeof fetch>();
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

import { spinWheel } from "@/app/actions/spin";

const IDLE = { status: "idle" } as const;

beforeEach(() => {
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
  cookieJar.clear();
  cookieSet.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  consoleError.mockClear();
  vi.stubEnv("WIX_VELO_SITE_URL", "https://www.carolinafutons.com");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// pickPrize is randomised inside spinWheel; stub Math.random across the
// test so we land on a deterministic non-nomatch prize for assertions
// that depend on the fetch firing.
function forcePrize(roll: number) {
  vi.spyOn(Math, "random").mockReturnValue(roll);
}

describe("spinWheel — happy path fires recordSpinGrant", () => {
  it("returns success status + spins the wheel + writes cooldown cookie", async () => {
    forcePrize(0.0); // first weighted bucket
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await spinWheel(IDLE);

    expect(result.status).toBe("success");
    expect(cookieSet).toHaveBeenCalled();
    // Fire-and-forget: the fetch may resolve after the action returns,
    // so just verify the call was queued.
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("spinWheel — logError integration on recordSpinGrant catch", () => {
  it("captures with scope='spin' + op='recordSpinGrant failed (non-fatal)' when fetch rejects", async () => {
    forcePrize(0.0);
    const err = new Error("network down");
    fetchMock.mockRejectedValueOnce(err);

    const result = await spinWheel(IDLE);

    // Non-fatal: the spin still succeeds.
    expect(result.status).toBe("success");

    // The .catch fires in a micro-task after the await above. Drain
    // the queue so the Sentry mock observes the call.
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(err);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "spin",
      op: "recordSpinGrant failed (non-fatal)",
    });
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("happy path fetch (200) does NOT call Sentry", async () => {
    forcePrize(0.0);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await spinWheel(IDLE);
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("missing WIX_VELO_SITE_URL skips the fetch entirely (no logError + no Sentry)", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "");
    forcePrize(0.0);

    const result = await spinWheel(IDLE);
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(result.status).toBe("success");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("nomatch prize skips the fetch entirely (no recordSpinGrant call, no Sentry)", async () => {
    // pickPrize is weighted; nomatch has weight 2 in a 6-prize pool of
    // weights (2,1,1,1,1,1). Without inspecting the picker, force a
    // late roll value that lands on nomatch reliably across changes by
    // mocking Math.random to a high number — nomatch is the last entry.
    forcePrize(0.99);

    const result = await spinWheel(IDLE);
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.prize.id).toBe("nomatch");
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});

describe("spinWheel — cooldown enforcement (regression guard, no Sentry)", () => {
  it("returns error within the 24h cooldown window — no Sentry noise", async () => {
    // Cooldown cookie set to "just now".
    cookieJar.set("cf_spin_last", { value: String(Date.now()) });

    const result = await spinWheel(IDLE);

    expect(result.status).toBe("error");
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
