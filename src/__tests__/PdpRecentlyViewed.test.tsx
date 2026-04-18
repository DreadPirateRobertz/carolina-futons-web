import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { PdpRecentlyViewed } from "@/components/product/PdpRecentlyViewed";
import {
  RECENTLY_VIEWED_STORAGE_KEY,
  type RecentlyViewedItem,
} from "@/lib/product/recently-viewed";

function seed(items: RecentlyViewedItem[]): void {
  window.localStorage.setItem(
    RECENTLY_VIEWED_STORAGE_KEY,
    JSON.stringify(items),
  );
}

function item(id: string, overrides: Partial<RecentlyViewedItem> = {}): RecentlyViewedItem {
  return {
    id,
    slug: `${id}-slug`,
    name: `Product ${id.toUpperCase()}`,
    imageUrl: `https://img.example/${id}.jpg`,
    priceText: "$199",
    viewedAt: 1_000,
    ...overrides,
  };
}

function renderStrip(overrides: Partial<Parameters<typeof PdpRecentlyViewed>[0]> = {}) {
  return render(
    <PdpRecentlyViewed
      currentProductId="current"
      currentProductSlug="current-slug"
      currentProductName="Current Product"
      currentProductImageUrl="https://img.example/current.jpg"
      currentProductPriceText="$299"
      {...overrides}
    />,
  );
}

describe("PdpRecentlyViewed", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders nothing when the buffer only contains the current product (empty strip is hidden, per spec)", () => {
    // cf-3qt.7.N.1 test (2): empty-state hide. With no other products ever
    // viewed, the section must not render at all — no "Nothing viewed yet"
    // placeholder rot.
    const { container } = renderStrip();
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("heading", { name: /you recently viewed/i })).toBeNull();
  });

  it("excludes the current product from the rendered list (but still adds it to the buffer for siblings)", () => {
    // cf-3qt.7.N.1 test (3): current PDP product excluded. Seeding A + B, then
    // landing on B should render only A — B is the page you're on.
    seed([item("a"), item("b")]);
    renderStrip({
      currentProductId: "b",
      currentProductSlug: "b-slug",
      currentProductName: "Product B",
    });
    expect(screen.getByRole("link", { name: /product a/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /product b/i })).toBeNull();
  });

  it("promotes the current product to most-recent in storage so a sibling PDP sees it first", () => {
    seed([item("a"), item("b"), item("c")]);
    renderStrip({
      currentProductId: "d",
      currentProductSlug: "d-slug",
      currentProductName: "Product D",
    });
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY) ?? "[]";
    const ids = (JSON.parse(raw) as RecentlyViewedItem[]).map((i) => i.id);
    expect(ids[0]).toBe("d");
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).toContain("c");
  });

  it("renders a tile per other-viewed product with a /products/{slug} link", () => {
    seed([item("a"), item("b")]);
    renderStrip({
      currentProductId: "zz",
      currentProductSlug: "zz-slug",
      currentProductName: "ZZ",
    });
    expect(screen.getByRole("link", { name: /product a/i }).getAttribute("href")).toBe("/products/a-slug");
    expect(screen.getByRole("link", { name: /product b/i }).getAttribute("href")).toBe("/products/b-slug");
  });

  it("labels the section via aria-labelledby so SR users associate tiles with the heading", () => {
    seed([item("a")]);
    renderStrip({
      currentProductId: "zz",
      currentProductSlug: "zz-slug",
      currentProductName: "ZZ",
    });
    const region = screen.getByRole("region", { name: /you recently viewed/i });
    expect(region).toBeTruthy();
  });

  it("gates scroll-smooth on motion-safe so prefers-reduced-motion users get instant snap", () => {
    // Using Tailwind's `motion-safe:` variant (CSS-level check on
    // prefers-reduced-motion) keeps the implementation zero-JS for the
    // reduced-motion requirement. Regression guard: a future drive-by that
    // drops the prefix would silently re-enable smooth scroll for those users.
    seed([item("a")]);
    renderStrip({
      currentProductId: "zz",
      currentProductSlug: "zz-slug",
      currentProductName: "ZZ",
    });
    const row = document.querySelector('[data-slot="pdp-recently-viewed-row"]');
    expect(row).not.toBeNull();
    expect(row?.className ?? "").toContain("motion-safe:scroll-smooth");
  });
});
