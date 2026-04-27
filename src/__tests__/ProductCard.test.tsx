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
    // next/image proxies through /_next/image?url=…; assert the upstream URL
    // is encoded in the src rather than matching the raw URL.
    const src = primary?.getAttribute("src") ?? "";
    expect(decodeURIComponent(src)).toContain("https://cdn/main.jpg");
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
    const src = secondary?.getAttribute("src") ?? "";
    expect(decodeURIComponent(src)).toContain("https://cdn/alt.jpg");
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

describe("ProductCard — priority + sizes wiring (cf-pdp-lcp-fetchpriority + next/image)", () => {
  // next/image strips fetchpriority from the rendered DOM in jsdom but
  // preserves loading; we pin priority via the loading attribute, and pin
  // the sizes attribute end-to-end since that's what drives srcset selection.
  it("defaults to loading='lazy' + DEFAULT_PLP_SIZES when no priority prop", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const primary = container.querySelector(
      "[data-slot='product-card-primary-image']",
    );
    expect(primary?.getAttribute("loading")).toBe("lazy");
    const sizes = primary?.getAttribute("sizes") ?? "";
    expect(sizes).toContain("25vw");
    expect(sizes).toContain("33vw");
    expect(sizes).toContain("50vw");
  });

  it("removes the lazy hint when priority is true (next/image marks it eager)", () => {
    const { container } = render(
      <ProductCard product={buildProduct()} priority />,
    );
    const primary = container.querySelector(
      "[data-slot='product-card-primary-image']",
    );
    // next/image emits no loading attr OR loading="eager" for priority cards.
    const loading = primary?.getAttribute("loading");
    expect(loading === null || loading === "eager").toBe(true);
  });

  it("respects a caller-provided sizes override (Featured strip uses tighter widths)", () => {
    const { container } = render(
      <ProductCard
        product={buildProduct()}
        sizes="(min-width: 1024px) 17vw, (min-width: 640px) 33vw, 50vw"
      />,
    );
    const primary = container.querySelector(
      "[data-slot='product-card-primary-image']",
    );
    expect(primary?.getAttribute("sizes")).toContain("17vw");
  });

  it("never marks the secondary (decorative) image as priority — always lazy", () => {
    const product = buildProduct({
      media: {
        mainMedia: { image: { url: "https://cdn/main.jpg" } },
        items: [{ image: { url: "https://cdn/alt.jpg" }, mediaType: "image" }],
      },
    } as Partial<WixProduct>);
    const { container } = render(<ProductCard product={product} priority />);
    const secondary = container.querySelector(
      "[data-slot='product-card-secondary-image']",
    );
    expect(secondary?.getAttribute("loading")).toBe("lazy");
    // Secondary is purely a hover swap — must never compete with the LCP image.
    expect(secondary?.getAttribute("fetchpriority")).toBeNull();
  });
});

describe("ProductCard — dark mode (cf-b3ai)", () => {
  it("carries dark:bg-zinc-800 on the card wrapper", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const card = container.querySelector("[data-slot='product-card']");
    expect(card?.className).toContain("dark:bg-zinc-800");
  });

  it("carries dark:border-zinc-700 on the card wrapper", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const card = container.querySelector("[data-slot='product-card']");
    expect(card?.className).toContain("dark:border-zinc-700");
  });

  it("carries dark:text-zinc-100 on the product name heading", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const heading = container.querySelector("h2");
    expect(heading?.className).toContain("dark:text-zinc-100");
  });

  it("carries dark:bg-zinc-700 on the image placeholder", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const imgWrap = container.querySelector(".aspect-square");
    expect(imgWrap?.className).toContain("dark:bg-zinc-700");
  });

  it("carries dark:text-zinc-300 on the regular price", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    const price = container.querySelector("p.mt-1");
    expect(price?.className).toContain("dark:text-zinc-300");
  });
});
