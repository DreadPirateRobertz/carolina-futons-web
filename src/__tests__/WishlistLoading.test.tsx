import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import WishlistLoading from "@/app/wishlist/loading";

// cfw-p9u: wishlist loading skeleton during async getWishlist.

describe("/wishlist/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<WishlistLoading />);
    const region = screen.getByTestId("wishlist-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 5 wishlist-row skeletons matching the WishlistView shape", () => {
    const { container } = render(<WishlistLoading />);
    const list = container.querySelector(
      '[data-slot="wishlist-loading-list"]',
    );
    expect(list).not.toBeNull();
    expect(list?.children.length).toBe(5);
  });

  it("flags the list with aria-label='Wishlist' (matches the real WishlistView)", () => {
    const { container } = render(<WishlistLoading />);
    const list = container.querySelector(
      '[data-slot="wishlist-loading-list"]',
    );
    expect(list?.getAttribute("aria-label")).toBe("Wishlist");
  });
});
