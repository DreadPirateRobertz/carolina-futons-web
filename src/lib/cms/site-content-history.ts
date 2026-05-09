import "server-only";

import type { Tokens } from "@wix/sdk";

import { getWixClient, getWixClientWithTokens } from "@/lib/wix-client";

// cfw-6qd.10: server-side history persistence for owner SiteContent edits.
//
// Every successful POST /api/admin/site-content writes one row here so
// Brenda can see what she changed and roll back to a prior value via the
// EditableText ↶ icon (UI follow-up). Stored in a sibling Wix Data
// collection 'SiteContentHistory' that mirrors the SiteContent shape plus
// `before`, `actorEmail`, and a timestamp.
//
// Fail-soft: helpers here surface errors as `{ ok: false }` instead of
// throwing. The undo trail is a safety net — its absence must NOT block
// a primary owner edit. Caller decides whether to log + carry on or
// surface to the operator.
//
// Provisioning: the SiteContentHistory collection is provisioned via
// the same Wix admin flow as SiteContent (cfw-roi / cf-atze pattern).
// Until provisioned, every write here returns { ok:false, reason:'wix_error' }
// — the route's caller should treat that as best-effort and continue.

const COLLECTION_ID = "SiteContentHistory";

// 'view' is the read pattern used by the EditableText ↶ icon — list versions
// for a key, newest first. 'list-all' would be future work for an admin
// surface that aggregates across keys.
const DEFAULT_HISTORY_LIMIT = 5;

export type SiteContentHistoryRow = {
  _id?: string;
  _createdDate?: string;
  key: string;
  before: string;
  after: string;
  actorEmail: string;
};

export type WriteHistoryArgs = {
  tokens: Tokens;
  key: string;
  before: string;
  after: string;
  actorEmail: string;
};

export type WriteHistoryResult =
  | { ok: true; id: string }
  | { ok: false; reason: "wix_error"; status?: number };

export type ReadHistoryResult =
  | { ok: true; rows: SiteContentHistoryRow[] }
  | { ok: false; reason: "wix_error"; status?: number };

export async function writeSiteContentHistory(
  args: WriteHistoryArgs,
): Promise<WriteHistoryResult> {
  const client = getWixClientWithTokens(args.tokens);
  try {
    const inserted = await client.items.insert(COLLECTION_ID, {
      key: args.key,
      before: args.before,
      after: args.after,
      actorEmail: args.actorEmail,
    });
    const id =
      typeof (inserted as { _id?: unknown })._id === "string"
        ? ((inserted as { _id: string })._id)
        : "";
    return { ok: true, id };
  } catch (err) {
    return { ok: false, reason: "wix_error", status: extractStatus(err) };
  }
}

/**
 * Read the most recent N history rows for `key`, newest first. The reader
 * uses the unauthenticated client because the EditableText ↶ icon renders
 * for owner-mode visitors only — the auth gate is on the consuming route,
 * not here. (Equally fine to switch to a tokens-required signature when the
 * collection's permissions are tightened.)
 */
export async function readSiteContentHistory(
  key: string,
  limit: number = DEFAULT_HISTORY_LIMIT,
): Promise<ReadHistoryResult> {
  const client = getWixClient();
  try {
    const result = await client.items
      .query(COLLECTION_ID)
      .eq("key", key)
      .descending("_createdDate")
      .limit(limit)
      .find();
    return { ok: true, rows: result.items as SiteContentHistoryRow[] };
  } catch (err) {
    return { ok: false, reason: "wix_error", status: extractStatus(err) };
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
