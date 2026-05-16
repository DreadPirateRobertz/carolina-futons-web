import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { PLPFeaturedRow } from "@/components/plp/PLPFeaturedRow";
import type { FeaturedRowConfig } from "@/lib/shop/categories";
import type { WixProduct } from "@/lib/wix/products";
import type { ProductBadgeType } from "@/lib/wix/product-badges";

// Match the framer-motion stub pattern used by ProductCard.test.tsx so the
// reduced-motion branch is deterministic. Other exports (LazyMotion, m.*)
// stay live so ProductCard renders normally.
vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return { ...actual, useReducedMotion: vi.fn() };
});
const { useReducedMotion } = await import("framer-motion");
const mockedReducedMotion = vi.mocked(useReducedMotion);

function buildProduct(slug: string, name: string): WixProduct {
  return {
    _id: `id-${slug}`,
    name,
    slug,
    media: { mainMedia: { image: { url: `https://cdn/${slug}.jpg` } } },
    priceData: { price: 600, formatted: { price: "$600.00" } },
  } as unknown as WixProduct;
}

const BASE_CONFIG: FeaturedRowConfig = {
  eyebrow: "Editor's picks",
  heading: "Where most people start",
  body: "Three frames that cover the common questions.",
  productSlugs: [
    "kingston-futon-frame",
    "sedona-futon-frame",
    "asheville-futon-frame",
  ] as const,
};

const EMPTY_BADGES = new Map<string, readonly ProductBadgeType[]>();

beforeEach(() => {
  mockedReducedMotion.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PLPFeaturedRow — happy path", () => {
  it("renders the eyebrow, heading, and body copy from config", () => {
    const products: WixProduct[] = [
      buildProduct("kingston-futon-frame", "Kingston Futon Frame"),
      buildProduct("sedona-futon-frame", "Sedona Futon Frame"),
      buildProduct("asheville-futon-frame", "Asheville Futon Frame"),
    ];
    render(
      <PLPFeaturedRow
        config={BASE_CONFIG}
        products={products}
        badges={EMPTY_BADGES}
      />,
    );
    expect(screen.getByText(BASE_CONFIG.eyebrow)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: BASE_CONFIG.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(BASE_CONFIG.body)).toBeInTheDocument();
  });

  it("renders all 3 product cards as <li> rows under one section", () => {
    const products: WixProduct[] = [
      buildProduct("kingston-futon-frame", "Kingston Futon Frame"),
      buildProduct("sedona-futon-frame", "Sedona Futon Frame"),
      buildProduct("asheville-futon-frame", "Asheville Futon Frame"),
    ];
    const { container } = render(
      <PLPFeaturedRow
        config={BASE_CONFIG}
        products={products}
        badges={EMPTY_BADGES}
      />,
    );
    const section = container.querySelector(
      "[data-slot='plp-featured-row']",
    );
    expect(section).not.toBeNull();
    const items = container.querySelectorAll(
      "[data-slot='plp-featured-row'] ul > li",
    );
    expect(items).toHaveLength(3);
  });

  it("ties the <section> aria-labelledby to the heading id", () => {
    const products: WixProduct[] = [
      buildProduct("kingston-futon-frame", "K"),
      buildProduct("sedona-futon-frame", "S"),
      buildProduct("asheville-futon-frame", "A"),
    ];
    const { container } = render(
      <PLPFeaturedRow
        config={BASE_CONFIG}
        products={products}
        badges={EMPTY_BADGES}
      />,
    );
    const section = container.querySelector("section[aria-labelledby]");
    const labelled = section?.getAttribute("aria-labelledby");
    expect(labelled).toBeTruthy();
    const heading = labelled
      ? container.querySelector(`#${CSS.escape(labelled)}`)
      : null;
    expect(heading?.tagName.toLowerCase()).toBe("h2");
    expect(heading?.textContent).toBe(BASE_CONFIG.heading);
  });
});

describe("PLPFeaturedRow — graceful fallback (cfw-75v invariant)", () => {
  // Locking this contract in place is the whole point of the visibility gate:
  // the strip is editorial — half a strip looks broken next to the heading.
  it("renders null when products.length === 0 (all 3 slugs missed)", () => {
    const { container } = render(
      <PLPFeaturedRow
        config={BASE_CONFIG}
        products={[]}
        badges={EMPTY_BADGES}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null when products.length === 1 (2 slugs missed)", () => {
    const { container } = render(
      <PLPFeaturedRow
        config={BASE_CONFIG}
        products={[buildProduct("kingston-futon-frame", "K")]}
        badges={EMPTY_BADGES}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null when products.length === 2 (1 slug missed)", () => {
    const { container } = render(
      <PLPFeaturedRow
        config={BASE_CONFIG}
        products={[
          buildProduct("kingston-futon-frame", "K"),
          buildProduct("sedona-futon-frame", "S"),
        ]}
        badges={EMPTY_BADGES}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("only renders the first 3 when more than 3 are passed (defensive slice)", () => {
    // Should not happen in practice (the page only resolves 3 slugs), but
    // the strip's visual contract is 3 cards; assert the component enforces it.
    const products = [
      buildProduct("kingston-futon-frame", "K"),
      buildProduct("sedona-futon-frame", "S"),
      buildProduct("asheville-futon-frame", "A"),
      buildProduct("bedford-futon-frame", "B"),
      buildProduct("flagstaff-futon-frame", "F"),
    ];
    const { container } = render(
      <PLPFeaturedRow
        config={BASE_CONFIG}
        products={products}
        badges={EMPTY_BADGES}
      />,
    );
    const items = container.querySelectorAll(
      "[data-slot='plp-featured-row'] ul > li",
    );
    expect(items).toHaveLength(3);
  });
});

describe("PLPFeaturedRow — badge wiring", () => {
  it("passes the per-product badge list lookup-by-slug through to ProductCard", () => {
    const products: WixProduct[] = [
      buildProduct("kingston-futon-frame", "Kingston Futon Frame"),
      buildProduct("sedona-futon-frame", "Sedona Futon Frame"),
      buildProduct("asheville-futon-frame", "Asheville Futon Frame"),
    ];
    const badges = new Map<string, readonly ProductBadgeType[]>([
      ["kingston-futon-frame", ["Bestseller"] as const],
    ]);
    const { container } = render(
      <PLPFeaturedRow
        config={BASE_CONFIG}
        products={products}
        badges={badges}
      />,
    );
    // The "best seller" badge label is rendered when ProductCard receives it
    // in its badges prop — assert the label landed on the Kingston card.
    expect(container.textContent).toMatch(/best\s*seller/i);
  });
});
