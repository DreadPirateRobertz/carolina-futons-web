import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

import { SITE_CONTENT_CACHE_TAG } from "@/lib/cms/site-content";

// cfw-sej: centralised cache invalidation helpers for admin write routes.
// Call sites import these instead of reaching for revalidateTag/revalidatePath
// directly so all invalidation logic lives in one place.

const SITE_CONTENT_DEBOUNCE_MS = 1000;
let lastSiteContentMs = 0;

// Debounced: rapid repeated saves (e.g. Brenda auto-saving while typing) won't
// spam revalidateTag. At most one invalidation per second, per server instance.
export function invalidateSiteContent(): void {
  const now = Date.now();
  if (now - lastSiteContentMs < SITE_CONTENT_DEBOUNCE_MS) return;
  lastSiteContentMs = now;
  revalidateTag(SITE_CONTENT_CACHE_TAG, "default");
}

export function invalidateImage(productId: string): void {
  revalidateTag(`product-${productId}`, "default");
  revalidatePath("/products", "page");
}

export function invalidateGuide(slug: string): void {
  revalidateTag(`guide-${slug}`, "default");
}
