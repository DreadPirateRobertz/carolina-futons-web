// cfw-2bmf: coverage for src/app/actions/notify-me.ts. Validates the
// migration from console.error → logError on the three diagnostic paths:
// missing env var, non-2xx Velo response, fetch exception. Each path
// must (a) return the user-visible generic error, (b) capture the right
// Sentry event with scope='notify-me' + the documented op string, and
// (c) await the flush so Vercel doesn't kill the lambda before the
// HTTPS POST completes.

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

import { submitNotifyMe, type NotifyMeState } from "@/app/actions/notify-me";

const fetchMock = vi.fn<typeof fetch>();
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

const IDLE: NotifyMeState = { status: "idle" };

beforeEach(() => {
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  consoleError.mockClear();
  vi.stubEnv("WIX_VELO_SITE_URL", "https://www.carolinafutons.com");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

describe("submitNotifyMe — logError integration on missing env var", () => {
  it("captures with op='WIX_VELO_SITE_URL not set' (synthesised Error since no thrown value)", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "");

    const result = await submitNotifyMe(
      IDLE,
      fd({ email: "b@example.com", productId: "p-1" }),
    );

    expect(result).toEqual({
      status: "error",
      error: "Could not save — please try again shortly.",
    });
    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [, opts] = sentryCaptureException.mock.calls[0]!;
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "notify-me",
      op: "WIX_VELO_SITE_URL not set",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });
});

describe("submitNotifyMe — logError integration on non-2xx Velo response", () => {
  it.each([400, 403, 500, 502, 503])(
    "%d response → captures op='Velo responded' with status in extra",
    async (status) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));

      const result = await submitNotifyMe(
        IDLE,
        fd({ email: "b@example.com", productId: "p-1" }),
      );

      expect(result.status).toBe("error");

      // Filter Sentry calls to just this status code, since beforeEach
      // resets but the it.each loop happens sequentially.
      const matching = sentryCaptureException.mock.calls.find(
        ([, opts]) =>
          (opts as { extra?: { status?: number } }).extra?.status === status,
      );
      expect(matching).toBeDefined();
      const [, opts] = matching!;
      expect((opts as { tags: Record<string, string> }).tags).toEqual({
        scope: "notify-me",
        op: "Velo responded",
      });
      expect((opts as { extra: { status: number } }).extra).toEqual({ status });
    },
  );
});

describe("submitNotifyMe — logError integration on fetch throw", () => {
  it("captures the thrown Error with op='fetch failed' (Vercel serverless flush awaited)", async () => {
    const thrown = new TypeError("network down");
    fetchMock.mockRejectedValueOnce(thrown);

    const result = await submitNotifyMe(
      IDLE,
      fd({ email: "b@example.com", productId: "p-1" }),
    );

    expect(result).toEqual({
      status: "error",
      error: "Could not save — please try again shortly.",
    });

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "notify-me",
      op: "fetch failed",
    });
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });
});

describe("submitNotifyMe — happy path does NOT call Sentry (no false-positive noise)", () => {
  it("200 response: returns success, no logError invocation", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await submitNotifyMe(
      IDLE,
      fd({ email: "b@example.com", productId: "p-1" }),
    );

    expect(result).toEqual({ status: "success" });
    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("validation failures (missing email / bad format / missing productId) do NOT call Sentry", async () => {
    // These are user errors, not operational failures — Sentry would
    // create noise that drowns out real outage signals.
    const cases = [
      fd({ email: "", productId: "p-1" }), // missing email
      fd({ email: "bademail", productId: "p-1" }), // bad format
      fd({ email: "b@example.com", productId: "" }), // missing productId
    ];
    for (const formData of cases) {
      const result = await submitNotifyMe(IDLE, formData);
      expect(result.status).toBe("error");
    }
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
