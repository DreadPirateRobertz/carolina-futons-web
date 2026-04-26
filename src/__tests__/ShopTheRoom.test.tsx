import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ShopTheRoom, __TEST__ } from "@/components/site/ShopTheRoom";

// cf-delight Phase 2: home-page wiring of RoomHotspots. Behavioral coverage
// for the dot interaction is in RoomHotspots.test.tsx; here we pin the
// section's section-level contract — heading, hero photo, and the data
// shape of the hotspot list (real catalog slugs, in-bounds positions).

describe("ShopTheRoom (data)", () => {
  const { HOME_HERO_HOTSPOTS, HERO_PHOTO } = __TEST__;

  it("uses a real lifestyle photo with descriptive alt text", () => {
    expect(HERO_PHOTO.src).toMatch(/^https:\/\/static\.wixstatic\.com\//);
    expect(HERO_PHOTO.alt.length).toBeGreaterThan(20);
    expect(HERO_PHOTO.width).toBeGreaterThan(0);
    expect(HERO_PHOTO.height).toBeGreaterThan(0);
  });

  it("ships at least 3 hotspots so the 'shop the room' framing reads as intentional", () => {
    expect(HOME_HERO_HOTSPOTS.length).toBeGreaterThanOrEqual(3);
  });

  it("every hotspot has in-bounds coordinates and a non-empty product slug + name + price", () => {
    for (const spot of HOME_HERO_HOTSPOTS) {
      expect(spot.xPct).toBeGreaterThanOrEqual(0);
      expect(spot.xPct).toBeLessThanOrEqual(100);
      expect(spot.yPct).toBeGreaterThanOrEqual(0);
      expect(spot.yPct).toBeLessThanOrEqual(100);
      expect(spot.productSlug.length).toBeGreaterThan(0);
      expect(spot.productName.length).toBeGreaterThan(0);
      // Formatted price must look like a USD amount — catches a future
      // accidental switch to numeric cents that would render as "73700".
      expect(spot.formattedPrice).toMatch(/^\$\d/);
    }
  });

  it("uses unique hotspot ids (RoomHotspots dedupes silently otherwise)", () => {
    const ids = HOME_HERO_HOTSPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("ShopTheRoom (render)", () => {
  it("renders the section heading + lede", () => {
    render(<ShopTheRoom />);
    expect(
      screen.getByRole("heading", { level: 2, name: /tap a piece you like/i }),
    ).toBeInTheDocument();
  });

  it("renders the lifestyle hero image with the configured alt", () => {
    render(<ShopTheRoom />);
    const img = screen.getByRole("img", {
      name: /living room scene with hardwood futon/i,
    });
    expect(img).toBeInTheDocument();
  });

  it("renders one dot per hotspot, named after the catalog product", () => {
    render(<ShopTheRoom />);
    for (const spot of __TEST__.HOME_HERO_HOTSPOTS) {
      expect(
        screen.getByRole("button", {
          name: new RegExp(`shop ${spot.productName}`, "i"),
        }),
      ).toBeInTheDocument();
    }
  });

  it("ties the section heading to the wrapping <section> via aria-labelledby", () => {
    const { container } = render(<ShopTheRoom />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-labelledby")).toBe(
      "shop-the-room-heading",
    );
    expect(document.getElementById("shop-the-room-heading")).toBeInstanceOf(
      HTMLElement,
    );
  });
});
