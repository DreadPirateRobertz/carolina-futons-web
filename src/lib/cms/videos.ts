import "server-only";

import { listCollectionItems } from "@/lib/wix/data";
import {
  getVideoCatalog,
  type VideoCategory,
  type VideoEntry,
  type VideoSource,
} from "@/lib/videos/catalog";

// cf-afjw: Videos CMS layer.
//
// Wix Studio backs a VideoGallery CMS collection with fields matching
// VideoEntry. We pull it at render time so adding a video in Wix CMS
// appears without a code deploy.
//
// Falls back to the static catalog in catalog.ts on empty collection or
// Wix outage — the same {items, error?, fallback?} contract faq.ts uses.

const VIDEO_COLLECTION_ID = "VideoGallery";
const VIDEO_FETCH_LIMIT = 100;

const VALID_CATEGORIES = new Set<VideoCategory>([
  "overview",
  "futon",
  "conversion",
  "assembly",
]);

const VALID_SOURCES = new Set<VideoSource>(["wix", "youtube", "mp4"]);

function isVideoEntry(record: unknown): record is VideoEntry {
  if (typeof record !== "object" || record === null) return false;
  const r = record as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.title === "string" &&
    r.title.length > 0 &&
    typeof r.description === "string" &&
    typeof r.videoUrl === "string" &&
    r.videoUrl.length > 0 &&
    VALID_CATEGORIES.has(r.category as VideoCategory) &&
    VALID_SOURCES.has(r.source as VideoSource) &&
    typeof r.sortOrder === "number"
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
    if (items.length === 0) {
      return { items: getVideoCatalog(), fallback: true };
    }
    return { items: items.sort((a, b) => a.sortOrder - b.sortOrder) };
  } catch {
    return { items: getVideoCatalog(), error: "wix_sdk", fallback: true };
  }
}
