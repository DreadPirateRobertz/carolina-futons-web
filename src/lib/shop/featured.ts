import { listProducts, type WixProduct } from "@/lib/wix/products";

// Featured strip contract (cf-5j9x): 4–6 products rendered on the home page.
// Below 4 reads as a data bug; above 6 overflows the 2×3 / 3×2 grid the
// home page uses. Oversample from Wix so filtering (unroutable stubs) has
// headroom before we slice.
export const FEATURED_MIN = 4;
export const FEATURED_MAX = 6;
const OVERSAMPLE_FACTOR = 2;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(n, max));
}

export async function listFeaturedProducts(
  desired: number = FEATURED_MAX,
): Promise<WixProduct[]> {
  const target = clamp(desired, FEATURED_MIN, FEATURED_MAX);
  const raw = await listProducts(FEATURED_MAX * OVERSAMPLE_FACTOR);
  const eligible = raw.filter(
    (p) => typeof p.slug === "string" && p.slug.length > 0,
  );
  return eligible.slice(0, target);
}
