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

import { submitSurvey } from "@/app/actions/survey";
import { initialSurveyActionState } from "@/app/survey/survey-state";

const fetchMock = vi.fn<typeof fetch>();
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
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
      expect(consoleError).toHaveBeenCalledWith(
        "[survey] Velo responded with non-2xx",
        status,
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
    expect(consoleError).toHaveBeenCalledWith(
      "[survey] fetch failed",
      expect.any(TypeError),
    );
  });
});

// Pins the logError migration of the 3 survey action error paths.
// Asserts on the console.error sink because logError forwards there in
// every env; the Sentry forwarder is prod-only and unit-tested in
// log.test.ts.
describe("submitSurvey — logError migration", () => {
  it("emits '[survey] WIX_VELO_SITE_URL not set' as a single-arg log when env is unset", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "");
    await submitSurvey(IDLE, fd({ score: "8" }));
    expect(consoleError.mock.calls[0]![0]).toBe(
      "[survey] WIX_VELO_SITE_URL not set",
    );
    // logError with no err is called single-arg — guards against an
    // accidental trailing undefined slot.
    expect(consoleError.mock.calls[0]!.length).toBe(1);
  });

  it("emits '[survey] Velo responded with non-2xx' with the numeric status as the second arg on non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await submitSurvey(IDLE, fd({ score: "8" }));
    expect(consoleError.mock.calls[0]![0]).toBe(
      "[survey] Velo responded with non-2xx",
    );
    expect(consoleError.mock.calls[0]![1]).toBe(503);
  });

  it("emits '[survey] fetch failed' with the thrown err as the second arg on fetch reject", async () => {
    const thrown = new TypeError("fetch failed");
    fetchMock.mockRejectedValueOnce(thrown);
    await submitSurvey(IDLE, fd({ score: "8" }));
    expect(consoleError.mock.calls[0]![0]).toBe("[survey] fetch failed");
    expect(consoleError.mock.calls[0]![1]).toBe(thrown);
  });
});
