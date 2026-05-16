// /api/notify-me — back-in-stock notification sign-up.
//
// Wire contract:
//   POST { email: string, productId: string }
//   → 200 { ok: true }
//   → 400 { ok: false, error: "invalid-email" | "missing-productId" | "invalid-json" }
//   → 502 { ok: false, error: "velo-error" | "velo-unreachable" }
//
// Delegates to Wix Velo /_functions/notifyMe. When WIX_VELO_SITE_URL is
// not set (CI / local dev), accepts and acknowledges without calling Velo.

import { NextResponse } from "next/server";

import { logError } from "@/lib/logging/log-error";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FETCH_TIMEOUT_MS = 8_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  const obj =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email =
    typeof obj.email === "string" ? obj.email.trim().toLowerCase() : "";
  const productId =
    typeof obj.productId === "string" ? obj.productId.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "invalid-email" },
      { status: 400 },
    );
  }
  if (!productId) {
    return NextResponse.json(
      { ok: false, error: "missing-productId" },
      { status: 400 },
    );
  }

  const base = process.env.WIX_VELO_SITE_URL;
  if (!base) {
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/_functions/notifyMe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, productId }),
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      // cfw-qv2i: parallel to cfw-1r9n survey veloResponse pattern —
      // synthesize an Error so Sentry has a stack to fingerprint on
      // and ship httpStatus so a sustained 5xx groups separately
      // from sporadic 429s.
      await logError(
        "api/notify-me",
        "veloResponse",
        new Error(`Velo responded HTTP ${res.status}`),
        { httpStatus: res.status },
      );
      return NextResponse.json(
        { ok: false, error: "velo-error" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // cfw-qv2i: distinct op so Velo timeouts/aborts group separately
    // from upstream HTTP errors.
    await logError("api/notify-me", "fetch", err);
    return NextResponse.json(
      { ok: false, error: "velo-unreachable" },
      { status: 502 },
    );
  }
}
