// cfw-q2l: tests for the CSP-violation report endpoint.
//
// Coverage:
// - Legacy `application/csp-report` envelope ({ "csp-report": {...} }) is parsed
// - Reporting API envelope (application/reports+json, array of entries) is parsed
// - Malformed body returns 204 (accept-and-drop — never amplify retry)
// - Non-violation entries in a Reporting API array are skipped
// - Empty body / missing csp-report key returns 204 without throwing
//
// The handler's only side effect is `console.warn` per violation — we
// spy on that and assert the log line shape.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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
});

afterEach(() => {
  warnSpy.mockRestore();
});

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
    // logWarn emits: console.warn("[csp] violation", { source, directive, blocked, docUri })
    expect(warnSpy.mock.calls[0][0]).toBe("[csp] violation");
    const extra = warnSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(extra.source).toBe("legacy");
    expect(extra.directive).toBe("script-src");
    expect(extra.blocked).toBe("https://evil.example.com/x.js");
    expect(extra.docUri).toBe("https://carolinafutons.com/");
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
    const extra = warnSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(extra.directive).toBe("style-src");
  });

  it("renders (unknown) when both directives missing", async () => {
    const res = await POST(
      makeRequest(
        { "csp-report": { "blocked-uri": "data:" } },
        "application/csp-report",
      ),
    );
    expect(res.status).toBe(204);
    const extra = warnSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(extra.directive).toBe("(unknown)");
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
    const extra0 = warnSpy.mock.calls[0][1] as Record<string, unknown>;
    const extra1 = warnSpy.mock.calls[1][1] as Record<string, unknown>;
    expect(extra0.source).toBe("reporting-api");
    expect(extra0.directive).toBe("img-src");
    expect(extra1.directive).toBe("connect-src");
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
    const extra = warnSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(extra.directive).toBe("font-src");
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
