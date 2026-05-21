import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

import { SITE_CONTENT_CACHE_TAG } from "@/lib/cms/site-content";
import { logError } from "@/lib/observability/log";

// cfw-sej: centralised cache invalidation helpers for admin write routes.
// Call sites import these instead of reaching for revalidateTag/revalidatePath
// directly so all invalidation logic lives in one place.
//
// All helpers are fail-soft: Next.js cache APIs can throw in edge-runtime or
// out-of-context invocations. A throw is logged + swallowed so the route still
// returns 200 — a cache miss on the next read is preferable to a spurious 500
// after the Wix write already succeeded.

export function invalidateSiteContent(): void {
  try {
    revalidateTag(SITE_CONTENT_CACHE_TAG, "default");
  } catch (err) {
    logError("admin/revalidate", "invalidateSiteContent failed", err);
  }
}

// revalidateTag("product-{id}") is forward-looking scaffolding: no read path
// currently registers a product-{id} tag, so it is a no-op until PDP pages
// opt in via unstable_cache. revalidatePath covers the current path-based ISR.
export function invalidateImage(productId: string): void {
  try {
    revalidateTag(`product-${productId}`, "default");
    revalidatePath("/products", "page");
  } catch (err) {
    logError("admin/revalidate", "invalidateImage failed", err);
  }
}

// Forward-declared for guide invalidation when guide pages add cache tags
// (guide-{slug} via unstable_cache in the planned src/lib/cms/guides.ts).
export function invalidateGuide(slug: string): void {
  try {
    revalidateTag(`guide-${slug}`, "default");
  } catch (err) {
    logError("admin/revalidate", "invalidateGuide failed", err);
  }
}
