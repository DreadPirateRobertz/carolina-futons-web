import { describe, it, expect, vi, beforeEach } from "vitest";

// cf-afjw: videos CMS layer — fallback semantics.
//
// listCollectionItems is mocked so the test never reaches the Wix client.
// Contract: live read with valid items → return them sorted by sortOrder;
// empty live read → fallback to static catalog with fallback=true;
// thrown live read → fallback + error="wix_sdk".

const listCollectionItems = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) => listCollectionItems(...args),
}));

import { listVideos } from "@/lib/cms/videos";
import { getVideoCatalog } from "@/lib/videos/catalog";

beforeEach(() => {
  listCollectionItems.mockReset();
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
  it("returns sorted CMS items when the live read succeeds", async () => {
    const b = { ...VALID_VIDEO, id: "vid-b", sortOrder: 20 };
    const a = { ...VALID_VIDEO, id: "vid-a", sortOrder: 1 };
    listCollectionItems.mockResolvedValueOnce([b, a]);
    const result = await listVideos();
    expect(result.fallback).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.items[0].id).toBe("vid-a");
    expect(result.items[1].id).toBe("vid-b");
  });

  it("filters out records with missing required fields", async () => {
    listCollectionItems.mockResolvedValueOnce([
      VALID_VIDEO,
      { ...VALID_VIDEO, id: "" },               // empty id
      { ...VALID_VIDEO, title: "" },             // empty title
      { ...VALID_VIDEO, videoUrl: "" },          // empty videoUrl
      { ...VALID_VIDEO, category: "unknown" },   // invalid category
      { ...VALID_VIDEO, source: "vimeo" },       // invalid source
      "not an object",
    ]);
    const result = await listVideos();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(VALID_VIDEO.id);
  });

  it("falls back to static catalog when CMS returns empty", async () => {
    listCollectionItems.mockResolvedValueOnce([]);
    const result = await listVideos();
    expect(result.fallback).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.items).toEqual(getVideoCatalog());
  });

  it("falls back to static catalog with error='wix_sdk' when CMS throws", async () => {
    listCollectionItems.mockRejectedValueOnce(new Error("network"));
    const result = await listVideos();
    expect(result.fallback).toBe(true);
    expect(result.error).toBe("wix_sdk");
    expect(result.items).toEqual(getVideoCatalog());
  });

  it("queries the VideoGallery collection", async () => {
    listCollectionItems.mockResolvedValueOnce([VALID_VIDEO]);
    await listVideos();
    expect(listCollectionItems).toHaveBeenCalledWith("VideoGallery", expect.any(Number));
  });
});
