import { getWixClient, getWixClientWithTokens } from "@/lib/wix-client";
import type { Tokens } from "@wix/sdk";

export type WixDataItem = Record<string, unknown> & {
  _id?: string;
  _createdDate?: string;
  _updatedDate?: string;
};

export async function listCollectionItems<T extends WixDataItem = WixDataItem>(
  collectionId: string,
  limit = 50,
): Promise<T[]> {
  const client = getWixClient();
  const result = await client.items.query(collectionId).limit(limit).find();
  return result.items as T[];
}

export async function getCollectionItemById<T extends WixDataItem = WixDataItem>(
  collectionId: string,
  id: string,
): Promise<T | null> {
  const client = getWixClient();
  const result = await client.items
    .query(collectionId)
    .eq("_id", id)
    .limit(1)
    .find();
  return (result.items[0] as T | undefined) ?? null;
}

export async function getCollectionItemBySlug<
  T extends WixDataItem = WixDataItem,
>(collectionId: string, slug: string): Promise<T | null> {
  const client = getWixClient();
  const result = await client.items
    .query(collectionId)
    .eq("slug", slug)
    .limit(1)
    .find();
  return (result.items[0] as T | undefined) ?? null;
}

export async function queryCollectionWhere<
  T extends WixDataItem = WixDataItem,
>(
  collectionId: string,
  field: string,
  value: string | number | boolean,
  limit = 50,
): Promise<T[]> {
  const client = getWixClient();
  const result = await client.items
    .query(collectionId)
    .eq(field, value)
    .limit(limit)
    .find();
  return result.items as T[];
}

/**
 * Look up a single row in a Wix Data collection by a unique business key.
 * Mirrors the read half of `upsertCollectionItemByKey` for callers (e.g. the
 * audit-log path) that need the previous value before overwriting it.
 *
 * cfw-6qd.11: read SiteContent's `before` value so the audit row carries a
 * full diff snapshot, not just the post-edit value.
 */
export async function lookupCollectionItemByKey<
  T extends WixDataItem = WixDataItem,
>(args: {
  collectionId: string;
  keyField: string;
  keyValue: string;
  tokens?: Tokens;
}): Promise<T | null> {
  const { collectionId, keyField, keyValue, tokens } = args;
  const client = tokens ? getWixClientWithTokens(tokens) : getWixClient();
  const result = await client.items
    .query(collectionId)
    .eq(keyField, keyValue)
    .limit(1)
    .find();
  return (result.items[0] as T | undefined) ?? null;
}

/**
 * Upsert a row in a Wix Data collection by a unique business key (e.g. SiteContent
 * is keyed by `key`, not `_id`). Looks up the existing item by `keyField === keyValue`
 * and calls `items.save()` with the existing `_id` (update) or without (insert).
 * Caller-owned tokens (e.g. owner member session) are required for collections
 * with member-write permissions.
 *
 * cfw-6qd.1: SiteContent writes for Brenda's inline-edit /api/admin/site-content
 * POST endpoint.
 */
export async function upsertCollectionItemByKey<
  T extends WixDataItem = WixDataItem,
>(args: {
  collectionId: string;
  keyField: string;
  keyValue: string;
  fields: Partial<T>;
  tokens?: Tokens;
}): Promise<T> {
  const { collectionId, keyField, keyValue, fields, tokens } = args;
  const client = tokens ? getWixClientWithTokens(tokens) : getWixClient();
  const existing = await client.items
    .query(collectionId)
    .eq(keyField, keyValue)
    .limit(1)
    .find();
  const existingId = existing.items[0]?._id;
  const merged = existingId
    ? ({ ...fields, [keyField]: keyValue, _id: existingId } as Partial<T>)
    : ({ ...fields, [keyField]: keyValue } as Partial<T>);
  // The Wix SDK's internal WixDataItem type narrows _createdDate to Date,
  // while our exported alias uses string for the read-side shape (Wix
  // serialises to ISO strings on the wire). Cast at the boundary.
  const saved = await client.items.save(
    collectionId,
    merged as unknown as Parameters<typeof client.items.save>[1],
  );
  return saved as unknown as T;
}
