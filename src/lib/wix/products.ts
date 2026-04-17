// Thin typed accessors for the Wix Stores module.
// Keep these as 1-call wrappers so downstream consumers import once per helper
// instead of pulling the full Wix client construct into page/route files.
//
// Query shape + field names follow @wix/stores @ 1.0.750 (queryProducts builder).
// Godfrey/rennala — add filters/sorts here as Phase 2 lands, do not inline
// wix-client.products queries in page components.
import { getWixClient } from "@/lib/wix-client";

export async function listProducts(limit = 24) {
  const client = getWixClient();
  const result = await client.products.queryProducts().limit(limit).find();
  return result.items;
}

export async function getProductBySlug(slug: string) {
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
  const client = getWixClient();
  const result = await client.products
    .queryProducts()
    .hasSome("collectionIds", [collectionId])
    .limit(limit)
    .find();
  return result.items;
}

export async function getCollectionBySlug(slug: string) {
  const client = getWixClient();
  const result = await client.collections.getCollectionBySlug(slug);
  return result.collection ?? null;
}

export async function listCollections(limit = 25) {
  const client = getWixClient();
  const result = await client.collections
    .queryCollections()
    .limit(limit)
    .find();
  return result.items;
}

export type WixProduct = Awaited<ReturnType<typeof listProducts>>[number];
export type WixCollection = Awaited<
  ReturnType<typeof listCollections>
>[number];
