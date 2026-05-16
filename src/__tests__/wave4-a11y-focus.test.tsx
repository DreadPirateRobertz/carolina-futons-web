import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type React from "react";

// cf-9ltt (cf-zmsq.followup wave 4): focus-visible pins on 4 deferred
// surfaces from wave 3 — the drag-drop room planner palette + 3 home-page
// product strips. All four are interactive elements (role="button" divs +
// product Link wrappers) that didn't carry the cf-cta convention.

// ── ProductPalette (drag-drop room planner) ────────────────────────────
import { ProductPalette } from "@/components/room/ProductPalette";

describe("ProductPalette focus-visible (cf-9ltt)", () => {
  it("each role='button' draggable carries focus-visible:ring-cf-cta", () => {
    const { container } = render(
      <ProductPalette onDragStart={() => {}} />,
    );
    const draggables = Array.from(
      container.querySelectorAll<HTMLElement>("[role='button']"),
    );
    expect(draggables.length).toBeGreaterThan(0);
    for (const el of draggables) {
      const classes = el.className.split(/\s+/);
      expect(classes).toContain("focus-visible:ring-cf-cta");
      expect(classes).toContain("focus-visible:outline-none");
    }
  });
});

// ── HomeSaleStrip ─────────────────────────────────────────────────────
// Async server component that fetches Wix data. Mock the data layer and
// invoke directly to get the JSX, then render it.
vi.mock("@/lib/wix/products", () => ({
  getCollectionBySlug: vi.fn().mockResolvedValue({ _id: "sale-id", slug: "sale" }),
  listProductsByCollectionId: vi.fn().mockResolvedValue([
    {
      _id: "p1",
      name: "Sale Product",
      slug: "sale-product",
      priceData: { price: 99, formatted: { price: "$99.00" } },
    },
  ]),
}));
import { HomeSaleStrip } from "@/components/home/HomeSaleStrip";

describe("HomeSaleStrip focus-visible (cf-9ltt)", () => {
  it("sale Link carries focus-visible:ring-cf-cta", async () => {
    const jsx = await HomeSaleStrip();
    const { container } = render(jsx as React.ReactElement);
    const link = container.querySelector('a[href="/shop/sale"]');
    expect(link).not.toBeNull();
    const classes = (link?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });
});

// ── ContinueShoppingStrip + RecentlyViewedStrip ───────────────────────
// Both strips read from the same `cf:recently-viewed:v1` localStorage key
// via useSyncExternalStore. Pre-populate the key so the strip has at
// least one tile to render — the className contract is on the inner
// product Link.
import { ContinueShoppingStrip } from "@/components/home/ContinueShoppingStrip";
import { RecentlyViewedStrip } from "@/components/home/RecentlyViewedStrip";

const RECENTLY_VIEWED_KEY = "cf:recently-viewed:v1";
const SAMPLE_ITEM = {
  id: "kingston-futon-frame",
  slug: "kingston-futon-frame",
  name: "Kingston Futon Frame",
  imageUrl: "https://static.wixstatic.com/example.jpg",
  viewedAt: Date.now(),
};

function seedRecentlyViewed() {
  window.localStorage.setItem(
    RECENTLY_VIEWED_KEY,
    JSON.stringify([SAMPLE_ITEM]),
  );
}

describe("Home strips focus-visible (cf-9ltt)", () => {
  it("ContinueShoppingStrip product Link carries focus-visible:ring-cf-cta", () => {
    seedRecentlyViewed();
    const { container } = render(<ContinueShoppingStrip />);
    const link = container.querySelector(
      'a[href="/products/kingston-futon-frame"]',
    );
    expect(link).not.toBeNull();
    const classes = (link?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });

  it("RecentlyViewedStrip product Link carries focus-visible:ring-cf-cta", () => {
    seedRecentlyViewed();
    const { container } = render(<RecentlyViewedStrip />);
    const link = container.querySelector(
      'a[href="/products/kingston-futon-frame"]',
    );
    expect(link).not.toBeNull();
    const classes = (link?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });
});
