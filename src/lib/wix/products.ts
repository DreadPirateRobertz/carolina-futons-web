// Thin typed accessors for the Wix Stores module.
// NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 enables fixture mode for preview builds.
import type { Product as WixProductSDK } from "@wix/auto_sdk_stores_products";
import type { Collection as WixCollectionSDK } from "@wix/auto_sdk_stores_collections";
import { getWixClient } from "@/lib/wix-client";
import {
  FIXTURE_PRODUCTS,
  getFixtureProductBySlug,
} from "@/lib/fixtures/products";
import {
  FIXTURE_COLLECTIONS,
  getFixtureCollectionBySlug,
} from "@/lib/fixtures/collections";

// Import types directly from the Wix SDK to avoid a self-referential type alias —
// inferring WixProduct from listProducts' return type fails because listProducts
// casts its return to WixProduct[], making the definition depend on itself.
export type WixProduct = WixProductSDK;
export type WixCollection = WixCollectionSDK;

const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

export async function listProducts(limit = 24) {
  if (USE_FIXTURES)
    return FIXTURE_PRODUCTS.slice(0, limit) as unknown as WixProduct[];
  const client = getWixClient();
  const result = await client.products.queryProducts().limit(limit).find();
  return result.items;
}

export async function getProductBySlug(slug: string) {
  if (USE_FIXTURES)
    return getFixtureProductBySlug(slug) as unknown as WixProduct | null;
  const client = getWixClient();
  const result = await client.products
    .queryProducts()
    .eq("slug", slug)
    .limit(1)
    .find();
  return result.items[0] ?? null;
}

export async function listProductsByCollectionId(
  collectionId: string,
  limit = 48,
) {
  if (USE_FIXTURES) {
    const items = (FIXTURE_PRODUCTS as unknown as WixProduct[]).filter((p) =>
      (
        (p as unknown as { collectionIds?: string[] }).collectionIds ?? []
      ).includes(collectionId),
    );
    return items.slice(0, limit);
  }
  const client = getWixClient();
  const result = await client.products
    .queryProducts()
    .hasSome("collectionIds", [collectionId])
    .limit(limit)
    .find();
  return result.items;
}

export async function getCollectionBySlug(slug: string) {
  if (USE_FIXTURES)
    return getFixtureCollectionBySlug(slug) as unknown as WixCollection | null;
  const client = getWixClient();
  const result = await client.collections.getCollectionBySlug(slug);
  return result.collection ?? null;
}

export async function listCollections(limit = 25) {
  if (USE_FIXTURES)
    return FIXTURE_COLLECTIONS.slice(0, limit) as unknown as WixCollection[];
  const client = getWixClient();
  const result = await client.collections
    .queryCollections()
    .limit(limit)
    .find();
  return result.items;
}

// Name-based product search — case-insensitive substring match.
// Fixture mode filters FIXTURE_PRODUCTS in-memory; live mode would call the
// Wix search webMethod. Returns at most `limit` results.
export async function searchProducts(
  q: string,
  limit = 12,
): Promise<WixProduct[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  if (USE_FIXTURES) {
    return (FIXTURE_PRODUCTS as unknown as WixProduct[])
      .filter((p) =>
        ((p as unknown as { name?: string }).name ?? "")
          .toLowerCase()
          .includes(lower),
      )
      .slice(0, limit);
  }
  // TODO(cf-3qt.2): wire Wix search webMethod when Phase 2 search endpoint lands.
  // Returns empty intentionally — avoids an unimplemented live call. This will
  // produce silent empty results in production until wired.
  console.warn("searchProducts: live mode not yet implemented — returning []");
  return [];
}

