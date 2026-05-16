// cfw-0nt: POST /api/returns/submit — guest-accessible return submission.
//
// Body shape (all string fields):
//   { orderNumber, email, reason, details?, type? }
//
// WHY a thin route + a separate helper: keeps body parsing / HTTP status
// classification separate from the Wix write, so the helper is usable
// from server actions, batch reprocessors, or admin import scripts
// without dragging in NextRequest. Matches the existing pattern at
// /api/admin/site-content + writeSiteContentHistory, and the parallel
// /api/warranty/register + registerWarrantyForMember (cfw-1ud).

import { NextResponse, type NextRequest } from "next/server";

import { isValidReason } from "@/lib/returns/return-reasons";
import { submitGuestReturn } from "@/lib/returns/return-submission";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

const DETAILS_MAX = 2000;

type ReturnsSubmitBody = {
  orderNumber?: unknown;
  email?: unknown;
  reason?: unknown;
  details?: unknown;
  type?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * POST handler — submits a guest return request to the Wix `Returns`
 * collection.
 *
 * @param req NextRequest carrying a JSON body.
 * @returns NextResponse:
 *   - 200 `{ ok: true, rmaNumber, returnId }`
 *   - 400 `{ ok: false, error: "..." }` — body / validation failure
 *   - 500 `{ ok: false, error: "..." }` — unexpected helper throw
 *   - 502 `{ ok: false, error: "..." }` — Wix write failure (collection
 *     missing, transient outage, malformed insert response)
 *
 * WHY 502 for Wix failures: cfw is up; its upstream (Wix Data) returned
 * a non-success. 502 lets the form surface "try again shortly" while
 * still being correctly categorized in Sentry / log aggregators as an
 * upstream-dependency fault rather than a cfw bug.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: ReturnsSubmitBody;
  try {
    body = (await req.json()) as ReturnsSubmitBody;
  } catch {
    return bad("Invalid JSON body.");
  }

  if (
    typeof body.orderNumber !== "string" ||
    body.orderNumber.trim().length === 0
  ) {
    return bad("orderNumber is required.");
  }
  if (typeof body.email !== "string" || body.email.trim().length === 0) {
    return bad("email is required.");
  }
  if (typeof body.reason !== "string") {
    return bad("reason is required.");
  }
  if (!isValidReason(body.reason)) {
    return bad("reason must be one of the supported return-reason values.");
  }
  if (body.details !== undefined) {
    if (typeof body.details !== "string") {
      return bad("details must be a string.");
    }
    if (body.details.length > DETAILS_MAX) {
      return bad(`details must be ${DETAILS_MAX} characters or fewer.`);
    }
  }
  if (body.type !== undefined) {
    if (body.type !== "return" && body.type !== "exchange") {
      return bad("type must be 'return' or 'exchange'.");
    }
  }

  try {
    const result = await submitGuestReturn({
      orderNumber: body.orderNumber,
      email: body.email,
      reason: body.reason,
      details: typeof body.details === "string" ? body.details : undefined,
      type:
        body.type === "return" || body.type === "exchange"
          ? body.type
          : undefined,
    });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        rmaNumber: result.rmaNumber,
        returnId: result.returnId,
      });
    }

    if (result.reason === "invalid_input") {
      return bad("One or more fields didn't validate. Check and try again.");
    }
    // wix_error
    return bad(
      "We couldn't save your return request right now. Please try again shortly.",
      502,
    );
  } catch (err) {
    await logError("returns/submit", "POST", err);
    return bad("Unexpected error. Please try again shortly.", 500);
  }
}
