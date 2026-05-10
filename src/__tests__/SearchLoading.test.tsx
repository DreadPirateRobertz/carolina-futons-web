import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import SearchLoading from "@/app/search/loading";

// cfw-jez: search loading skeleton during async query.

describe("/search/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<SearchLoading />);
    const region = screen.getByTestId("search-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 6 product card skeletons in the products column", () => {
    const { container } = render(<SearchLoading />);
    const products = container.querySelector(
      '[data-slot="search-loading-products"]',
    );
    expect(products).not.toBeNull();
    const cards = products?.querySelectorAll('[data-slot="skeleton-card"]');
    expect(cards?.length).toBe(6);
  });

  it("renders 4 post-row skeletons in the articles aside", () => {
    const { container } = render(<SearchLoading />);
    const posts = container.querySelector(
      '[data-slot="search-loading-posts"]',
    );
    expect(posts).not.toBeNull();
    const list = posts?.querySelector("ul");
    expect(list?.children.length).toBe(4);
  });

  it("uses the 2/1-column body layout matching the real search results", () => {
    const { container } = render(<SearchLoading />);
    const body = container.querySelector('[data-slot="search-loading-body"]');
    expect(body?.className).toMatch(/grid-cols-\[2fr,1fr\]/);
  });
});
