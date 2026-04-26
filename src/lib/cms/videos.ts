import "server-only";

import { listCollectionItems } from "@/lib/wix/data";
import { logWixFailure, toReaderError } from "@/lib/wix/errors";
import {
  getVideoCatalog,
  type VideoCategory,
  type VideoEntry,
  type VideoSource,
} from "@/lib/videos/catalog";

// cf-afjw: Videos CMS layer.
//
// Wix Studio backs a VideoGallery CMS collection with fields matching
// VideoEntry. listVideos() is called at render time (no internal cache)
// so adding a video in Wix CMS appears without a code deploy.
//
// Falls back to the static catalog in catalog.ts on empty collection or
// Wix outage. Returns {items, error?, fallback?} — the same shape used
// by derived-products.ts and listFaqs() across the reader layer.

const VIDEO_COLLECTION_ID = "VideoGallery";
const VIDEO_FETCH_LIMIT = 100; // well above the expected catalog size (~17 items)

const VALID_CATEGORIES = new Set<VideoCategory>([
  "overview",
  "futon",
  "conversion",
  "assembly",
]);

const VALID_SOURCES = new Set<VideoSource>(["wix", "youtube", "mp4"]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isVideoEntry(record: unknown): record is VideoEntry {
  if (typeof record !== "object" || record === null) return false;
  const r = record as Record<string, unknown>;
  return (
    isNonEmptyString(r.id) &&
    isNonEmptyString(r.title) &&
    typeof r.description === "string" &&
    isNonEmptyString(r.videoUrl) &&
    VALID_CATEGORIES.has(r.category as VideoCategory) &&
    VALID_SOURCES.has(r.source as VideoSource) &&
    typeof r.sortOrder === "number" &&
    !Number.isNaN(r.sortOrder) &&
    (r.posterUrl === undefined || typeof r.posterUrl === "string") &&
    (r.embedUrl === undefined || typeof r.embedUrl === "string")
  );
}

export type VideoResult = {
  items: ReadonlyArray<VideoEntry>;
  error?: "wix_sdk" | "unexpected";
  fallback?: boolean;
};

export async function listVideos(): Promise<VideoResult> {
  try {
    const raw = await listCollectionItems(VIDEO_COLLECTION_ID, VIDEO_FETCH_LIMIT);
    const items = raw.filter(isVideoEntry);
    if (raw.length > 0 && items.length === 0) {
      // All CMS records failed isVideoEntry — likely a schema change in Wix CMS.
      await logWixFailure("listVideos", "all records failed validation", {
        rawCount: raw.length,
      });
      return { items: getVideoCatalog(), error: "unexpected", fallback: true };
    }
    if (items.length === 0) {
      return { items: getVideoCatalog(), fallback: true };
    }
    return { items: items.sort((a, b) => a.sortOrder - b.sortOrder) };
  } catch (err) {
    await logWixFailure("listVideos", "listCollectionItems", err);
    return { items: getVideoCatalog(), error: toReaderError(err), fallback: true };
  }
}
