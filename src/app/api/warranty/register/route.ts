// cfw-1ud: POST /api/warranty/register — submit a manufacturer warranty
// registration. Member-auth gated; delegates the Wix write to
// registerWarrantyForMember and maps its discriminated result onto HTTP
// status codes the form can render directly.
//
// WHY a thin route + a separate helper: keeps the auth/parse/respond
// concerns isolated from the Wix write logic, so the helper is exercisable
// from server actions, scheduled jobs, or migration scripts without
// pulling in NextRequest. Matches the existing pattern at
// /api/admin/site-content + writeSiteContentHistory.

import { NextResponse, type NextRequest } from "next/server";

import { getMemberSession } from "@/lib/auth/member";
import { registerWarrantyForMember } from "@/lib/warranty/warranty-registration";
import { logError } from "@/lib/logging/log-error";

export const dynamic = "force-dynamic";

const PRODUCT_NAME_MAX_LENGTH = 200;

type WarrantyRegisterBody = {
  productId?: unknown;
  productName?: unknown;
  orderId?: unknown;
  purchaseDate?: unknown;
  serialNumber?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Coerce a body field to a non-empty trimmed string, or null if absent /
 * not a string. Used for optional fields where the form sends `""` /
 * `undefined` interchangeably.
 */
function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Validate that a value, if present, parses as a date.
 *
 * @param value Body field — may be undefined, null, string, or junk.
 * @returns A normalized ISO-8601 string, null if the field was absent, or
 *   the sentinel `{ invalid: true }` if a value was supplied but failed to
 *   parse. The route maps `{ invalid: true }` to a 400.
 */
function parseOptionalDate(
  value: unknown,
): string | null | { invalid: true } {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return { invalid: true };
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return { invalid: true };
  return new Date(ms).toISOString();
}

/**
 * POST handler — member-auth gated warranty registration.
 *
 * Body: `{ productId: string, productName: string, orderId?: string,
 * purchaseDate?: string (ISO-8601), serialNumber?: string }`.
 *
 * Responses:
 *   - 200 `{ ok: true, registrationId: string }`
 *   - 400 `{ ok: false, error: "..." }` — body / validation failure
 *   - 401 `{ ok: false, error: "Member sign-in required." }`
 *   - 500 `{ ok: false, error: "..." }` — unexpected helper throw
 *   - 502 `{ ok: false, error: "..." }` — Wix write failure
 *     (collection missing, transient outage, malformed insert response)
 *
 * WHY 502 for Wix failures: the cfw service is up, but its upstream
 * (Wix Data) returned a non-success or unprocessable response. 502 lets
 * the form surface "try again shortly" copy while still being correctly
 * categorized in Sentry / log aggregators as an upstream-dependency fault
 * rather than a cfw bug.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getMemberSession();
  if (!session) {
    return bad("Member sign-in required.", 401);
  }

  let body: WarrantyRegisterBody;
  try {
    body = (await req.json()) as WarrantyRegisterBody;
  } catch {
    return bad("Invalid JSON body.");
  }

  if (typeof body.productId !== "string" || body.productId.trim().length === 0) {
    return bad("productId is required.");
  }
  if (
    typeof body.productName !== "string" ||
    body.productName.trim().length === 0
  ) {
    return bad("productName is required.");
  }
  if (body.productName.trim().length > PRODUCT_NAME_MAX_LENGTH) {
    return bad(
      `productName must be ${PRODUCT_NAME_MAX_LENGTH} characters or fewer.`,
    );
  }

  const purchaseDate = parseOptionalDate(body.purchaseDate);
  if (typeof purchaseDate === "object" && purchaseDate !== null) {
    return bad("purchaseDate must be an ISO-8601 date string.");
  }

  try {
    const result = await registerWarrantyForMember({
      tokens: session.tokens,
      memberId: session.memberId,
      productId: body.productId.trim(),
      productName: body.productName,
      orderId: optionalString(body.orderId),
      purchaseDate,
      serialNumber: optionalString(body.serialNumber),
    });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        registrationId: result.registrationId,
      });
    }

    if (result.reason === "invalid_input") {
      return bad("One or more fields didn't validate. Check and try again.");
    }
    // wix_error
    return bad(
      "We couldn't save your registration right now. Please try again shortly.",
      502,
    );
  } catch (err) {
    await logError("warranty/register", "POST", err);
    return bad("Unexpected error. Please try again shortly.", 500);
  }
}
