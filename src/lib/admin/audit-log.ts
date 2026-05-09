import "server-only";

import type { Tokens } from "@wix/sdk";

import { getWixClientWithTokens } from "@/lib/wix-client";

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
    console.error(
      `[audit-log] failed to record ${entry.action} on ${entry.target}: ${message}`,
    );
    return { ok: false, reason: "wix_outage", error: message };
  }
}
