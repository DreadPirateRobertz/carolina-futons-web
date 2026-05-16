// /api/swatch-request — fabric swatch sample request HTTP endpoint.
//
// Wire contract:
//   POST { swatchIds: string[], contactInfo: SwatchContactInfo, productSlug?: string }
//   → 200 { ok: true }
//   → 400 { ok: false, error: string }    validation failure
//   → 502 { ok: false, error: "velo-error" | "velo-unreachable" }
//
// Validation reuses the shared swatch-request-schema so rules cannot drift
// between the Server Action (form submit) and this HTTP endpoint.
// Delegates to Wix Velo /_functions/sampleRequests. When WIX_VELO_SITE_URL
// is not set (CI / local dev), accepts and acknowledges without calling Velo.

import { NextResponse } from "next/server";

import { logError } from "@/lib/observability/log";
import {
  coerceSwatchContactInfo,
  hasSwatchContactErrors,
  validateSwatchContactInfo,
  validateSwatchIds,
} from "@/lib/swatch-request/swatch-request-schema";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 10_000;

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
  const swatchIds = Array.isArray(obj.swatchIds)
    ? (obj.swatchIds as unknown[]).map(String)
    : [];
  const rawContact =
    obj.contactInfo && typeof obj.contactInfo === "object"
      ? (obj.contactInfo as Record<string, unknown>)
      : {};
  const contactInfo = coerceSwatchContactInfo(rawContact);
  const productSlug =
    typeof obj.productSlug === "string" ? obj.productSlug : undefined;

  const swatchError = validateSwatchIds(swatchIds);
  const contactErrors = validateSwatchContactInfo(contactInfo);

  if (swatchError) {
    return NextResponse.json(
      { ok: false, error: swatchError },
      { status: 400 },
    );
  }
  if (hasSwatchContactErrors(contactErrors)) {
    const firstError = Object.values(contactErrors)[0] ?? "Validation error.";
    return NextResponse.json(
      { ok: false, error: firstError },
      { status: 400 },
    );
  }

  const base = process.env.WIX_VELO_SITE_URL;
  if (!base) {
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/_functions/sampleRequests`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ swatchIds, contactInfo, productSlug }),
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      logError("swatch-request", "Velo responded with non-2xx", res.status);
      return NextResponse.json(
        { ok: false, error: "velo-error" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("swatch-request", "fetch failed", err);
    return NextResponse.json(
      { ok: false, error: "velo-unreachable" },
      { status: 502 },
    );
  }
}
