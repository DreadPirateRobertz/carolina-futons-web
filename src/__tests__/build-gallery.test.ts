// cf-pdp-g2.fu — unit tests for the extracted buildGallery() that folds
// variant-level media into the gallery so the variant→thumb swap works
// on Wix catalogs where swatch photos live on the variant, not the choice.

import { describe, it, expect } from "vitest";

import { buildGallery } from "@/lib/product/build-gallery";

describe("buildGallery — source ordering", () => {
  it("returns [] for a product with no media at all", () => {
    expect(buildGallery({}, [], [])).toEqual([]);
  });

  it("returns mainMedia first", () => {
    const result = buildGallery(
      {
        media: {
          mainMedia: {
            title: "Hero",
            image: { url: "https://img/main.jpg" },
          },
        },
      },
      [],
      [],
    );
    expect(result).toEqual([{ url: "https://img/main.jpg", alt: "Hero" }]);
  });

  it("appends media.items[] after mainMedia, image-type only", () => {
    const result = buildGallery(
      {
        media: {
          mainMedia: { image: { url: "https://img/main.jpg" } },
          items: [
            { mediaType: "image", title: "Side", image: { url: "https://img/side.jpg" } },
            { mediaType: "video", image: { url: "https://img/clip.mp4" } },
            { title: "Top", image: { url: "https://img/top.jpg" } },
          ],
        },
      },
      [],
      [],
    );
    expect(result.map((i) => i.url)).toEqual([
      "https://img/main.jpg",
      "https://img/side.jpg",
      "https://img/top.jpg",
    ]);
  });

  it("appends per-choice swatch media after gallery items (cfw-1nm)", () => {
    const result = buildGallery(
      {
        media: { mainMedia: { image: { url: "https://img/main.jpg" } } },
      },
      [
        {
          name: "Color",
          choices: [
            {
              value: "Bryan Charcoal",
              description: "Bryan Charcoal",
              media: {
                mainMedia: { image: { url: "https://img/charcoal.jpg" } },
              },
            },
          ],
        } as never,
      ],
      [],
    );
    expect(result.map((i) => i.url)).toEqual([
      "https://img/main.jpg",
      "https://img/charcoal.jpg",
    ]);
    expect(result[1]?.alt).toBe("Bryan Charcoal");
  });
});

describe("buildGallery — variant-media fold (cf-pdp-g2.fu)", () => {
  it("appends variant-level media after choice media", () => {
    const result = buildGallery(
      {
        media: { mainMedia: { image: { url: "https://img/main.jpg" } } },
      },
      [],
      [
        {
          _id: "v1",
          choices: { Color: "Bryan Charcoal" },
          media: {
            mainMedia: { image: { url: "https://img/variant-bryan.jpg" } },
          },
        } as never,
      ],
    );
    expect(result.map((i) => i.url)).toEqual([
      "https://img/main.jpg",
      "https://img/variant-bryan.jpg",
    ]);
  });

  it("uses the variant's choice composition as the alt text", () => {
    const result = buildGallery(
      {},
      [],
      [
        {
          _id: "v1",
          choices: { Color: "Bryan Charcoal", Fabric: "Linen" },
          media: { mainMedia: { image: { url: "https://img/v.jpg" } } },
        } as never,
      ],
    );
    expect(result[0]?.alt).toBe("Color: Bryan Charcoal, Fabric: Linen");
  });

  it("falls back to the variant _id as alt when choices are absent", () => {
    const result = buildGallery(
      {},
      [],
      [
        {
          _id: "v-fallback",
          media: { mainMedia: { image: { url: "https://img/v.jpg" } } },
        } as never,
      ],
    );
    expect(result[0]?.alt).toBe("v-fallback");
  });

  it("skips variants with no media", () => {
    const result = buildGallery(
      { media: { mainMedia: { image: { url: "https://img/main.jpg" } } } },
      [],
      [
        { _id: "v1", choices: { Color: "Bryan" }, media: null } as never,
        { _id: "v2", choices: { Color: "Sage" } } as never,
      ],
    );
    expect(result.map((i) => i.url)).toEqual(["https://img/main.jpg"]);
  });
});

describe("buildGallery — dedupe across all sources", () => {
  it("does not double-count a URL that lives on multiple sources", () => {
    const sharedUrl = "https://img/shared.jpg";
    const result = buildGallery(
      {
        media: {
          mainMedia: { image: { url: sharedUrl } },
          items: [{ image: { url: sharedUrl } }],
        },
      },
      [
        {
          name: "Color",
          choices: [
            {
              value: "Charcoal",
              media: { mainMedia: { image: { url: sharedUrl } } },
            },
          ],
        } as never,
      ],
      [
        {
          _id: "v1",
          choices: { Color: "Charcoal" },
          media: { mainMedia: { image: { url: sharedUrl } } },
        } as never,
      ],
    );
    expect(result).toEqual([{ url: sharedUrl, alt: undefined }]);
  });

  it("preserves source order across all four lanes (main → items → choice → variant)", () => {
    const result = buildGallery(
      {
        media: {
          mainMedia: { image: { url: "https://img/1-main.jpg" } },
          items: [{ image: { url: "https://img/2-item.jpg" } }],
        },
      },
      [
        {
          name: "Color",
          choices: [
            {
              value: "X",
              media: { mainMedia: { image: { url: "https://img/3-choice.jpg" } } },
            },
          ],
        } as never,
      ],
      [
        {
          _id: "v1",
          choices: { Color: "Y" },
          media: { mainMedia: { image: { url: "https://img/4-variant.jpg" } } },
        } as never,
      ],
    );
    expect(result.map((i) => i.url)).toEqual([
      "https://img/1-main.jpg",
      "https://img/2-item.jpg",
      "https://img/3-choice.jpg",
      "https://img/4-variant.jpg",
    ]);
  });
});
