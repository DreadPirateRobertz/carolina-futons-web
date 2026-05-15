// cfw-1ud: server-only Wix Data writer for the WarrantyRegistrations
// collection. Members register a manufacturer warranty for a purchased
// product via /api/warranty/register, which calls this helper with the
// member's tokens and the submitted form values.
//
// WHY server-only: the write uses an authenticated Wix client. Surfacing
// that path from `"use client"` code would either leak Wix oauth flow or
// fail at runtime; the marker turns the mistake into a build error
// (companion to PR #561 / cfw-75m and PR #485 / cf-r192).
//
// WHY fail-soft `{ ok }` return shape: mirrors writeSiteContentHistory
// (cfw-jgl) so callers can choose the user-facing message instead of
// catching opaque errors. The Wix collection may not yet be provisioned in
// every environment (the collection lives in Wix Studio CMS, not in this
// repo) — graceful degradation matters.

import "server-only";

import type { Tokens } from "@wix/sdk";

import { getWixClientWithTokens } from "@/lib/wix-client";

const COLLECTION_ID = "WarrantyRegistrations";

/**
 * Input shape for {@link registerWarrantyForMember}.
 */
export type RegisterWarrantyArgs = {
  /** Member's Wix Headless session tokens. */
  tokens: Tokens;
  /** Member id from the session — pinned into the row for ownership queries. */
  memberId: string;
  /** Product id from the catalog (Wix Stores `Product._id`). */
  productId: string;
  /** Human-readable product name. Trimmed before persisting. */
  productName: string;
  /** Optional original purchase order id (pre-fillable via ?orderId query). */
  orderId: string | null;
  /** Optional ISO-8601 purchase date (pre-fillable via the form's date picker). */
  purchaseDate: string | null;
  /** Optional product serial number (only present on items that ship with one). */
  serialNumber: string | null;
};

/**
 * Successful insert result.
 */
export type RegisterWarrantySuccess = {
  ok: true;
  registrationId: string;
};

/**
 * Failure result. `invalid_input` is for caller-supplied data that didn't
 * meet the helper's required-field rules; `wix_error` covers the collection
 * being missing, transient Wix outages, or a malformed insert response.
 */
export type RegisterWarrantyFailure = {
  ok: false;
  reason: "invalid_input" | "wix_error";
  status?: number;
};

export type RegisterWarrantyResult =
  | RegisterWarrantySuccess
  | RegisterWarrantyFailure;

/**
 * Persist a warranty registration for the given member.
 *
 * @param args - {@link RegisterWarrantyArgs} — tokens + memberId + form values.
 * @returns A {@link RegisterWarrantyResult} discriminated by `ok`. Never
 *   throws — Wix-side failures classify as `wix_error` and validation
 *   misses as `invalid_input` so the API route can map directly to HTTP
 *   400/502 status codes without re-implementing the classification.
 *
 * WHY required-field set: memberId, productId, productName are the
 * uniqueness anchor for an ownership query later (cf-9k5 P2 follow-up:
 * `getMyWarranties`). Empty values would produce orphan rows the reader
 * couldn't match back to the member, so the helper short-circuits before
 * burning a Wix write quota on them.
 */
export async function registerWarrantyForMember(
  args: RegisterWarrantyArgs,
): Promise<RegisterWarrantyResult> {
  const productName = args.productName.trim();
  if (!productName || !args.productId || !args.memberId) {
    return { ok: false, reason: "invalid_input" };
  }

  const client = getWixClientWithTokens(args.tokens);

  try {
    // Don't cast the insert return at the call site — the cast pushes a
    // contextual type back through the literal, which Wix's strict
    // `items.insert` overloads reject as excess-property errors. Cast at
    // the field-access instead (matches site-content-history.ts:62).
    const inserted = await client.items.insert(COLLECTION_ID, {
      memberId: args.memberId,
      productId: args.productId,
      productName,
      orderId: args.orderId,
      purchaseDate: args.purchaseDate,
      serialNumber: args.serialNumber,
      status: "active",
      registeredAt: new Date().toISOString(),
    });
    const insertedId = (inserted as { _id?: unknown })._id;
    const id = typeof insertedId === "string" ? insertedId : "";
    if (!id) return { ok: false, reason: "wix_error" };
    return { ok: true, registrationId: id };
  } catch (err) {
    const status = extractStatus(err);
    if (typeof status === "number") {
      return { ok: false, reason: "wix_error", status };
    }
    return { ok: false, reason: "wix_error" };
  }
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
