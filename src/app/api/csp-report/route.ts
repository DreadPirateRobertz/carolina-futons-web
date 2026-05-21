// cfw-q2l Phase 1 — CSP violation report endpoint.
//
// Browsers POST a Content-Security-Policy violation report here whenever
// the report-only policy in `src/middleware.ts` flags a resource that
// would have been blocked under enforce. This stub logs the report to
// stdout (Vercel log retention) — Phase 1's goal is enumerating every
// script/style/img/connect source the site actually uses, so we can
// tighten the baseline before flipping to enforce in Phase 2.
//
// WHY same-origin (not Sentry directly): keeps the destination
// cookie-domain identical to the page, sidesteps any CORS or
// cross-origin-credentials interaction. A future commit can forward
// the parsed report to Sentry's CSP endpoint without touching the
// browser-side header at all.
//
// Browsers send the report as `Content-Type: application/csp-report` —
// the body is JSON wrapping a single `csp-report` key. Some browsers
// (Chrome via Reporting API) instead POST `application/reports+json` as
// an array; this handler accepts both shapes.

import { NextResponse, type NextRequest } from "next/server";

import { logWarn } from "@/lib/observability/log";

export const dynamic = "force-dynamic";

type CspReport = {
  "document-uri"?: string;
  referrer?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "original-policy"?: string;
  disposition?: string;
  "blocked-uri"?: string;
  "status-code"?: number;
  "script-sample"?: string;
  "source-file"?: string;
  "line-number"?: number;
  "column-number"?: number;
};

type LegacyEnvelope = { "csp-report": CspReport };

type ReportingApiEntry = {
  type?: string;
  url?: string;
  body?: CspReport;
};

/**
 * Logs a normalized CSP-violation summary line to stdout.
 *
 * @param report The parsed `csp-report` body.
 * @param source A short tag describing which envelope shape carried the
 *   report (`legacy` vs `reporting-api`) — useful when triaging which
 *   browsers are reporting which violations.
 */
function logViolation(
  report: CspReport,
  source: "legacy" | "reporting-api",
): void {
  const directive =
    report["effective-directive"] ??
    report["violated-directive"] ??
    "(unknown)";
  const blocked = report["blocked-uri"] ?? "(inline)";
  const docUri = report["document-uri"] ?? "(unknown)";
  logWarn("csp", "violation", undefined, { source, directive, blocked, docUri });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const contentType = req.headers.get("content-type") ?? "";

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    // Malformed body — return 204 anyway. Failing here would make the
    // browser retry; CSP reports are noisy by design and we'd rather
    // accept-and-drop than amplify.
    return new NextResponse(null, { status: 204 });
  }

  if (
    contentType.includes("application/reports+json") &&
    Array.isArray(parsed)
  ) {
    // Reporting API: array of report entries, each with a typed body.
    for (const entry of parsed as ReportingApiEntry[]) {
      if (entry && entry.type === "csp-violation" && entry.body) {
        logViolation(entry.body, "reporting-api");
      }
    }
  } else if (
    parsed &&
    typeof parsed === "object" &&
    "csp-report" in (parsed as Record<string, unknown>)
  ) {
    // Legacy CSP 1.1: { "csp-report": { ... } }
    const envelope = parsed as LegacyEnvelope;
    if (envelope["csp-report"]) {
      logViolation(envelope["csp-report"], "legacy");
    }
  }
  // Always 204 — the browser doesn't care about the response body.
  return new NextResponse(null, { status: 204 });
}
