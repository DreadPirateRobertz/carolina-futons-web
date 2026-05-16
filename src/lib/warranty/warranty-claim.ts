// cfw-80n1: server-only Wix Data writer for the WarrantyClaims
// collection. Members file claims against a registered warranty (or
// without one, for unregistered purchases — admin verifies) via the
// /api/warranty/claim route, which calls this helper.
//
// WHY server-only: write goes through the authenticated Wix client.
// Surfacing that from "use client" code would either leak Wix oauth
// flow or fail at runtime; the marker turns the mistake into a build
// error (companion to cfw-1ud's warranty-registration helper).
//
// Slimmer MVP than the Wix backend's submitClaim webMethod — see bead
// notes. cfw helper enforces input shape; the admin queue verifies
// member ownership of the referenced warranty (Wix-side `WarrantyClaims`
// admin moderation UI) once the claim hits the queue.

import "server-only";

import type { Tokens } from "@wix/sdk";

import { getWixClientWithTokens } from "@/lib/wix-client";

import {
  isValidIssueType,
  type WarrantyIssueType,
} from "./warranty-issue-types";

const COLLECTION_ID = "WarrantyClaims";
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Input shape for {@link submitWarrantyClaimForMember}.
 */
export type SubmitWarrantyClaimArgs = {
  /** Member's Wix Headless session tokens. */
  tokens: Tokens;
  /** Member id from the session — pinned into the row for ownership queries. */
  memberId: string;
  /** Closed-enum issue category. */
  issueType: WarrantyIssueType;
  /** Free-form description (10–2000 chars). */
  description: string;
  /** Contact email — lowercased + trimmed before persisting. */
  contactEmail: string;
  /** Optional phone (admin uses for high-priority follow-up). */
  contactPhone?: string | null;
  /** Optional reference to a WarrantyRegistrations row. Admin verifies ownership. */
  warrantyId?: string | null;
};

/**
 * Happy-path response.
 */
export type SubmitWarrantyClaimSuccess = {
  ok: true;
  /** Human-readable claim number, format `CLM-YYYYMMDD-NNNN`. */
  claimNumber: string;
  /** Wix-assigned `_id` of the new WarrantyClaims row. */
  claimId: string;
};

/**
 * Failure response — discriminated by `reason` for the route's HTTP map.
 */
export type SubmitWarrantyClaimFailure = {
  ok: false;
  reason: "invalid_input" | "wix_error";
  status?: number;
};

export type SubmitWarrantyClaimResult =
  | SubmitWarrantyClaimSuccess
  | SubmitWarrantyClaimFailure;

/**
 * Persist a warranty claim into the Wix `WarrantyClaims` collection.
 *
 * @param args - {@link SubmitWarrantyClaimArgs}.
 * @returns A {@link SubmitWarrantyClaimResult}. Never throws — Wix
 *   outages classify as `wix_error`, validation misses as
 *   `invalid_input`, so the API route can map directly onto HTTP
 *   status without re-classifying.
 *
 * WHY MVP omits cross-validation (member-owns-warranty, warranty-not-
 * expired): the cfw client doesn't have a privileged read of
 * WarrantyRegistrations in this slice. Admin queue verifies on
 * review. Lands as a follow-up bead once a service-account read path
 * is provisioned.
 */
export async function submitWarrantyClaimForMember(
  args: SubmitWarrantyClaimArgs,
): Promise<SubmitWarrantyClaimResult> {
  if (!args.memberId) return { ok: false, reason: "invalid_input" };
  if (!isValidIssueType(args.issueType)) {
    return { ok: false, reason: "invalid_input" };
  }
  const description = args.description.trim();
  if (description.length < DESCRIPTION_MIN) {
    return { ok: false, reason: "invalid_input" };
  }
  const contactEmail = (args.contactEmail ?? "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(contactEmail)) {
    return { ok: false, reason: "invalid_input" };
  }

  const truncatedDescription = description.slice(0, DESCRIPTION_MAX);
  const contactPhone =
    args.contactPhone && args.contactPhone.trim().length > 0
      ? args.contactPhone.trim()
      : null;
  const warrantyId =
    args.warrantyId && args.warrantyId.trim().length > 0
      ? args.warrantyId.trim()
      : null;
  const claimNumber = generateClaimNumber();

  const client = getWixClientWithTokens(args.tokens);
  try {
    const inserted = await client.items.insert(COLLECTION_ID, {
      memberId: args.memberId,
      warrantyId,
      claimNumber,
      issueType: args.issueType,
      description: truncatedDescription,
      contactEmail,
      contactPhone,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    });
    const insertedId = (inserted as { _id?: unknown })._id;
    const claimId = typeof insertedId === "string" ? insertedId : "";
    if (!claimId) return { ok: false, reason: "wix_error" };
    return { ok: true, claimNumber, claimId };
  } catch (err) {
    const status = extractStatus(err);
    if (typeof status === "number") {
      return { ok: false, reason: "wix_error", status };
    }
    return { ok: false, reason: "wix_error" };
  }
}

/**
 * Generate a human-readable claim number `CLM-YYYYMMDD-NNNN`.
 *
 * WHY this format: matches the Wix backend's `generateClaimNumber` so a
 * cfw-generated claim is indistinguishable from a Wix one in the admin
 * queue. The 4-digit random suffix is acceptable for claim-submission
 * volume; admin dedupes on `_id` (not claimNumber).
 */
function generateClaimNumber(): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `CLM-${today}-${seq}`;
}

function extractStatus(err: unknown): number | undefined {
  if (err && typeof err === "object") {
    const direct = (err as { status?: unknown }).status;
    if (typeof direct === "number") return direct;
    const responseStatus = (err as { response?: { status?: unknown } }).response
      ?.status;
    if (typeof responseStatus === "number") return responseStatus;
  }
  return undefined;
}
