import { describe, it, expect } from "vitest";

import {
  filterVideosByCategory,
  getVideoCatalog,
  getVideoCategoryOptions,
} from "@/lib/videos/catalog";

describe("video catalog", () => {
  it("returns the full sorted catalog", () => {
    const all = getVideoCatalog();
    expect(all.length).toBeGreaterThan(0);
    const sorted = [...all].sort((a, b) => a.sortOrder - b.sortOrder);
    expect(all).toEqual(sorted);
  });

  it("builds a Wix-hosted entry with mp4 + poster URLs", () => {
    const intro = getVideoCatalog().find((v) => v.id === "vid-intro");
    expect(intro?.source).toBe("wix");
    expect(intro?.videoUrl).toMatch(
      /^https:\/\/video\.wixstatic\.com\/video\/.+\/1080p\/mp4\/file\.mp4$/,
    );
    expect(intro?.posterUrl).toMatch(/^https:\/\/static\.wixstatic\.com\//);
  });

  it("builds a YouTube entry with embed URL", () => {
    const yt = getVideoCatalog().find((v) => v.id === "v-kd-001");
    expect(yt?.source).toBe("youtube");
    expect(yt?.embedUrl).toBe("https://www.youtube.com/embed/EC1GCQ5CiSo");
    expect(yt?.posterUrl).toMatch(/img\.youtube\.com.+hqdefault/);
  });

  it("builds an MP4 entry without a poster", () => {
    const strata = getVideoCatalog().find((v) => v.id === "v-strata-001");
    expect(strata?.source).toBe("mp4");
    expect(strata?.videoUrl).toContain("Dillon_animation.mp4");
    expect(strata?.posterUrl).toBeUndefined();
  });

  it("categories include All + four scoped filters", () => {
    const opts = getVideoCategoryOptions();
    expect(opts.map((o) => o.id)).toEqual([
      "all",
      "overview",
      "futon",
      "conversion",
      "assembly",
    ]);
  });

  it("filterVideosByCategory returns all when category is 'all' or null", () => {
    const all = getVideoCatalog();
    expect(filterVideosByCategory(all, "all")).toHaveLength(all.length);
    expect(filterVideosByCategory(all, null)).toHaveLength(all.length);
  });

  it("filterVideosByCategory narrows to category", () => {
    const all = getVideoCatalog();
    const futons = filterVideosByCategory(all, "futon");
    expect(futons.length).toBeGreaterThan(0);
    expect(futons.every((v) => v.category === "futon")).toBe(true);
  });

  it("returns a fresh array (callers can mutate without affecting the catalog)", () => {
    const a = getVideoCatalog();
    const b = getVideoCatalog();
    expect(a).not.toBe(b);
    a.pop();
    expect(getVideoCatalog().length).toBe(b.length);
  });
});
