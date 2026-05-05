// Auth-route runtime diagnostics — used by /api/auth/login and
// /api/auth/register to capture environment fingerprints when a Wix SDK call
// fails on the deployed runtime but works locally (cfw-hb3 root cause: Vercel
// runtime returns 502 from /api/auth/login while the same WIX_CLIENT_ID_HEADLESS
// authenticates fine in the local dev server).
//
// Two surfaces:
//   - sanitised diag (envByteSummary + runtimeSummary) — safe to attach to
//     Sentry events as `extra` and to return in JSON responses gated by a
//     debug token, since it never reveals the full client ID.
//   - diagAuthorized(req) — predicate that lets a curl with `x-debug-token`
//     header see the diag inline in the 502 response, avoiding the
//     dependency on Vercel function logs access for triage.

import type { NextRequest } from "next/server";

export type EnvByteSummary = {
  key: string;
  length: number;
  prefix4: string;
  suffix4: string;
  // First/last 8 bytes hex-encoded — reveals zero-width chars, BOM, NBSP, etc.
  // Comparing this against a known-good local value pinpoints any byte
  // mismatch a `.trim()` in the env loader would silently absorb.
  hex8Prefix: string;
  hex8Suffix: string;
};

export function envByteSummary(key: string): EnvByteSummary | null {
  const raw = process.env[key];
  if (typeof raw !== "string") return null;
  // Intentionally NOT trimmed — we want to see exactly what Vercel injected,
  // including any surrounding whitespace or invisible chars. The env loader
  // (src/lib/env.ts) trims downstream, so the SDK sees the trimmed value, but
  // a non-printing char inside the body would survive trim().
  const length = raw.length;
  const prefix4 = raw.slice(0, 4);
  const suffix4 = raw.slice(Math.max(0, length - 4));
  const hex8Prefix = Buffer.from(raw.slice(0, 8), "utf8").toString("hex");
  const hex8Suffix = Buffer.from(
    raw.slice(Math.max(0, length - 8)),
    "utf8",
  ).toString("hex");
  return { key, length, prefix4, suffix4, hex8Prefix, hex8Suffix };
}

export type RuntimeSummary = {
  nodeVersion: string;
  vercelEnv?: string;
  vercelRegion?: string;
  vercelDeploymentId?: string;
  runtime: string;
};

export function runtimeSummary(): RuntimeSummary {
  return {
    nodeVersion: process.version,
    vercelEnv: process.env.VERCEL_ENV,
    vercelRegion: process.env.VERCEL_REGION,
    vercelDeploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
  };
}

// Constant-time compare on equal-length strings; falls back to plain compare
// when lengths differ. The token is configured per-deploy; an attacker who
// knows it can read sanitised env summary + error message but no secrets.
export function diagAuthorized(req: NextRequest): boolean {
  const expected = process.env.WIX_AUTH_DEBUG_TOKEN;
  if (!expected || expected.length === 0) return false;
  const presented = req.headers.get("x-debug-token") ?? "";
  if (presented.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ presented.charCodeAt(i);
  }
  return mismatch === 0;
}

export type AuthDiagBlock = {
  err: { message: string; name: string; code?: string; httpStatus?: number };
  env: EnvByteSummary | null;
  runtime: RuntimeSummary;
};

export function buildAuthDiag(err: unknown): AuthDiagBlock {
  const e = err as { code?: unknown; response?: { status?: unknown } };
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "Unknown";
  const code = typeof e?.code === "string" ? e.code : undefined;
  const httpStatus =
    typeof e?.response?.status === "number" ? e.response.status : undefined;
  return {
    err: { message, name, code, httpStatus },
    env: envByteSummary("WIX_CLIENT_ID_HEADLESS"),
    runtime: runtimeSummary(),
  };
}
