import { describe, it, expect } from "vitest";

import { wixImageUrl } from "@/lib/wix/wix-image";

const WIX_3K =
  "https://static.wixstatic.com/media/ed8a72_35006906fc78471cae8abb40b6f65006~mv2.jpg/v1/fit/w_3000,h_2000,q_90/file.jpg";
const WIX_BARE =
  "https://static.wixstatic.com/media/ed8a72_99f11e8a3a1d4ce782e0dd3bcaa863d3~mv2.png";
const WIX_FILL =
  "https://static.wixstatic.com/media/abc_xyz~mv2.jpg/v1/fill/w_500,h_500,q_85,al_c/file.jpg";

describe("wixImageUrl", () => {
  it("rewrites the /v1/fit slot to retina-doubled w/h with quality 85 by default", () => {
    expect(wixImageUrl(WIX_3K, 480, 480)).toBe(
      "https://static.wixstatic.com/media/ed8a72_35006906fc78471cae8abb40b6f65006~mv2.jpg/v1/fit/w_960,h_960,q_85/file.jpg",
    );
  });

  it("preserves the original mode (fill stays fill) when mode is not overridden", () => {
    expect(wixImageUrl(WIX_FILL, 100, 100)).toBe(
      "https://static.wixstatic.com/media/abc_xyz~mv2.jpg/v1/fit/w_200,h_200,q_85/file.jpg",
    );
    // Caller can still force a mode explicitly.
    expect(wixImageUrl(WIX_FILL, 100, 100, { mode: "fill" })).toBe(
      "https://static.wixstatic.com/media/abc_xyz~mv2.jpg/v1/fill/w_200,h_200,q_85/file.jpg",
    );
  });

  it("inserts the /v1/fit slot when the URL is bare (no transform segment)", () => {
    expect(wixImageUrl(WIX_BARE, 64, 64)).toBe(
      "https://static.wixstatic.com/media/ed8a72_99f11e8a3a1d4ce782e0dd3bcaa863d3~mv2.png/v1/fit/w_128,h_128,q_85/file.png",
    );
  });

  it("derives the file extension from the URL when inserting the slot", () => {
    expect(wixImageUrl(WIX_BARE.replace(".png", ".jpg"), 64, 64)).toContain(
      "/file.jpg",
    );
    expect(
      wixImageUrl(WIX_BARE.replace(".png", ".webp"), 64, 64),
    ).toContain("/file.webp");
  });

  it("respects the quality option", () => {
    expect(wixImageUrl(WIX_3K, 480, 480, { quality: 70 })).toContain("q_70");
    expect(wixImageUrl(WIX_3K, 480, 480, { quality: 100 })).toContain(
      "q_100",
    );
  });

  it("clamps quality to [1, 100] and rejects NaN", () => {
    expect(wixImageUrl(WIX_3K, 480, 480, { quality: 9999 })).toContain(
      "q_100",
    );
    expect(wixImageUrl(WIX_3K, 480, 480, { quality: 0 })).toContain("q_1");
    expect(wixImageUrl(WIX_3K, 480, 480, { quality: NaN })).toContain("q_85");
  });

  it("clamps target width/height to [16, 4000] and rounds to integers", () => {
    expect(wixImageUrl(WIX_3K, 1, 1)).toContain("w_16,h_16"); // floor
    expect(wixImageUrl(WIX_3K, 5000, 5000)).toContain("w_4000,h_4000"); // ceiling
    expect(wixImageUrl(WIX_3K, 100.6, 99.4)).toContain("w_201,h_199"); // round*2
  });

  it("returns non-Wix URLs unchanged", () => {
    expect(wixImageUrl("https://example.com/foo.jpg", 480, 480)).toBe(
      "https://example.com/foo.jpg",
    );
    expect(wixImageUrl("/local/path.png", 100, 100)).toBe("/local/path.png");
  });

  it("returns empty string for null / undefined / empty input", () => {
    expect(wixImageUrl(null, 100, 100)).toBe("");
    expect(wixImageUrl(undefined, 100, 100)).toBe("");
    expect(wixImageUrl("", 100, 100)).toBe("");
  });

  it("idempotent — applying the constrainer to its own output yields the same URL", () => {
    const once = wixImageUrl(WIX_3K, 480, 480);
    expect(wixImageUrl(once, 480, 480)).toBe(once);
  });
});
