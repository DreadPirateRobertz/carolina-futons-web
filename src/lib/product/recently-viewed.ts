// Recently-viewed PDP strip — storage helpers (cf-3qt.7.N.1).
//
// Design notes:
//   * localStorage only — no cookie, no analytics, no server trip. GDPR/CCPA
//     safe: the data never leaves the device, and clearing site data wipes it.
//   * We persist a snapshot of display fields (name / imageUrl / priceText)
//     rather than just an id. The alternative would be a second-request
//     hydration against Wix, which adds latency, a failure mode, and a PII
//     review surface we don't want. A stale snapshot (renamed product) is an
//     acceptable tradeoff — the tile still navigates to the live PDP.
//   * Ring buffer, capacity MAX_RECENT, dedup by id (revisiting a product
//     promotes it to most-recent instead of creating a duplicate).
//   * All reads are defensive: a corrupted / foreign-schema blob returns [].
//     The page renders fine; the next successful push rewrites storage clean.

export const RECENTLY_VIEWED_STORAGE_KEY = "cf:recently-viewed:v1";
export const RECENTLY_VIEWED_MAX = 6;

export type RecentlyViewedItem = {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  priceText?: string;
  viewedAt: number;
};

// Narrow an unknown blob (from JSON.parse) into a validated item, or null.
// The validator runs on every read, so schema drift between releases can't
// crash the strip — bad entries are silently dropped.
function coerceItem(raw: unknown): RecentlyViewedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const slug = typeof r.slug === "string" ? r.slug : null;
  const name = typeof r.name === "string" ? r.name : null;
  const viewedAt = typeof r.viewedAt === "number" ? r.viewedAt : null;
  if (!id || !slug || !name || viewedAt === null) return null;
  const imageUrl = typeof r.imageUrl === "string" ? r.imageUrl : undefined;
  const priceText = typeof r.priceText === "string" ? r.priceText : undefined;
  return { id, slug, name, imageUrl, priceText, viewedAt };
}

export function readRecentlyViewed(
  storage: Pick<Storage, "getItem"> | null | undefined,
): RecentlyViewedItem[] {
  if (!storage) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
  } catch {
    // Safari private mode, quota failures, or a sandboxed iframe can throw
    // on .getItem. Swallow and render empty — not worth a Sentry event.
    return [];
  }
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const items: RecentlyViewedItem[] = [];
  for (const candidate of parsed) {
    const item = coerceItem(candidate);
    if (item) items.push(item);
  }
  return items.slice(0, RECENTLY_VIEWED_MAX);
}

// Pure ring-buffer update. Returns the new list; caller persists if desired.
// Re-visiting an existing id promotes that entry to index 0 (most recent)
// rather than appending a duplicate, so the "last 6 unique" invariant holds
// even when a user pogo-sticks between the same pair of products.
export function pushRecentlyViewed(
  current: ReadonlyArray<RecentlyViewedItem>,
  next: RecentlyViewedItem,
): RecentlyViewedItem[] {
  const deduped = current.filter((item) => item.id !== next.id);
  return [next, ...deduped].slice(0, RECENTLY_VIEWED_MAX);
}

export function writeRecentlyViewed(
  storage: Pick<Storage, "setItem"> | null | undefined,
  items: ReadonlyArray<RecentlyViewedItem>,
): void {
  if (!storage) return;
  try {
    storage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or blocked — accept the loss silently. The in-memory
    // list returned by pushRecentlyViewed still reflects this session.
  }
}
