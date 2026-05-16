import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

// cf-os1r (cf-mu05.F3): HomeSaleStrip was broadcasting priority={i < 4}
// across 4 below-fold sale strip cards. F1 (cf-mu05) cites web.dev's
// "one priority Image per page" rule. Below-fold priority Images skip
// Next's lazy-load default and burn pre-LCP bandwidth.
//
// Assertion: NO ProductCard rendered by HomeSaleStrip is marked priority.
// Pin via the loading attribute the way ProductCard's own tests pin it:
//   priority=true  → no loading attr or loading="eager"
//   priority=false → loading="lazy"

vi.mock("@/lib/wix/products", () => ({
  getCollectionBySlug: vi.fn(async () => ({ _id: "sale-coll-id", slug: "sale" })),
  listProductsByCollectionId: vi.fn(async () => [
    buildProduct("p1", "Product One"),
    buildProduct("p2", "Product Two"),
    buildProduct("p3", "Product Three"),
    buildProduct("p4", "Product Four"),
    buildProduct("p5", "Product Five"),
    buildProduct("p6", "Product Six"),
  ]),
}));

// framer-motion useReducedMotion is exercised inside ProductCard; mock to
// avoid the reduced-motion environment branch.
vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return { ...actual, useReducedMotion: () => false };
});

function buildProduct(id: string, name: string) {
  return {
    _id: id,
    name,
    slug: id,
    media: { mainMedia: { image: { url: `https://cdn/${id}.jpg` } } },
    priceData: { price: 100, formatted: { price: "$100.00" } },
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HomeSaleStrip — below-fold priority hygiene (cf-os1r / cf-mu05.F3)", () => {
  it("renders no ProductCard with priority — every primary image is loading='lazy'", async () => {
    const { HomeSaleStrip } = await import(
      "@/components/home/HomeSaleStrip"
    );

    const tree = await HomeSaleStrip();
    const { container } = render(tree);

    const primaries = container.querySelectorAll(
      "[data-slot='product-card-primary-image']",
    );
    expect(primaries.length).toBeGreaterThan(0);

    for (const img of Array.from(primaries)) {
      expect(img.getAttribute("loading")).toBe("lazy");
      // Defense-in-depth: fetchpriority should not be "high" — next/image
      // strips it in jsdom anyway, but a non-null value would still indicate
      // an upstream priority leak.
      expect(img.getAttribute("fetchpriority")).not.toBe("high");
    }
  });
});
