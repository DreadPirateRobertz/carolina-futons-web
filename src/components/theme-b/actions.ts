"use server";

import { listProducts, type WixProduct } from "@/lib/wix/products";

// Server action: returns the next page of products for the Marugame Grid's
// "Load more" button. `offset` is the count of products already rendered.
export async function fetchMoreMarugameProducts(
  offset: number,
  limit: number,
): Promise<WixProduct[]> {
  const all = await listProducts(offset + limit);
  return all.slice(offset, offset + limit);
}
