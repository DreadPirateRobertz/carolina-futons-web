// Thin typed accessors for the Wix Stores module.
// Keep these as 1-call wrappers so downstream consumers import once per helper
// instead of pulling the full Wix client construct into page/route files.
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

export async function getProductById(id: string) {
  const client = getWixClient();
  const result = await client.products
    .queryProducts()
    .eq("_id", id)
    .limit(1)
    .find();
  return result.items[0] ?? null;
}

export async function listProductsByCollection(
  collectionId: string,
  limit = 24,
) {
  const client = getWixClient();
  const result = await client.products
    .queryProducts()
    .hasSome("collectionIds", [collectionId])
    .limit(limit)
    .find();
  return result.items;
}

export async function searchProducts(query: string, limit = 24) {
  const client = getWixClient();
  const result = await client.products
    .queryProducts()
    .startsWith("name", query)
    .limit(limit)
    .find();
  return result.items;
}

export type WixProduct = Awaited<ReturnType<typeof listProducts>>[number];
