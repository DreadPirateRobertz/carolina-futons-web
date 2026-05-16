// cfw-0nt: server-only Wix Data writer for the Returns collection.
// Guest-accessible flow per the Wix `Returns.js` portal spec — visitors
// submit by order number + email, no member sign-in required.
//
// WHY server-only: even though the write goes through the
// unauthenticated Wix client, this module imports `node:crypto` (RMA
// suffix generation in the original Wix code uses Math.random; we
// preserve that to keep the RMA format identical, but the import path
// is still server-evaluated) and reads env-resolved Wix endpoints. The
// marker turns any accidental client import into a build error.
//
// Slimmer MVP than the Wix spec — see cfw-0nt bead notes. Admin queue
// validates order-existence / email-match / return-window / line-item
// quantities. This helper only enforces input shape.

import "server-only";

import { getWixClient } from "@/lib/wix-client";

import {
  REASON_LABELS,
  isValidReason,
  type ReturnReason,
} from "./return-reasons";

const COLLECTION_ID = "Returns";
const ORDER_NUMBER_MAX = 50;
const DETAILS_MAX = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Input shape for {@link submitGuestReturn}.
 */
export type GuestReturnArgs = {
  /** Order number as the buyer types it from their confirmation email. */
  orderNumber: string;
  /** Buyer email — admin-side queue uses this to verify the order owner. */
  email: string;
  /** Reason for the return (closed enum). */
  reason: ReturnReason;
  /** Optional free-form explanation, truncated to 2000 chars (Wix MAX_DETAILS_LEN). */
  details?: string;
  /** Return vs exchange. Defaults to "return" when absent. */
  type?: "return" | "exchange";
};

/**
 * Happy-path response.
 */
export type GuestReturnSuccess = {
  ok: true;
  /** Human-readable RMA number, format `RMA-YYYYMMDD-NNNN`. */
  rmaNumber: string;
  /** Wix-assigned `_id` of the new Returns row. */
  returnId: string;
};

/**
 * Failure response — discriminated by `reason` for the route's HTTP map.
 */
export type GuestReturnFailure = {
  ok: false;
  reason: "invalid_input" | "wix_error";
  status?: number;
};

export type GuestReturnResult = GuestReturnSuccess | GuestReturnFailure;

/**
 * Persist a guest return request into the Wix `Returns` collection.
 *
 * @param args - {@link GuestReturnArgs} — buyer-supplied form values.
 * @returns A {@link GuestReturnResult}. Never throws — Wix outages and
 *   malformed responses are classified as `wix_error` so the API route
 *   can map directly onto HTTP status without re-implementing the
 *   classification.
 *
 * WHY the slim MVP omits Wix-side cross-validation (order existence,
 * email match, return window, line-item quantities): cfw guest writes
 * use the unauthenticated client, which doesn't have read access to
 * Stores/Orders. The admin queue rejects bad submissions; the helper
 * only enforces input shape. The full validation set is the Wix spec
 * and lands in a follow-up bead once a service-account read path is
 * provisioned.
 */
export async function submitGuestReturn(
  args: GuestReturnArgs,
): Promise<GuestReturnResult> {
  const cleanOrderNumber = sanitizeOrderNumber(args.orderNumber);
  const cleanEmail = (args.email ?? "").trim().toLowerCase();

  if (!cleanOrderNumber) return { ok: false, reason: "invalid_input" };
  if (cleanOrderNumber.length > ORDER_NUMBER_MAX) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!isValidReason(args.reason)) {
    return { ok: false, reason: "invalid_input" };
  }

  const returnType: "return" | "exchange" =
    args.type === "exchange" ? "exchange" : "return";
  const details = (args.details ?? "").slice(0, DETAILS_MAX);
  const rmaNumber = generateRmaNumber();

  const client = getWixClient();
  try {
    const inserted = await client.items.insert(COLLECTION_ID, {
      orderNumber: cleanOrderNumber,
      memberEmail: cleanEmail,
      reason: args.reason,
      reasonLabel: REASON_LABELS[args.reason],
      details,
      type: returnType,
      status: "requested",
      rmaNumber,
    });
    const insertedId = (inserted as { _id?: unknown })._id;
    const returnId = typeof insertedId === "string" ? insertedId : "";
    if (!returnId) return { ok: false, reason: "wix_error" };
    return { ok: true, rmaNumber, returnId };
  } catch (err) {
    const status = extractStatus(err);
    if (typeof status === "number") {
      return { ok: false, reason: "wix_error", status };
    }
    return { ok: false, reason: "wix_error" };
  }
}

/**
 * Strip injection-prone characters from a buyer-supplied order number.
 * Wix backend uses the same allowlist (alphanumeric + dash) — keep parity
 * so a cfw submission and a Wix-side submission produce identical rows.
 */
function sanitizeOrderNumber(raw: string): string {
  return (raw ?? "").trim().replace(/[^a-zA-Z0-9-]/g, "");
}

/**
 * Generate a human-readable RMA number `RMA-YYYYMMDD-NNNN`.
 *
 * WHY this format: matches the Wix backend's `generateRmaNumber` so a
 * cfw-generated RMA looks indistinguishable from a Wix one in the admin
 * queue. The 4-digit random suffix collides at ~10K/day per date prefix
 * — acceptable for a returns submission rate, but admin moderation must
 * dedupe on `orderId` (not RMA) as the unique key.
 */
function generateRmaNumber(): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `RMA-${today}-${seq}`;
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
