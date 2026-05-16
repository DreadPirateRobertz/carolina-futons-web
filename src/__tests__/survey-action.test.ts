// cfw-grj: coverage for src/app/actions/survey.ts +
// src/app/survey/survey-state.ts. submitSurvey is the only NPS
// endpoint hitting Velo's submitSurvey HTTP function. Risks pinned:
// score-validation off-by-one (0 OR 10 must pass; -1 OR 11 must
// reject), missing-env-var swallowed silently (NPS data loss),
// non-2xx response treated as success, network throw crashing the
// action instead of returning error state.

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

// cfw-7kzt: survey.ts catches now route through logError → Sentry.
// Mock @sentry/nextjs so the runner doesn't ship events AND the new
// logError-integration describe below can assert (scope, op) tags.
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

import { submitSurvey } from "@/app/actions/survey";
import { initialSurveyActionState } from "@/app/survey/survey-state";

const fetchMock = vi.fn<typeof fetch>();
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  consoleError.mockClear();
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
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

const IDLE = { status: "idle" } as const;

describe("initialSurveyActionState", () => {
  it("mounts in 'idle' status (regression guard against pre-error state)", () => {
    expect(initialSurveyActionState.status).toBe("idle");
  });

  it("idle variant has ONLY { status } (no stale error fields)", () => {
    expect(Object.keys(initialSurveyActionState)).toEqual(["status"]);
  });
});

describe("submitSurvey — score validation", () => {
  it.each([
    ["min boundary (0)", "0"],
    ["mid (5)", "5"],
    ["max boundary (10)", "10"],
  ])("accepts %s and reaches the fetch path", async (_label, score) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await submitSurvey(IDLE, fd({ score }));

    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["below range", "-1"],
    ["above range", "11"],
    ["non-numeric", "foo"],
    ["empty", ""],
  ])("rejects %s with 'choose a score from 0 to 10'", async (_label, score) => {
    const result = await submitSurvey(IDLE, fd({ score }));

    expect(result).toEqual({
      status: "error",
      error: "Please choose a score from 0 to 10.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parseInt-rounds float input ('5.5' → 5) — float is technically accepted (not validated, document the actual behaviour)", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await submitSurvey(IDLE, fd({ score: "5.5" }));

    expect(result.status).toBe("success");
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init?.body as string).score).toBe(5);
  });
});

describe("submitSurvey — WIX_VELO_SITE_URL handling", () => {
  it("returns generic error AND logs when WIX_VELO_SITE_URL is unset", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "");

    const result = await submitSurvey(IDLE, fd({ score: "8" }));

    expect(result).toEqual({
      status: "error",
      error: "Couldn't save your response — please try again shortly.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[survey] WIX_VELO_SITE_URL not set",
    );
  });

  it("strips trailing slash from base URL before appending /_functions/submitSurvey", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "https://www.carolinafutons.com/");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await submitSurvey(IDLE, fd({ score: "8" }));

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://www.carolinafutons.com/_functions/submitSurvey");
  });
});

describe("submitSurvey — fetch contract", () => {
  it("POSTs JSON body { score, comments, orderId } with content-type header", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await submitSurvey(
      IDLE,
      fd({ score: "9", comments: "Great service", orderId: "ord-123" }),
    );

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      score: 9,
      comments: "Great service",
      orderId: "ord-123",
    });
  });

  it("trims whitespace from comments + orderId before sending", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await submitSurvey(
      IDLE,
      fd({ score: "7", comments: "  trimmed  ", orderId: "  ord-1  " }),
    );

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init?.body as string);
    expect(body.comments).toBe("trimmed");
    expect(body.orderId).toBe("ord-1");
  });

  it("missing comments + orderId default to empty strings (not undefined)", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await submitSurvey(IDLE, fd({ score: "5" }));

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init?.body as string);
    expect(body.comments).toBe("");
    expect(body.orderId).toBe("");
  });

  it("disables Next fetch cache (no-store) — survey responses must POST every time", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await submitSurvey(IDLE, fd({ score: "5" }));

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.cache).toBe("no-store");
  });

  it("attaches an AbortSignal so the fetch can time out", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await submitSurvey(IDLE, fd({ score: "5" }));

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.signal).toBeDefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("submitSurvey — response handling", () => {
  it("200 response → { status: 'success' }", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await submitSurvey(IDLE, fd({ score: "8" }));

    expect(result).toEqual({ status: "success" });
  });

  it.each([400, 401, 403, 404, 500, 502, 503])(
    "%d response → generic error + log",
    async (status) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));

      const result = await submitSurvey(IDLE, fd({ score: "8" }));

      expect(result).toEqual({
        status: "error",
        error: "Couldn't save your response — please try again shortly.",
      });
      // cfw-7kzt: logError formats as `[scope] message`, err, extra.
      // With err=undefined and extra={status}, console.error receives
      // ("[survey] Velo non-2xx", undefined, { status }). Old assertion
      // was `("[survey] Velo responded", status)` — the migration
      // moves status into extra and renames the message.
      expect(consoleError).toHaveBeenCalledWith(
        "[survey] Velo non-2xx",
        undefined,
        { status },
      );
    },
  );

  it("fetch rejects (network / timeout) → generic error + log", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const result = await submitSurvey(IDLE, fd({ score: "8" }));

    expect(result).toEqual({
      status: "error",
      error: "Couldn't save your response — please try again shortly.",
    });
    // cfw-7kzt: logError drops the trailing colon ("fetch failed:" →
    // "fetch failed"). Format is `[scope] message`, err.
    expect(consoleError).toHaveBeenCalledWith(
      "[survey] fetch failed",
      expect.any(TypeError),
    );
  });
});

// cfw-7kzt: pin logError integration on all three migrated catches.
// NPS data loss is a P1 operational concern — a survey-submit Velo
// outage that silently swallows responses (the user sees the generic
// error, retries, and the second attempt also fails) was previously
// invisible to ops. The Sentry capture now makes it actionable.
describe("submitSurvey — logError integration", () => {
  it("env-missing branch → captures scope='survey' + op='WIX_VELO_SITE_URL not set' + flush(2000) (no err, no extra)", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "");

    await submitSurvey(IDLE, fd({ score: "8" }));

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    // No err passed → helper synthesizes `Error('[survey] WIX_VELO_SITE_URL not set')`.
    expect(reportedErr).toBeInstanceOf(Error);
    expect((reportedErr as Error).message).toContain(
      "WIX_VELO_SITE_URL not set",
    );
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "survey",
      op: "WIX_VELO_SITE_URL not set",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("non-2xx branch → captures scope='survey' + op='Velo non-2xx' + extra={status}", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await submitSurvey(IDLE, fd({ score: "8" }));

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [, opts] = sentryCaptureException.mock.calls[0]!;
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "survey",
      op: "Velo non-2xx",
    });
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      status: 503,
    });
  });

  it("fetch-throw branch → captures scope='survey' + op='fetch failed' with the original err", async () => {
    const thrown = new TypeError("fetch failed");
    fetchMock.mockRejectedValueOnce(thrown);

    await submitSurvey(IDLE, fd({ score: "8" }));

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "survey",
      op: "fetch failed",
    });
  });

  it("happy path (200) does NOT call Sentry — keeps signal-to-noise high", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await submitSurvey(IDLE, fd({ score: "8" }));

    expect(result).toEqual({ status: "success" });
    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("validation-error short-circuit (bad score) does NOT call Sentry — that's user input, not an outage", async () => {
    const result = await submitSurvey(IDLE, fd({ score: "-1" }));

    expect(result.status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
