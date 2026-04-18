// PDP cross-sell reader: "You might also like" row beneath a product's
// description. Strategy for the warm-up phase is collection-based similarity —
// query products sharing one of the source product's collections, excluding
// the source itself. Manual editor curation is deferred.
//
// Follows the PR #35 reader convention: returns { items, error? } where error
// is "wix_sdk" | "unexpected". Callers MUST branch on error before rendering
// the silent empty-state (an SDK outage must not render as "nothing to show").

import { getWixClient } from "@/lib/wix-client";
import { logWixFailure, toReaderError, type ReaderError } from "@/lib/wix/errors";
import type { WixProduct } from "@/lib/wix/products";

export type CrossSellError = ReaderError;

export type CrossSellResult = {
  items: WixProduct[];
  error?: CrossSellError;
};

export type GetCrossSellOptions = {
  limit?: number;
};

const DEFAULT_LIMIT = 4;

// Minimal structural type — we only need _id + collectionIds from the source.
// Kept local so callers can pass a test fixture without building a full WixProduct.
type CrossSellSource = {
  _id?: string | null;
  collectionIds?: readonly string[] | null;
};

export async function getCrossSellProducts(
  source: CrossSellSource,
  opts: GetCrossSellOptions = {},
): Promise<CrossSellResult> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`getCrossSellProducts: limit must be a positive integer, got: ${limit}`);
  }

  const collectionIds = (source.collectionIds ?? []).filter((id): id is string => typeof id === "string" && id.length > 0);
  if (collectionIds.length === 0) {
    // A product with no collections has no collection-based neighbors. Not an
    // error — return empty. Editor curation (a future phase) would fill this gap.
    return { items: [] };
  }

  try {
    const client = getWixClient();
    let query = client.products
      .queryProducts()
      .hasSome("collectionIds", collectionIds);
    // Exclude the source product itself when we know its id. Skipping the .ne
    // call when _id is missing keeps the helper usable for "recommended from
    // this collection" callers that pass a partial source.
    if (typeof source._id === "string" && source._id.length > 0) {
      query = query.ne("_id", source._id);
    }
    const result = await query.limit(limit).find();
    return { items: result.items };
  } catch (err) {
    await logWixFailure(
      "cross-sell",
      `getCrossSellProducts(collections=${collectionIds.join(",")})`,
      err,
    );
    return { items: [], error: toReaderError(err) };
  }
}
