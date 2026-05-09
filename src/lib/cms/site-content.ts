import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { listCollectionItems } from "@/lib/wix/data";

// cf-4mol (cfw-66o.2): site-owner-editable copy reader.
//
// Brenda (site owner, non-technical) edits hardcoded copy via a Wix CMS
// collection named "SiteContent" instead of bothering engineering. Each row
// is a single string keyed by a dotted path — e.g. "footer.tagline",
// "hero.headline", "visit.address.street". This module gives the call sites
// a single read API: `getSiteContent(key, fallback)`.
//
// Two-level caching:
//   1. unstable_cache (cross-request, revalidate=300s, tag="site-content")
//      — every page that reads owner copy reuses the same Wix snapshot for
//      five minutes instead of paying a cold round-trip per render. Brenda's
//      edits propagate within the revalidate window or via the
//      revalidateTag("site-content") webhook for instant publishes.
//   2. React.cache (per-request) — Footer + MobileMenu + AnnouncementBar
//      in the same render share one Map allocation and one promise.
//
// Failure shape mirrors faq.ts: callers always get a usable string. We never
// throw to the caller. If Wix is down OR the SiteContent collection hasn't
// been provisioned yet OR the key is missing, the caller's fallback wins.
// This means refactor PRs can ship one string at a time — `getSiteContent
// ("hero.headline", "Carolina Futons — hardwood frames")` works correctly
// today (returns the fallback) and switches to the live value the moment
// Brenda fills in the row.

export type SiteContentItem = {
  key: string;
  value: string;
};

export type SiteContentResult = {
  map: ReadonlyMap<string, string>;
  // Set when the live read failed. We still hand back a (likely empty) map
  // and let callers fall back; surfaced for diagnostic / page-level banners.
  error?: "wix_sdk" | "unexpected";
};

const COLLECTION_ID = "SiteContent";

// Reasonable safety ceiling — the collection is hand-curated copy keys, not
// catalog data. Anything above this is almost certainly a misconfiguration
// and we'd rather skip the tail than pay an unbounded read.
const MAX_ITEMS = 500;

// cfw-vxb: cache tag — call revalidateTag("site-content") to publish Brenda's
// edits before the 5-minute revalidate window expires. Kept exported so any
// CMS-webhook route can `import { SITE_CONTENT_CACHE_TAG } from ...` without
// duplicating the literal.
export const SITE_CONTENT_CACHE_TAG = "site-content";

// Defensive coerce. Wix RICH_TEXT can return non-string shapes; we treat
// anything non-string as "no value" and let the caller's fallback win.
function coerceValue(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  return null;
}

type SerializedResult =
  | { entries: Array<readonly [string, string]>; error?: undefined }
  | { entries: Array<readonly [string, string]>; error: "wix_sdk" | "unexpected" };

// cfw-vxb: cross-request layer. unstable_cache stores a serializable shape
// (entries array, not Map — the fetch cache JSON-encodes the result). The
// React.cache wrapper below converts back to Map for callers and keeps the
// per-render dedupe.
const loadSerializedSiteContent = unstable_cache(
  async (): Promise<SerializedResult> => {
    try {
      const items = await listCollectionItems<{ key?: unknown; value?: unknown }>(
        COLLECTION_ID,
        MAX_ITEMS,
      );
      const entries: Array<readonly [string, string]> = [];
      for (const item of items) {
        const key = typeof item.key === "string" ? item.key : null;
        const value = coerceValue(item.value);
        if (key && value !== null) {
          entries.push([key, value]);
        }
      }
      return { entries };
    } catch (err) {
      const tag =
        err && typeof err === "object" && "code" in err
          ? "wix_sdk"
          : "unexpected";
      return { entries: [], error: tag };
    }
  },
  ["site-content-snapshot-v1"],
  { revalidate: 300, tags: [SITE_CONTENT_CACHE_TAG] },
);

// Cached per-request via React.cache so Footer + MobileMenu + AnnouncementBar
// share one Map allocation in a single render.
export const loadSiteContent = cache(async (): Promise<SiteContentResult> => {
  const { entries, error } = await loadSerializedSiteContent();
  const map = new Map<string, string>(entries);
  return error ? { map, error } : { map };
});

/**
 * Read a single piece of owner-editable copy.
 *
 * Always returns a string — falls back to `fallback` (or "") when Wix is
 * unreachable, the SiteContent collection isn't provisioned yet, or the key
 * isn't present.
 */
export async function getSiteContent(
  key: string,
  fallback = "",
): Promise<string> {
  const { map } = await loadSiteContent();
  return map.get(key) ?? fallback;
}
