/**
 * cfw-yyay: the PDP `Product` + `BreadcrumbList` JSON-LD must be emitted by
 * the `/products/[slug]` segment layout, not the page.
 *
 * Rendered from `page.tsx` the JSON-LD was trapped behind `loading.tsx`'s
 * `<Suspense>` boundary — it streamed as RSC flight data and never appeared
 * in the server-rendered HTML, so the Rich Results Test and non-rendering
 * crawlers saw no `Product` markup. A segment layout renders outside that
 * boundary, into the prerendered static shell.
 *
 * These tests pin: (1) both JSON-LD scripts are rendered, (2) they parse to
 * the right schema.org types, (3) the page subtree still renders, and
 * (4) an unknown slug emits no JSON-LD (page.tsx handles the 404).
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const wixMocks = vi.hoisted(() => ({
  getProductBySlug: vi.fn(),
}));
vi.mock("@/lib/wix/products", () => wixMocks);

import PdpLayout from "@/app/products/[slug]/layout";

const PRODUCT = {
  name: "Solstice Futon Frame",
  description: "<p>The Solstice Bed defines the room it is in.</p>",
  media: {
    mainMedia: { image: { url: "https://static.wixstatic.com/media/solstice.jpg" } },
  },
  priceData: { price: 420 },
  stock: { inStock: true },
};

async function renderLayout(slug: string) {
  const ui = await PdpLayout({
    children: <div data-testid="page-child">page</div>,
    params: Promise.resolve({ slug }),
  });
  return render(ui);
}

function parseJsonLd(container: HTMLElement, id: string): Record<string, unknown> {
  const script = container.querySelector(`script#${id}[type="application/ld+json"]`);
  if (!script) throw new Error(`missing JSON-LD script #${id}`);
  return JSON.parse(script.textContent ?? "");
}

describe("PdpLayout JSON-LD", () => {
  it("renders Product + BreadcrumbList JSON-LD for a known slug", async () => {
    wixMocks.getProductBySlug.mockResolvedValue(PRODUCT);
    const { container } = await renderLayout("solstice-futon-frame");

    const product = parseJsonLd(container, "jsonld-product");
    expect(product["@type"]).toBe("Product");
    expect(product.name).toBe("Solstice Futon Frame");
    // stripHtml projection — JSON-LD description must be tag-free.
    expect(product.description).toBe(
      "The Solstice Bed defines the room it is in.",
    );
    const offers = product.offers as Record<string, unknown>;
    expect(offers.price).toBe("420.00");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(String(product.url)).toMatch(/\/products\/solstice-futon-frame$/);

    const breadcrumb = parseJsonLd(container, "jsonld-breadcrumb");
    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    const items = breadcrumb.itemListElement as ReadonlyArray<{ name: string }>;
    expect(items.map((i) => i.name)).toEqual([
      "Home",
      "Shop",
      "Solstice Futon Frame",
    ]);
  });

  it("still renders the page subtree", async () => {
    wixMocks.getProductBySlug.mockResolvedValue(PRODUCT);
    const { getByTestId } = await renderLayout("solstice-futon-frame");
    expect(getByTestId("page-child")).toBeTruthy();
  });

  it("marks an out-of-stock product as OutOfStock", async () => {
    wixMocks.getProductBySlug.mockResolvedValue({
      ...PRODUCT,
      stock: { inStock: false },
    });
    const { container } = await renderLayout("solstice-futon-frame");
    const offers = parseJsonLd(container, "jsonld-product").offers as Record<
      string,
      unknown
    >;
    expect(offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("emits no JSON-LD for an unknown slug but still renders children", async () => {
    wixMocks.getProductBySlug.mockResolvedValue(null);
    const { container, getByTestId } = await renderLayout("does-not-exist");
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
    expect(getByTestId("page-child")).toBeTruthy();
  });
});
