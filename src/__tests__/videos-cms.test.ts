import { describe, it, expect, vi, beforeEach } from "vitest";

// cf-afjw: videos CMS layer — live → sorted; empty/throw → static fallback;
// all-records-invalid → "unexpected" error; isVideoEntry validates fields.

const listCollectionItems = vi.fn();
const logWixFailure = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) => listCollectionItems(...args),
}));
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
  toReaderError: (err: unknown) =>
    err instanceof Error && err.message === "unexpected" ? "unexpected" : "wix_sdk",
}));

import { listVideos } from "@/lib/cms/videos";
import { getVideoCatalog } from "@/lib/videos/catalog";

beforeEach(() => {
  listCollectionItems.mockReset();
  logWixFailure.mockReset();
  logWixFailure.mockResolvedValue(undefined);
});

const VALID_VIDEO = {
  id: "vid-test",
  title: "Test Frame",
  description: "A test video.",
  category: "futon",
  source: "wix",
  videoUrl: "https://video.wixstatic.com/video/abc/1080p/mp4/file.mp4",
  posterUrl: "https://static.wixstatic.com/media/abc.jpg",
  sortOrder: 5,
};

describe("listVideos", () => {
  it("returns CMS items sorted by sortOrder", async () => {
    const c = { ...VALID_VIDEO, id: "vid-c", sortOrder: 10 };
    const a = { ...VALID_VIDEO, id: "vid-a", sortOrder: 1 };
    const b = { ...VALID_VIDEO, id: "vid-b", sortOrder: 5 };
    listCollectionItems.mockResolvedValueOnce([c, a, b]);
    const result = await listVideos();
    expect(result.fallback).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.items.map((v) => v.id)).toEqual(["vid-a", "vid-b", "vid-c"]);
  });

  it("filters out records with missing or invalid required fields", async () => {
    listCollectionItems.mockResolvedValueOnce([
      VALID_VIDEO,
      { ...VALID_VIDEO, id: "" },               // empty id
      { ...VALID_VIDEO, title: "" },             // empty title
      { ...VALID_VIDEO, videoUrl: "" },          // empty videoUrl
      { ...VALID_VIDEO, category: "unknown" },   // invalid category
      { ...VALID_VIDEO, source: "vimeo" },       // invalid source
      { ...VALID_VIDEO, sortOrder: null },        // null sortOrder
      { ...VALID_VIDEO, sortOrder: NaN },         // NaN sortOrder
      { ...VALID_VIDEO, sortOrder: "5" },         // string sortOrder
      { ...VALID_VIDEO, description: null },      // null description
      "not an object",
    ]);
    const result = await listVideos();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(VALID_VIDEO.id);
    expect(result.fallback).toBeUndefined();
  });

  it("filters out records with non-string optional URL fields", async () => {
    listCollectionItems.mockResolvedValueOnce([
      VALID_VIDEO,
      { ...VALID_VIDEO, id: "vid-bad-poster", posterUrl: 42 },
      { ...VALID_VIDEO, id: "vid-bad-embed", embedUrl: true },
    ]);
    const result = await listVideos();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(VALID_VIDEO.id);
  });

  it("passes optional fields through intact", async () => {
    const full = {
      ...VALID_VIDEO,
      source: "youtube" as const,
      embedUrl: "https://www.youtube.com/embed/abc123",
      productSlug: "test-frame",
      brand: "KD Frames",
    };
    listCollectionItems.mockResolvedValueOnce([full]);
    const result = await listVideos();
    expect(result.items[0].embedUrl).toBe(full.embedUrl);
    expect(result.items[0].productSlug).toBe(full.productSlug);
    expect(result.items[0].brand).toBe(full.brand);
  });

  it("falls back to static catalog when CMS returns empty", async () => {
    listCollectionItems.mockResolvedValueOnce([]);
    const result = await listVideos();
    expect(result.fallback).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.items).toEqual(getVideoCatalog());
    expect(logWixFailure).not.toHaveBeenCalled();
  });

  it("returns error='unexpected' and logs when all CMS records fail validation", async () => {
    listCollectionItems.mockResolvedValueOnce([
      { ...VALID_VIDEO, category: "unknown" },
      { ...VALID_VIDEO, source: "vimeo" },
    ]);
    const result = await listVideos();
    expect(result.fallback).toBe(true);
    expect(result.error).toBe("unexpected");
    expect(result.items).toEqual(getVideoCatalog());
    expect(logWixFailure).toHaveBeenCalledWith(
      "listVideos",
      "all records failed validation",
      expect.objectContaining({ rawCount: 2 }),
    );
  });

  it("falls back with error='wix_sdk' and logs when CMS throws", async () => {
    listCollectionItems.mockRejectedValueOnce(new Error("network"));
    const result = await listVideos();
    expect(result.fallback).toBe(true);
    expect(result.error).toBe("wix_sdk");
    expect(result.items).toEqual(getVideoCatalog());
    expect(logWixFailure).toHaveBeenCalledWith(
      "listVideos",
      "listCollectionItems",
      expect.any(Error),
    );
  });

  it("queries the VideoGallery collection with the configured limit", async () => {
    listCollectionItems.mockResolvedValueOnce([]);
    await listVideos();
    expect(listCollectionItems).toHaveBeenCalledWith("VideoGallery", 100);
  });
});
