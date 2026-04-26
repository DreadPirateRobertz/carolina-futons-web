import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";

import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { CartProvider, useCart } from "@/components/cart/CartProvider";
import type { CartLineItem } from "@/lib/cart/cart-state";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping/thresholds";

function Seed({ lines }: { lines: ReadonlyArray<CartLineItem> }) {
  const { addLine } = useCart();
  useEffect(() => {
    lines.forEach(addLine);
  }, [lines, addLine]);
  return null;
}

function renderBar(
  lines: ReadonlyArray<CartLineItem> = [],
  props: React.ComponentProps<typeof AnnouncementBar> = {},
) {
  return render(
    <CartProvider>
      <Seed lines={lines} />
      <AnnouncementBar {...props} />
    </CartProvider>,
  );
}

const makeItem = (
  id: string,
  unitPriceCents: number,
  quantity = 1,
): CartLineItem => ({
  id,
  productId: id,
  productName: "Test Product",
  unitPriceCents,
  quantity,
  imageSrc: "",
  imageAlt: "",
  slug: id,
});

describe("AnnouncementBar — cart-driven copy (cf-t31z)", () => {
  it("shows default promo when cart is empty", () => {
    renderBar();
    expect(
      screen.getByText("Free white-glove delivery on orders over $1,500"),
    ).toBeInTheDocument();
  });

  it("shows '$X away' copy when cart subtotal is below threshold", () => {
    // $500 item → $1,000 gap remaining
    renderBar([makeItem("a", 50_000)]);
    expect(screen.getByText(/away from free delivery/)).toBeInTheDocument();
    expect(screen.getByText(/\$1,000/)).toBeInTheDocument();
  });

  it("shows qualify copy when subtotal exactly hits threshold", () => {
    renderBar([makeItem("a", FREE_SHIPPING_THRESHOLD_CENTS)]);
    expect(
      screen.getByText("You qualify for free delivery!"),
    ).toBeInTheDocument();
  });

  it("shows qualify copy when subtotal exceeds threshold", () => {
    renderBar([makeItem("a", FREE_SHIPPING_THRESHOLD_CENTS + 1)]);
    expect(
      screen.getByText("You qualify for free delivery!"),
    ).toBeInTheDocument();
  });

  it("reflects quantity — 2× $500 item = $1,000, $500 gap remaining", () => {
    renderBar([makeItem("a", 50_000, 2)]);
    expect(screen.getByText(/away from free delivery/)).toBeInTheDocument();
    expect(screen.getByText(/\$500/)).toBeInTheDocument();
  });
});

describe("AnnouncementBar — message prop override", () => {
  it("renders the explicit message verbatim regardless of cart state", () => {
    renderBar([makeItem("a", FREE_SHIPPING_THRESHOLD_CENTS + 1)], {
      message: "Summer sale — 20% off all frames",
    });
    expect(
      screen.getByText("Summer sale — 20% off all frames"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/qualify|away from free/),
    ).not.toBeInTheDocument();
  });

  it("renders a CTA link when ctaLabel + ctaHref are provided", () => {
    renderBar([], { message: "Sale", ctaLabel: "Shop now", ctaHref: "/shop" });
    expect(screen.getByRole("link", { name: "Shop now" })).toHaveAttribute(
      "href",
      "/shop",
    );
  });

  it("does not render a CTA when href is missing", () => {
    renderBar([], { message: "Hi", ctaLabel: "Shop" });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("exposes itself as an accessible region", () => {
    renderBar();
    expect(
      screen.getByRole("region", { name: /site announcement/i }),
    ).toBeInTheDocument();
  });
});
