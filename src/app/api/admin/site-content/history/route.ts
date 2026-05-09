import { NextResponse, type NextRequest } from "next/server";

import { getOwnerSession } from "@/lib/auth/owner";
import { validateOwnerEditKey } from "@/lib/cms/owner-edit-validation";
import { readSiteContentHistory } from "@/lib/cms/site-content-history";

// cfw-cns (cfw-6qd.10 follow-up): read endpoint for the SiteContentHistory
// collection. Backs the upcoming ↶ undo affordance in EditableText:
//
//   GET /api/admin/site-content/history?key=footer.tagline&limit=5
//   → 200 { ok: true, rows: [...] }   newest-first, capped at MAX_LIMIT
//   → 401 { ok: false, error }        no owner session
//   → 400 { ok: false, error }        missing/invalid key, bad limit
//   → 502 { ok: false, error }        Wix outage / collection unprovisioned
//
// Auth mirrors POST /api/admin/site-content (cfw-6qd.3): same getOwnerSession
// gate, same JSON 401 (no redirect — fetch-friendly).
//
// readSiteContentHistory uses the unauthenticated client by design — the ↶
// icon renders in owner-mode UI only, so the auth gate is here, not in the
// data-layer helper. Tightening the collection's permissions later just
// means the read fails with `wix_error` and we surface 502, which is the
// right behaviour anyway.

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function parseLimit(raw: string | null): number | { error: string } {
  if (raw === null || raw === "") return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return { error: "Field 'limit' must be a positive integer." };
  }
  return Math.min(n, MAX_LIMIT);
}

export async function GET(req: NextRequest) {
  const owner = await getOwnerSession();
  if (!owner) {
    return jsonError("Owner sign-in required.", 401);
  }

  const url = new URL(req.url);
  const keyCheck = validateOwnerEditKey(url.searchParams.get("key"));
  if (!keyCheck.ok) return jsonError(keyCheck.message, 400);

  const limit = parseLimit(url.searchParams.get("limit"));
  if (typeof limit !== "number") return jsonError(limit.error, 400);

  const result = await readSiteContentHistory(keyCheck.key, limit);
  if (!result.ok) {
    return jsonError("Couldn't load history. Try again.", 502);
  }

  return NextResponse.json({ ok: true, rows: result.rows });
}
