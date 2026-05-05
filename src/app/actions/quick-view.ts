"use server";

import { getProductBySlug, type WixProduct } from "@/lib/wix/products";

export type QuickViewResult =
  | { ok: true; product: WixProduct }
  | { ok: false; error: "not_found" | "fetch_failed" };

export async function fetchQuickViewProduct(
  slug: string,
): Promise<QuickViewResult> {
  if (!slug || typeof slug !== "string") {
    return { ok: false, error: "not_found" };
  }
  try {
    const product = await getProductBySlug(slug);
    if (!product) return { ok: false, error: "not_found" };
    return { ok: true, product };
  } catch {
    return { ok: false, error: "fetch_failed" };
  }
}
