import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import SharedWishlistLoading from "@/app/wishlist-share/[token]/loading";

// cfw-pco: shared-wishlist loading skeleton during async getSharedWishlist
// resolution.

describe("/wishlist-share/[token]/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<SharedWishlistLoading />);
    const region = screen.getByTestId("shared-wishlist-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 6 product card skeletons in the grid", () => {
    const { container } = render(<SharedWishlistLoading />);
    const grid = container.querySelector(
      '[data-slot="shared-wishlist-loading-grid"]',
    );
    expect(grid).not.toBeNull();
    const cards = container.querySelectorAll('[data-slot="skeleton-card"]');
    expect(cards.length).toBe(6);
  });

  it("uses 1/2/3-column grid matching the real shared-wishlist layout", () => {
    const { container } = render(<SharedWishlistLoading />);
    const grid = container.querySelector(
      '[data-slot="shared-wishlist-loading-grid"]',
    );
    expect(grid?.className).toMatch(/grid-cols-1/);
    expect(grid?.className).toMatch(/sm:grid-cols-2/);
    expect(grid?.className).toMatch(/md:grid-cols-3/);
  });
});
