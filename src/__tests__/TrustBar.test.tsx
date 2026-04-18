import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { TrustBar, TRUST_BAR_ITEMS } from "@/components/site/TrustBar";

describe("TrustBar", () => {
  it("renders as a region with a descriptive aria-label", () => {
    render(<TrustBar />);
    const region = screen.getByRole("region", { name: /trust|why carolina futons/i });
    expect(region).toBeTruthy();
  });

  it("renders exactly the five trust items in order", () => {
    render(<TrustBar />);
    const items = screen.getAllByTestId("trust-bar-item");
    expect(items).toHaveLength(5);
    const labels = items.map((el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "");
    expect(labels[0]).toMatch(/Free White-Glove Delivery/i);
    expect(labels[1]).toMatch(/Handcrafted in NC/i);
    expect(labels[2]).toMatch(/0% APR Financing/i);
    expect(labels[3]).toMatch(/Free Swatch Kit/i);
    expect(labels[4]).toMatch(/Satisfaction Guarantee/i);
  });

  it("pairs each label with its icon glyph", () => {
    render(<TrustBar />);
    const items = screen.getAllByTestId("trust-bar-item");
    const icons = items.map((el) => within(el).getByTestId("trust-bar-icon"));
    expect(icons[0].textContent).toBe("🚚");
    expect(icons[1].textContent).toBe("⭐");
    expect(icons[2].textContent).toBe("💰");
    expect(icons[3].textContent).toBe("🎨");
    expect(icons[4].textContent).toBe("✓");
  });

  it("hides decorative icon glyphs from assistive tech (aria-hidden)", () => {
    render(<TrustBar />);
    const icons = screen.getAllByTestId("trust-bar-icon");
    for (const icon of icons) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("uses the dark navy bg and cream text utility classes per the spec", () => {
    render(<TrustBar />);
    const region = screen.getByTestId("trust-bar");
    expect(region.className).toMatch(/bg-cf-navy/);
    expect(region.className).toMatch(/text-cf-cream/);
  });

  it("lays out items in a responsive 5-column grid at the sm breakpoint", () => {
    render(<TrustBar />);
    const list = screen.getByTestId("trust-bar-list");
    // Single column on mobile, 5 columns once there's room — sm: is our
    // smallest "has horizontal space" breakpoint site-wide.
    expect(list.className).toMatch(/grid-cols-1/);
    expect(list.className).toMatch(/sm:grid-cols-5/);
  });

  it("exports TRUST_BAR_ITEMS so the page layer can reason about count/content", () => {
    expect(Array.isArray(TRUST_BAR_ITEMS)).toBe(true);
    expect(TRUST_BAR_ITEMS).toHaveLength(5);
    for (const item of TRUST_BAR_ITEMS) {
      expect(typeof item.icon).toBe("string");
      expect(typeof item.label).toBe("string");
      expect(item.label.length).toBeGreaterThan(0);
    }
  });
});
