import { describe, expect, it } from "vitest";
import { extractSpinFrames } from "@/lib/product/spin-frames";
import type { GalleryMediaItem } from "@/lib/product/variant-selection";

function frame(index: number, opts: { title?: string; alt?: string; type?: string } = {}): GalleryMediaItem {
  const i = String(index).padStart(3, "0");
  return {
    image: { url: `https://cdn/spin-${i}.jpg`, altText: opts.alt },
    title: opts.title ?? `spin-${i}`,
    mediaType: opts.type ?? "image",
  };
}

describe("extractSpinFrames", () => {
  it("returns empty when no media items", () => {
    expect(extractSpinFrames(undefined)).toEqual([]);
    expect(extractSpinFrames([])).toEqual([]);
  });

  it("returns empty when fewer than threshold spin frames", () => {
    const items = Array.from({ length: 5 }, (_, i) => frame(i));
    expect(extractSpinFrames(items)).toEqual([]);
  });

  it("returns sorted frame URLs when threshold is met (default 12)", () => {
    const items = Array.from({ length: 12 }, (_, i) => frame(i));
    const result = extractSpinFrames(items);
    expect(result).toHaveLength(12);
    expect(result[0]).toBe("https://cdn/spin-000.jpg");
    expect(result[11]).toBe("https://cdn/spin-011.jpg");
  });

  it("sorts numerically rather than lexicographically", () => {
    const items: GalleryMediaItem[] = [];
    for (const i of [10, 2, 1, 20, 3, 4, 5, 6, 7, 8, 9, 11]) {
      items.push(frame(i));
    }
    const result = extractSpinFrames(items);
    // 12 frames, sorted ascending by parsed index, NOT by zero-padded string
    expect(result[0]).toContain("spin-001.jpg");
    expect(result[1]).toContain("spin-002.jpg");
    expect(result[2]).toContain("spin-003.jpg");
    expect(result[10]).toContain("spin-011.jpg");
    expect(result[11]).toContain("spin-020.jpg");
  });

  it("matches 'spin 1', 'spin_1', 'spin-1' all alike (case-insensitive)", () => {
    const items: GalleryMediaItem[] = [
      { image: { url: "u1" }, title: "Spin 1", mediaType: "image" },
      { image: { url: "u2" }, title: "spin_2", mediaType: "image" },
      { image: { url: "u3" }, title: "spin-3", mediaType: "image" },
      { image: { url: "u4" }, title: "SPIN4", mediaType: "image" },
    ];
    // Below threshold but verifies the match logic; lower threshold for the test.
    expect(extractSpinFrames(items, 4)).toEqual(["u1", "u2", "u3", "u4"]);
  });

  it("falls back to image.altText when title doesn't match", () => {
    const items: GalleryMediaItem[] = Array.from({ length: 12 }, (_, i) => ({
      image: { url: `u${i}`, altText: `spin-${String(i).padStart(2, "0")}` },
      title: "marketing photo",
      mediaType: "image",
    }));
    const result = extractSpinFrames(items);
    expect(result).toHaveLength(12);
    expect(result[0]).toBe("u0");
  });

  it("skips non-image media items even when title matches", () => {
    const items: GalleryMediaItem[] = Array.from({ length: 12 }, (_, i) =>
      frame(i, { type: i === 0 ? "video" : "image" }),
    );
    const result = extractSpinFrames(items);
    // Video at index 0 dropped → only 11 frames → below threshold → []
    expect(result).toEqual([]);
  });

  it("skips items missing image.url", () => {
    const items: GalleryMediaItem[] = [
      ...Array.from({ length: 11 }, (_, i) => frame(i + 1)),
      { image: { url: undefined }, title: "spin-100", mediaType: "image" },
    ];
    expect(extractSpinFrames(items)).toEqual([]);
  });

  it("ignores marketing photos that happen to mention 'spin' mid-string", () => {
    // "evening spinach" should NOT count — anchor at start of title.
    const items: GalleryMediaItem[] = Array.from({ length: 12 }, (_, i) => ({
      image: { url: `u${i}` },
      title: "evening spinach photo",
      mediaType: "image",
    }));
    expect(extractSpinFrames(items)).toEqual([]);
  });

  it("ignores items with no spin-pattern match", () => {
    const items: GalleryMediaItem[] = Array.from({ length: 12 }, (_, i) => ({
      image: { url: `u${i}` },
      title: `front-${i}`,
      mediaType: "image",
    }));
    expect(extractSpinFrames(items)).toEqual([]);
  });

  it("custom threshold accepts smaller frame counts", () => {
    const items = Array.from({ length: 4 }, (_, i) => frame(i));
    expect(extractSpinFrames(items, 4)).toHaveLength(4);
  });
});
