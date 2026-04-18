import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PdpCrossSell } from "@/components/product/PdpCrossSell";

type P = {
  _id: string;
  name: string;
  slug?: string;
  priceData?: { formatted?: { price?: string } };
  media?: { mainMedia?: { image?: { url?: string } } };
};

function p(id: string, name: string, priceText = "$199", imageUrl?: string): P {
  return {
    _id: id,
    name,
    slug: `${id}-slug`,
    priceData: { formatted: { price: priceText } },
    media: imageUrl ? { mainMedia: { image: { url: imageUrl } } } : undefined,
  };
}

describe("PdpCrossSell", () => {
  it("renders a section with a heading and one link per product", () => {
    const products = [p("a", "Alpha", "$199"), p("b", "Bravo", "$249"), p("c", "Charlie", "$299")];
    render(<PdpCrossSell products={products} />);

    expect(screen.getByRole("heading", { name: /you might also like/i })).toBeTruthy();
    // Each product is a link to /products/{slug}
    expect(screen.getByRole("link", { name: /alpha/i }).getAttribute("href")).toBe("/products/a-slug");
    expect(screen.getByRole("link", { name: /bravo/i }).getAttribute("href")).toBe("/products/b-slug");
    expect(screen.getByRole("link", { name: /charlie/i }).getAttribute("href")).toBe("/products/c-slug");
  });

  it("shows the price for each product", () => {
    const products = [p("a", "Alpha", "$199")];
    render(<PdpCrossSell products={products} />);
    expect(screen.getByText("$199")).toBeTruthy();
  });

  it("uses the product image with the product name as alt text", () => {
    const products = [p("a", "Alpha", "$199", "https://img.example/a.jpg")];
    render(<PdpCrossSell products={products} />);
    const img = screen.getByAltText("Alpha") as HTMLImageElement;
    expect(img.src).toContain("a.jpg");
  });

  it("renders a placeholder tile (no <img>) when a product has no image", () => {
    const products = [p("a", "No Image Product", "$199")];
    render(<PdpCrossSell products={products} />);
    // Placeholder has no matching alt text for the product name, so the img lookup
    // should fail — asserting absence of the image is the contract.
    expect(screen.queryByAltText("No Image Product")).toBeNull();
  });

  it("renders nothing when products is empty (no section, no heading)", () => {
    const { container } = render(<PdpCrossSell products={[]} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("heading", { name: /you might also like/i })).toBeNull();
  });

  it("renders nothing when error is present (silent on the PDP — Sentry already logged upstream)", () => {
    // Cross-sell is non-critical: a Wix outage should not insert a broken
    // section into the PDP. The reader has already captured the exception;
    // the component's job is to stay out of the user's way.
    const { container } = render(<PdpCrossSell products={[]} error="wix_sdk" />);
    expect(container.firstChild).toBeNull();
  });

  it("labels the section via aria-labelledby so screen readers associate items with the heading", () => {
    const products = [p("a", "Alpha")];
    render(<PdpCrossSell products={products} />);
    const region = screen.getByRole("region", { name: /you might also like/i });
    expect(region).toBeTruthy();
  });
});
