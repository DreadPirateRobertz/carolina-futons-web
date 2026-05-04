import "server-only";

// FBT (Frequently Bought Together) / Also Bought query helper — cf-l6aj.1.
//
// Strategy (two-tier, in priority order):
//   1. Wix Data CMS collection "AlsoBought" — curated or script-populated
//      from order co-occurrence. Fields: productId (string), relatedProductIds
//      (string[]). An editor or a nightly job writes this; the PDP reads it.
//   2. Fallback to category cross-sell (products sharing collections) when
//      no CMS record exists for this product. Identical to PdpCrossSell's
//      data source, just scoped to MAX_ALSO_BOUGHT items.
//
// The CMS-first approach avoids a real-time aggregation query on every PDP
// load (which would be slow and costly for a small Wix store).

import { getWixClient } from "@/lib/wix-client";
import { logWixFailure, toReaderError, type ReaderError } from "@/lib/wix/errors";
import type { WixProduct } from "@/lib/wix/products";

export type AlsoBoughtError = ReaderError;

export type AlsoBoughtResult = {
  items: WixProduct[];
  error?: AlsoBoughtError;
  /** "cms" when CMS data was used; "category" when the cross-sell fallback fired. */
  source?: "cms" | "category";
};

export type AlsoBoughtSource = {
  _id?: string | null;
  collectionIds?: readonly string[] | null;
};

export const MAX_ALSO_BOUGHT = 4;

// CMS collection name for the curated FBT data (create in Wix CMS panel).
const CMS_COLLECTION = "AlsoBought";

type AlsoBoughtRecord = {
  productId: string;
  relatedProductIds: string[];
};

export async function getAlsoBoughtProducts(
  source: AlsoBoughtSource,
): Promise<AlsoBoughtResult> {
  const productId = source._id ?? null;

  // ── Fixture mode shortcut ────────────────────────────────────────────────
  // In fixture mode there are no real Wix CMS collections. Skip both tiers
  // and return empty so fixture PDPs aren't broken.
  if (process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1") {
    return { items: [], source: "cms" };
  }

  // ── Tier 1: CMS curated FBT record ───────────────────────────────────────
  if (productId) {
    try {
      const client = getWixClient();
      const cmsResult = await client.items
        .query(CMS_COLLECTION)
        .eq("productId", productId)
        .limit(1)
        .find();

      const record = cmsResult.items[0] as unknown as AlsoBoughtRecord | undefined;
      const relatedIds =
        record?.relatedProductIds?.filter((id): id is string => typeof id === "string" && id.length > 0) ?? [];

      if (relatedIds.length > 0) {
        const productResult = await client.products
          .queryProducts()
          .hasSome("_id", relatedIds.slice(0, MAX_ALSO_BOUGHT))
          .limit(MAX_ALSO_BOUGHT)
          .find();
        return { items: productResult.items as WixProduct[], source: "cms" };
      }
    } catch (err) {
      await logWixFailure("getAlsoBoughtProducts", "cms tier", err);
      // CMS query failed — fall through to category fallback silently.
    }
  }

  // ── Tier 2: Category cross-sell fallback ─────────────────────────────────
  const collectionIds = (source.collectionIds ?? []).filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );

  if (collectionIds.length === 0) {
    return { items: [], source: "category" };
  }

  try {
    const client = getWixClient();
    let query = client.products
      .queryProducts()
      .hasSome("collectionIds", collectionIds);

    if (typeof productId === "string" && productId.length > 0) {
      query = query.ne("_id", productId);
    }

    const result = await query.limit(MAX_ALSO_BOUGHT).find();
    return { items: result.items as WixProduct[], source: "category" };
  } catch (err) {
    await logWixFailure("getAlsoBoughtProducts", "category fallback", err);
    return { items: [], error: toReaderError(err), source: "category" };
  }
}
