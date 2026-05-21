// cfw-80n1: POST /api/warranty/claim — submit a warranty claim.
// Member-auth gated; delegates persistence to
// submitWarrantyClaimForMember and maps its result onto HTTP status
// codes the form can render directly.
//
// WHY a thin route + a separate helper: keeps auth/parse/respond
// isolated from the Wix write logic so the helper is reusable from
// server actions / batch reprocessors / admin tools. Matches the
// cfw-1ud /api/warranty/register pattern.

import { NextResponse, type NextRequest } from "next/server";

import { logError } from "@/lib/observability/log";
import { getMemberSession } from "@/lib/auth/member";
import { submitWarrantyClaimForMember } from "@/lib/warranty/warranty-claim";
import { isValidIssueType } from "@/lib/warranty/warranty-issue-types";

export const dynamic = "force-dynamic";

const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;
const PHONE_MAX = 20;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WarrantyClaimBody = {
  issueType?: unknown;
  description?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  warrantyId?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Coerce a body field to a non-empty trimmed string, or null when
 * absent / not a string / empty.
 */
function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * POST handler — member-auth gated warranty-claim submission.
 *
 * Body: `{ issueType: string, description: string, contactEmail: string,
 * contactPhone?: string, warrantyId?: string }`.
 *
 * Responses:
 *   - 200 `{ ok: true, claimNumber, claimId }`
 *   - 400 `{ ok: false, error }` — body / validation failure
 *   - 401 `{ ok: false, error: "Member sign-in required." }`
 *   - 500 `{ ok: false, error }` — unexpected helper throw
 *   - 502 `{ ok: false, error }` — Wix write failure
 *
 * WHY 502 for Wix failures: matches cfw-1ud and /api/returns/submit
 * pattern. cfw is up; Wix Data is not. 502 lets the form surface
 * "try again shortly" while being correctly categorized as an
 * upstream-dependency fault in Sentry.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getMemberSession();
  if (!session) {
    return bad("Member sign-in required.", 401);
  }

  let body: WarrantyClaimBody;
  try {
    body = (await req.json()) as WarrantyClaimBody;
  } catch {
    return bad("Invalid JSON body.");
  }

  if (typeof body.issueType !== "string") {
    return bad("issueType is required.");
  }
  if (!isValidIssueType(body.issueType)) {
    return bad(
      "issueType must be one of the supported warranty-claim categories.",
    );
  }
  if (typeof body.description !== "string") {
    return bad("description is required.");
  }
  const trimmedDescription = body.description.trim();
  if (trimmedDescription.length < DESCRIPTION_MIN) {
    return bad(
      `description must be at least ${DESCRIPTION_MIN} characters.`,
    );
  }
  if (trimmedDescription.length > DESCRIPTION_MAX) {
    return bad(
      `description must be ${DESCRIPTION_MAX} characters or fewer.`,
    );
  }
  if (typeof body.contactEmail !== "string" || body.contactEmail.trim().length === 0) {
    return bad("contactEmail is required.");
  }
  if (!EMAIL_REGEX.test(body.contactEmail.trim().toLowerCase())) {
    return bad("contactEmail must be a valid email address.");
  }
  if (body.contactPhone !== undefined && body.contactPhone !== null) {
    if (typeof body.contactPhone !== "string") {
      return bad("contactPhone must be a string.");
    }
    if (body.contactPhone.trim().length > PHONE_MAX) {
      return bad(`contactPhone must be ${PHONE_MAX} characters or fewer.`);
    }
  }

  try {
    const result = await submitWarrantyClaimForMember({
      tokens: session.tokens,
      memberId: session.memberId,
      issueType: body.issueType,
      description: body.description,
      contactEmail: body.contactEmail,
      contactPhone: optionalString(body.contactPhone),
      warrantyId: optionalString(body.warrantyId),
    });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        claimNumber: result.claimNumber,
        claimId: result.claimId,
      });
    }

    if (result.reason === "invalid_input") {
      return bad("One or more fields didn't validate. Check and try again.");
    }
    // wix_error
    return bad(
      "We couldn't save your claim right now. Please try again shortly.",
      502,
    );
  } catch (err) {
    logError("/api/warranty/claim", "unexpected error", err);
    return bad("Unexpected error. Please try again shortly.", 500);
  }
}
