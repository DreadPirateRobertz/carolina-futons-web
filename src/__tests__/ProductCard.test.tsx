import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { ProductCard } from "@/components/product/ProductCard";
import type { WixProduct } from "@/lib/wix/products";

// Mock useReducedMotion so the reduced-motion branch is deterministically
// exercisable. Other framer-motion exports (LazyMotion, m.*) must stay live.
vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return { ...actual, useReducedMotion: vi.fn() };
});

// ViewTransitionLink calls useRouter — stub it so unit tests don't require
// a full App Router mount.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const { useReducedMotion } = await import("framer-motion");
const mockedReducedMotion = vi.mocked(useReducedMotion);

function buildProduct(overrides: Partial<WixProduct> = {}): WixProduct {
  const defaults = {
    _id: "p1",
    name: "Test Product",
    slug: "test-product",
    media: { mainMedia: { image: { url: "https://cdn/main.jpg" } } },
    priceData: { price: 100, formatted: { price: "$100.00" } },
  };
  return { ...defaults, ...overrides } as unknown as WixProduct;
}

beforeEach(() => {
  mockedReducedMotion.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ProductCard — rendering basics", () => {
  it("links to the product detail page by slug", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/products/test-product");
  });

  it("renders the primary image with the product name as alt text", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const primary = container.querySelector(
      "[data-slot='product-card-primary-image']",
    );
    expect(primary?.getAttribute("src")).toBe("https://cdn/main.jpg");
    expect(primary?.getAttribute("alt")).toBe("Test Product");
  });

  it("marks the wrapper with data-slot='product-card' for selector stability", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    expect(
      container.querySelector("[data-slot='product-card']"),
    ).not.toBeNull();
  });
});

describe("ProductCard — secondary image swap", () => {
  it("renders a secondary image when a second gallery entry exists", () => {
    const product = buildProduct({
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [{ image: { url: "https://cdn/alt.jpg" }, mediaType: "image" }],
      },
    } as Partial<WixProduct>);
    const { container } = render(<ProductCard product={product} />);
    const secondary = container.querySelector(
      "[data-slot='product-card-secondary-image']",
    );
    expect(secondary?.getAttribute("src")).toBe("https://cdn/alt.jpg");
    // Decorative swap — must not compete with the primary image for AT users.
    expect(secondary?.getAttribute("aria-hidden")).toBe("true");
    expect(secondary?.getAttribute("alt")).toBe("");
  });

  it("exposes data-has-secondary='true' when a secondary image is available", () => {
    const product = buildProduct({
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [{ image: { url: "https://cdn/alt.jpg" }, mediaType: "image" }],
      },
    } as Partial<WixProduct>);
    const { container } = render(<ProductCard product={product} />);
    expect(
      container
        .querySelector("[data-slot='product-card']")
        ?.getAttribute("data-has-secondary"),
    ).toBe("true");
  });

  it("falls back to primary-only when only one image exists (no secondary DOM node)", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    expect(
      container.querySelector("[data-slot='product-card-secondary-image']"),
    ).toBeNull();
    expect(
      container
        .querySelector("[data-slot='product-card']")
        ?.getAttribute("data-has-secondary"),
    ).toBe("false");
  });
});

describe("ProductCard — reduced-motion branch", () => {
  it("marks the card with data-reduced-motion='true' when the hook returns true", () => {
    mockedReducedMotion.mockReturnValue(true);
    const { container } = render(<ProductCard product={buildProduct()} />);
    expect(
      container
        .querySelector("[data-slot='product-card']")
        ?.getAttribute("data-reduced-motion"),
    ).toBe("true");
  });

  it("omits the accent strip under reduced-motion (no transform-based decoration)", () => {
    mockedReducedMotion.mockReturnValue(true);
    const { container } = render(<ProductCard product={buildProduct()} />);
    expect(
      container.querySelector("[data-slot='product-card-accent']"),
    ).toBeNull();
  });

  it("omits the hover secondary-image layer under reduced-motion (no flash)", () => {
    mockedReducedMotion.mockReturnValue(true);
    const product = buildProduct({
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [{ image: { url: "https://cdn/alt.jpg" }, mediaType: "image" }],
      },
    } as Partial<WixProduct>);
    const { container } = render(<ProductCard product={product} />);
    expect(
      container.querySelector("[data-slot='product-card-secondary-image']"),
    ).toBeNull();
  });

  it("coerces a null hook result (SSR / no-support) to reducedMotion=false", () => {
    mockedReducedMotion.mockReturnValue(null);
    const { container } = render(<ProductCard product={buildProduct()} />);
    expect(
      container
        .querySelector("[data-slot='product-card']")
        ?.getAttribute("data-reduced-motion"),
    ).toBe("false");
  });
});

describe("ProductCard — hover lift + shadow + image zoom (cf-card-hover-lift)", () => {
  it("applies shadow-sm base + hover:shadow-lg + focus-within:shadow-lg on the card wrapper", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const card = container.querySelector("[data-slot='product-card']");
    expect(card).not.toBeNull();
    expect(card!.className).toMatch(/\bshadow-sm\b/);
    expect(card!.className).toMatch(/hover:shadow-lg/);
    expect(card!.className).toMatch(/focus-within:shadow-lg/);
    expect(card!.className).toMatch(/transition-shadow/);
  });

  it("applies group-hover:scale-[1.03] + group-focus-within:scale-[1.03] on the primary image when reduced-motion is unset", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const primary = container.querySelector(
      "[data-slot='product-card-primary-image']",
    );
    expect(primary).not.toBeNull();
    expect(primary!.className).toMatch(/group-hover:scale-\[1\.03\]/);
    expect(primary!.className).toMatch(/group-focus-within:scale-\[1\.03\]/);
    expect(primary!.className).toMatch(/transition-transform/);
  });

  it("omits the image-zoom scale classes under reduced-motion (no transform)", () => {
    mockedReducedMotion.mockReturnValue(true);
    const { container } = render(<ProductCard product={buildProduct()} />);
    const primary = container.querySelector(
      "[data-slot='product-card-primary-image']",
    );
    expect(primary).not.toBeNull();
    expect(primary!.className).not.toMatch(/scale-\[1\.03\]/);
    expect(primary!.className).not.toMatch(/transition-transform/);
  });
});

describe("ProductCard — focus/hover parity", () => {
  it("applies group classes on the Link so CSS hover/focus-within drive the same reveal", () => {
    // The motion surface is driven by Tailwind group-hover:/group-focus-within:
    // utilities — keyboard focus MUST trigger the same affordance as pointer
    // hover. Assert the Link carries the `group` class so focus-within on any
    // descendant activates the reveal chain (secondary image + accent strip).
    const { container } = render(<ProductCard product={buildProduct()} />);
    const link = container.querySelector("a");
    expect(link?.className).toMatch(/\bgroup\b/);
  });

  it("routes whileHover and whileFocus to the same variant (pointer/keyboard parity)", () => {
    // Framer-motion doesn't expose whileHover/whileFocus as DOM attributes,
    // so we can't snapshot them directly. Instead, verify the reveal layers
    // (secondary image, accent strip) use symmetric hover/focus-within
    // selectors — that's the plumbing that makes the parity hold at runtime.
    const product = buildProduct({
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [{ image: { url: "https://cdn/alt.jpg" }, mediaType: "image" }],
      },
    } as Partial<WixProduct>);
    const { container } = render(<ProductCard product={product} />);
    const secondary = container.querySelector(
      "[data-slot='product-card-secondary-image']",
    );
    const accent = container.querySelector("[data-slot='product-card-accent']");
    expect(secondary?.className).toMatch(/group-hover:/);
    expect(secondary?.className).toMatch(/group-focus-within:/);
    expect(accent?.className).toMatch(/group-hover:/);
    expect(accent?.className).toMatch(/group-focus-within:/);
  });
});
