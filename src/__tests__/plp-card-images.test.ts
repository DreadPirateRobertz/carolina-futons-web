import { describe, it, expect } from "vitest";

import {
  getPlpCardImages,
  type PlpCardMediaProduct,
} from "@/lib/product/plp-card-images";

describe("getPlpCardImages — primary selection", () => {
  it("returns the mainMedia URL as primary", () => {
    const product: PlpCardMediaProduct = {
      media: { mainMedia: { image: { url: "https://cdn/main.jpg" } } },
    };
    expect(getPlpCardImages(product).primary).toBe("https://cdn/main.jpg");
  });

  it("returns null primary when media is absent", () => {
    expect(getPlpCardImages({}).primary).toBeNull();
  });

  it("returns null primary when mainMedia.image.url is missing", () => {
    expect(getPlpCardImages({ media: { mainMedia: {} } }).primary).toBeNull();
  });
});

describe("getPlpCardImages — secondary selection", () => {
  it("picks the first distinct items[] image as secondary", () => {
    const product: PlpCardMediaProduct = {
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [
          { image: { url: "https://cdn/alt.jpg" }, mediaType: "image" },
        ],
      },
    };
    expect(getPlpCardImages(product).secondary).toBe("https://cdn/alt.jpg");
  });

  it("skips items whose URL equals primary (dedup)", () => {
    const product: PlpCardMediaProduct = {
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [
          { image: { url: "https://cdn/main.jpg" }, mediaType: "image" },
          { image: { url: "https://cdn/real-second.jpg" }, mediaType: "image" },
        ],
      },
    };
    expect(getPlpCardImages(product).secondary).toBe(
      "https://cdn/real-second.jpg",
    );
  });

  it("skips non-image mediaType entries (video, etc.)", () => {
    const product: PlpCardMediaProduct = {
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [
          { image: { url: "https://cdn/clip.mp4" }, mediaType: "video" },
          { image: { url: "https://cdn/alt.jpg" }, mediaType: "image" },
        ],
      },
    };
    expect(getPlpCardImages(product).secondary).toBe("https://cdn/alt.jpg");
  });

  it("treats missing mediaType as image (permissive for sparse Wix payloads)", () => {
    const product: PlpCardMediaProduct = {
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [{ image: { url: "https://cdn/alt.jpg" } }],
      },
    };
    expect(getPlpCardImages(product).secondary).toBe("https://cdn/alt.jpg");
  });

  it("returns null secondary when items[] is empty (single-image product)", () => {
    const product: PlpCardMediaProduct = {
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [],
      },
    };
    expect(getPlpCardImages(product).secondary).toBeNull();
  });

  it("returns null secondary when items[] only mirrors the primary", () => {
    const product: PlpCardMediaProduct = {
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [
          { image: { url: "https://cdn/main.jpg" }, mediaType: "image" },
        ],
      },
    };
    expect(getPlpCardImages(product).secondary).toBeNull();
  });

  it("tolerates null entries in the items[] array", () => {
    const product: PlpCardMediaProduct = {
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [null, { image: { url: "https://cdn/alt.jpg" } }],
      },
    };
    expect(getPlpCardImages(product).secondary).toBe("https://cdn/alt.jpg");
  });
});
