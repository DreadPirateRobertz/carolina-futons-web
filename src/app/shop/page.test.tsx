import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Stub ShopTheRoom — same reasoning as the AboutPage smoke test.
vi.mock("@/components/site/ShopTheRoom", () => ({
  ShopTheRoom: () => <div data-slot="shop-the-room" />,
  SHOP_HERO_PHOTO: { src: "stub", alt: "stub", width: 1, height: 1 },
  SHOP_HOTSPOT_CONFIGS: [],
}));

import ShopIndex, { metadata } from "./page";

async function renderShop() {
  const ui = await ShopIndex();
  return render(ui);
}

afterEach(() => cleanup());

describe("ShopIndex — smoke", () => {
  it("exports metadata.title for /shop SEO", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/Shop/);
  });

  it("renders the Shop H1 + the category list", async () => {
    await renderShop();
    expect(
      screen.getByRole("heading", { level: 1, name: /^shop$/i }),
    ).toBeInTheDocument();
    // Each category card is a link in the grid; at least one should exist.
    expect(
      screen.getAllByRole("link", { name: /futon|murphy|platform|mattress/i })
        .length,
    ).toBeGreaterThan(0);
  });

  // cf-delight Phase 3: pin the ShopTheRoom section was wired in.
  it("renders the ShopTheRoom hotspots section", async () => {
    const { container } = await renderShop();
    expect(container.querySelector("[data-slot='shop-the-room']")).not.toBeNull();
  });
});
