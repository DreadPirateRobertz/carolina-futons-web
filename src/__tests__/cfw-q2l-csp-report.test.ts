// cfw-q2l: tests for the CSP-violation report endpoint.
// cfw-1p2r: migrated console.warn → logWarn. Violations now surface
// to Sentry at level='warning' alongside the console.warn output.
// Assertions look at the structured shape logWarn produces:
//   console.warn("[csp] violation", undefined, { source, directive,
//     blocked, docUri })
// And the Sentry mock captures the same {source, directive, blocked,
// docUri} in extra so the dashboard view matches the log search.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

import { POST } from "@/app/api/csp-report/route";

function makeRequest(body: unknown, contentType: string): NextRequest {
  return new NextRequest("http://localhost/api/csp-report", {
    method: "POST",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
});

afterEach(() => {
  warnSpy.mockRestore();
});

// Helper: pull the structured extra payload out of the i-th logWarn
// call. logWarn shape is (prefix, err, extra) so extra is args[2].
function extraOf(callIndex: number): Record<string, unknown> {
  return warnSpy.mock.calls[callIndex][2] as Record<string, unknown>;
}

describe("POST /api/csp-report — legacy envelope", () => {
  it("accepts a CSP-1.1 'csp-report' envelope and logs a single warning line", async () => {
    const res = await POST(
      makeRequest(
        {
          "csp-report": {
            "document-uri": "https://carolinafutons.com/",
            "violated-directive": "script-src 'self'",
            "effective-directive": "script-src",
            "blocked-uri": "https://evil.example.com/x.js",
          },
        },
        "application/csp-report",
      ),
    );
    expect(res.status).toBe(204);
    expect(warnSpy).toHaveBeenCalledOnce();
    const prefix = warnSpy.mock.calls[0][0] as string;
    expect(prefix).toBe("[csp] violation");
    expect(extraOf(0)).toEqual({
      source: "legacy",
      directive: "script-src",
      blocked: "https://evil.example.com/x.js",
      docUri: "https://carolinafutons.com/",
    });
  });

  it("falls back to violated-directive when effective-directive is absent", async () => {
    const res = await POST(
      makeRequest(
        {
          "csp-report": {
            "violated-directive": "style-src",
            "blocked-uri": "inline",
          },
        },
        "application/csp-report",
      ),
    );
    expect(res.status).toBe(204);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(extraOf(0).directive).toBe("style-src");
  });

  it("renders (unknown) when both directives missing", async () => {
    const res = await POST(
      makeRequest(
        { "csp-report": { "blocked-uri": "data:" } },
        "application/csp-report",
      ),
    );
    expect(res.status).toBe(204);
    expect(extraOf(0).directive).toBe("(unknown)");
  });

  it("returns 204 without logging when the legacy envelope is empty", async () => {
    const res = await POST(makeRequest({}, "application/csp-report"));
    expect(res.status).toBe(204);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/csp-report — Reporting API envelope", () => {
  it("processes an array of csp-violation entries (logs each)", async () => {
    const res = await POST(
      makeRequest(
        [
          {
            type: "csp-violation",
            url: "https://carolinafutons.com/",
            body: {
              "effective-directive": "img-src",
              "blocked-uri": "https://cdn.example.com/a.png",
              "document-uri": "https://carolinafutons.com/",
            },
          },
          {
            type: "csp-violation",
            body: {
              "effective-directive": "connect-src",
              "blocked-uri": "https://api.example.com/track",
              "document-uri": "https://carolinafutons.com/cart",
            },
          },
        ],
        "application/reports+json",
      ),
    );
    expect(res.status).toBe(204);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(extraOf(0).source).toBe("reporting-api");
    expect(extraOf(0).directive).toBe("img-src");
    expect(extraOf(1).directive).toBe("connect-src");
  });

  it("skips non-csp-violation entries in a Reporting API batch", async () => {
    const res = await POST(
      makeRequest(
        [
          {
            type: "deprecation",
            body: { message: "ignored" } as unknown as Record<string, unknown>,
          },
          {
            type: "csp-violation",
            body: { "effective-directive": "font-src", "blocked-uri": "data:" },
          },
        ],
        "application/reports+json",
      ),
    );
    expect(res.status).toBe(204);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(extraOf(0).directive).toBe("font-src");
  });

  it("returns 204 without logging when reports+json array is empty", async () => {
    const res = await POST(makeRequest([], "application/reports+json"));
    expect(res.status).toBe(204);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/csp-report — malformed body", () => {
  it("returns 204 without throwing on non-JSON body", async () => {
    const res = await POST(
      makeRequest("this is not json", "application/csp-report"),
    );
    expect(res.status).toBe(204);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns 204 on a JSON primitive (not an envelope or array)", async () => {
    const res = await POST(makeRequest(42, "application/csp-report"));
    expect(res.status).toBe(204);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// cfw-1p2r: pin logWarn integration on the violation path. CSP
// violations are the canonical "trend signal at warning level" use
// case — Sentry sees the rate and per-directive breakdown without
// scraping Vercel stdout.
describe("POST /api/csp-report — logWarn integration on violation", () => {
  it("captures Sentry at level='warning' with scope='csp' + op='violation' + extra matching the structured log", async () => {
    await POST(
      makeRequest(
        {
          "csp-report": {
            "document-uri": "https://carolinafutons.com/cart",
            "effective-directive": "script-src",
            "blocked-uri": "https://evil.example.com/x.js",
          },
        },
        "application/csp-report",
      ),
    );

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [, opts] = sentryCaptureException.mock.calls[0]!;
    expect((opts as { level: string }).level).toBe("warning");
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "csp",
      op: "violation",
    });
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      source: "legacy",
      directive: "script-src",
      blocked: "https://evil.example.com/x.js",
      docUri: "https://carolinafutons.com/cart",
    });
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("empty envelope / malformed body / 204 short-circuit paths do NOT call Sentry — no violation = no signal", async () => {
    await POST(makeRequest({}, "application/csp-report"));
    await POST(makeRequest("not json", "application/csp-report"));
    await POST(makeRequest([], "application/reports+json"));

    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("Reporting API batch with 2 violations fires Sentry twice (one per violation)", async () => {
    await POST(
      makeRequest(
        [
          {
            type: "csp-violation",
            body: {
              "effective-directive": "img-src",
              "blocked-uri": "https://cdn.example.com/a.png",
            },
          },
          {
            type: "csp-violation",
            body: {
              "effective-directive": "connect-src",
              "blocked-uri": "https://api.example.com/track",
            },
          },
        ],
        "application/reports+json",
      ),
    );

    expect(sentryCaptureException).toHaveBeenCalledTimes(2);
    const [, opts0] = sentryCaptureException.mock.calls[0]!;
    const [, opts1] = sentryCaptureException.mock.calls[1]!;
    expect((opts0 as { extra: { directive: string } }).extra.directive).toBe(
      "img-src",
    );
    expect((opts1 as { extra: { directive: string } }).extra.directive).toBe(
      "connect-src",
    );
  });
});
