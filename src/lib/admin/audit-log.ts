import "server-only";

import type { Tokens } from "@wix/sdk";

import { logError } from "@/lib/logger";
import { getWixClient, getWixClientWithTokens } from "@/lib/wix-client";

// cfw-6qd.11: lightweight audit trail for owner-mode edits.
//
// Every successful POST /api/admin/site-content (and, when those endpoints
// land, /api/admin/image-upload + /api/admin/product-image) appends one row
// to the OwnerAuditLog Wix Data collection. Schema mirrors the bead spec:
//
//   { _id, actorEmail, action: edit|upload|swap, target, before, after, ts }
//
// The audit write is BEST-EFFORT — if the Wix call fails, the route still
// returns 200 to the caller. Reasoning: the user-visible save already
// succeeded by the time we audit, and a missing audit row is strictly less
// bad than surfacing a "save failed" error to Brenda for a bookkeeping
// hiccup. We log the failure for diagnostics so we can spot recurring
// outages in Sentry.
//
// Storage: provisioned alongside SiteContent — collection 'OwnerAuditLog',
// permissions same as SiteContent (members with the owner allowlist email
// can write; reads are append-only by API for now, surfaced via a future
// /admin/audit table).

export const AUDIT_LOG_COLLECTION_ID = "OwnerAuditLog";

export type AuditAction = "edit" | "upload" | "swap";

export type AuditEntry = {
  /** Owner's loginEmail (cfw-wef.getOwnerSession().email). */
  actorEmail: string;
  /** Edit type — text save, image upload, product image swap. */
  action: AuditAction;
  /** What was edited — SiteContent key, or productId for product image swaps. */
  target: string;
  /** Pre-edit value (empty string if creating a new row). */
  before: string;
  /** Post-edit value (the new persisted value). */
  after: string;
};

export type RecordResult =
  | { ok: true }
  | { ok: false; reason: "wix_outage"; error: string };

/**
 * Append one audit row. Returns ok=false on failure but never throws so
 * callers can `await recordOwnerEdit(...)` without try/catch — a Wix outage
 * during audit must not turn a successful primary write into a 500.
 */
export async function recordOwnerEdit(
  entry: AuditEntry,
  tokens: Tokens,
  /** Override for tests so we can verify the timestamp shape without faking time globally. */
  now: () => string = () => new Date().toISOString(),
): Promise<RecordResult> {
  try {
    const client = getWixClientWithTokens(tokens);
    const row = {
      actorEmail: entry.actorEmail,
      action: entry.action,
      target: entry.target,
      before: entry.before,
      after: entry.after,
      ts: now(),
    };
    // The Wix SDK's WixDataItem type is wider than what we send (it expects
    // _createdDate as Date on the read side); cast at the boundary.
    await client.items.save(
      AUDIT_LOG_COLLECTION_ID,
      row as unknown as Parameters<typeof client.items.save>[1],
    );
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(
      "audit-log",
      `failed to record ${entry.action} on ${entry.target}`,
      err instanceof Error ? err : { message },
    );
    return { ok: false, reason: "wix_outage", error: message };
  }
}

// cfw-xlv: read half. Surfaces audit rows to the /admin/audit viewer.
// Mirrors the readSiteContentHistory shape (cfw-6qd.10) so the consuming
// page can pattern-match the same { ok, rows } / { ok: false, reason }
// discriminated union.

export type AuditLogRow = {
  _id?: string;
  _createdDate?: string;
  actorEmail: string;
  action: AuditAction;
  target: string;
  before: string;
  after: string;
  ts: string;
};

export type ReadAuditLogResult =
  | { ok: true; rows: AuditLogRow[] }
  | { ok: false; reason: "wix_outage"; error: string };

const DEFAULT_AUDIT_LIMIT = 50;
const MAX_AUDIT_LIMIT = 200;

/**
 * Read the most recent N audit rows newest-first. Uses the unauthenticated
 * client for the same reason as readSiteContentHistory: callers gate on
 * the route layer (the /admin/audit viewer reuses requireOwnerSession),
 * not on data-layer permissions.
 */
export async function readOwnerAuditLog(
  limit: number = DEFAULT_AUDIT_LIMIT,
): Promise<ReadAuditLogResult> {
  const cap = Math.min(Math.max(1, Math.floor(limit)), MAX_AUDIT_LIMIT);
  try {
    const client = getWixClient();
    const result = await client.items
      .query(AUDIT_LOG_COLLECTION_ID)
      .descending("_createdDate")
      .limit(cap)
      .find();
    return { ok: true, rows: result.items as AuditLogRow[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: "wix_outage", error: message };
  }
}
