import { useEffect } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CartProvider, useCart } from "@/components/cart/CartProvider";
import {
  AnnouncementBarCartAware,
  announcementMessage,
  FREE_DELIVERY_THRESHOLD_CENTS,
} from "@/components/site/AnnouncementBarCartAware";

// Pure-function tests pin the message-derivation logic without needing
// the React tree or CartProvider. The integration test below verifies
// the wrapper actually reads from useCart and forwards to AnnouncementBar.

describe("announcementMessage", () => {
  it("returns the static prompt when the cart is empty", () => {
    expect(announcementMessage(0)).toMatch(
      /free white-glove delivery on orders over \$1,500/i,
    );
  });

  it("returns the static prompt for a negative subtotal (defensive)", () => {
    // Should never happen in practice, but guard against bad reducer state
    // surfacing as a "$X away from free delivery" with a negative remainder.
    expect(announcementMessage(-5000)).toMatch(/free white-glove delivery on/i);
  });

  it("returns progress copy when the subtotal is below the threshold", () => {
    // $499 spent → $1,001.00 remaining
    expect(announcementMessage(49_900)).toBe(
      "You're $1,001.00 away from free white-glove delivery",
    );
  });

  it("rounds the remainder to a sensible currency string", () => {
    // $1,499.99 spent → $0.01 remaining
    expect(announcementMessage(149_999)).toBe(
      "You're $0.01 away from free white-glove delivery",
    );
  });

  it("returns the qualified copy at the threshold", () => {
    expect(announcementMessage(FREE_DELIVERY_THRESHOLD_CENTS)).toMatch(
      /you qualify/i,
    );
  });

  it("returns the qualified copy above the threshold", () => {
    expect(announcementMessage(FREE_DELIVERY_THRESHOLD_CENTS + 50_000)).toMatch(
      /you qualify/i,
    );
  });
});

// Tiny test helper that seeds the cart by dispatching add actions through
// the live reducer. useEffect (not render-body) so we don't dispatch state
// updates during render.
function CartSeeder({ unitPriceCents }: { unitPriceCents: number }) {
  const { addLine } = useCart();
  useEffect(() => {
    if (unitPriceCents > 0) {
      addLine({
        id: "seed",
        productId: "seed-product",
        productName: "Seed Item",
        unitPriceCents,
        formattedUnitPrice: "",
        quantity: 1,
      });
    }
  }, [addLine, unitPriceCents]);
  return null;
}

function renderWithCart(unitPriceCents = 0) {
  return render(
    <CartProvider>
      <CartSeeder unitPriceCents={unitPriceCents} />
      <AnnouncementBarCartAware />
    </CartProvider>,
  );
}

describe("AnnouncementBarCartAware", () => {
  it("renders the static prompt when the cart is empty", () => {
    renderWithCart(0);
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toMatch(/free white-glove delivery/i);
  });

  it("renders progress copy from a non-empty, sub-threshold cart", () => {
    renderWithCart(50_000); // $500 in the cart
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toBe(
      "You're $1,000.00 away from free white-glove delivery",
    );
  });

  it("renders qualified copy when the cart meets the threshold", () => {
    renderWithCart(FREE_DELIVERY_THRESHOLD_CENTS);
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toMatch(/you qualify/i);
  });
});
