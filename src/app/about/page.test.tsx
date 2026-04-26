import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Stub ShopTheRoom so the AboutPage smoke test doesn't need the Wix
// product fetch wired up; the section's own contract is covered by
// ShopTheRoom.test.tsx.
vi.mock("@/components/site/ShopTheRoom", () => ({
  ShopTheRoom: () => <div data-slot="shop-the-room" />,
  ABOUT_HERO_PHOTO: { src: "stub", alt: "stub", width: 1, height: 1 },
  ABOUT_HOTSPOT_CONFIGS: [],
}));

import AboutPage, { metadata } from "./page";
import { BUSINESS } from "@/lib/business/contact-info";

// AboutPage became async when the ShopTheRoom section landed (cf-delight
// Phase 3); resolve the JSX once per test so render() gets the actual
// element tree.
async function renderAbout() {
  const ui = await AboutPage();
  return render(ui);
}

afterEach(() => cleanup());

describe("AboutPage — smoke", () => {
  it("exports metadata.title containing 'About' for the /about tab/SEO", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/About/);
  });

  it("renders an h1 naming the page", async () => {
    await renderAbout();
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
  });

  it("surfaces the 1991 founding year so the family-owned-since story is visible", async () => {
    await renderAbout();
    expect(screen.getAllByText(/1991/).length).toBeGreaterThan(0);
  });

  it("renders the Hendersonville storefront address from BUSINESS", async () => {
    await renderAbout();
    expect(screen.getAllByText(new RegExp(BUSINESS.street, "i")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(BUSINESS.city, "i")).length).toBeGreaterThan(0);
  });

  // cf-93rb A.2: hero band + milestone-strip illustrations are wired into
  // /about. The skyline is decorative; the timeline carries the
  // 1991→present milestone semantics and ships a meaningful alt.
  it("renders the decorative MountainSkyline header band", async () => {
    const { container } = await renderAbout();
    expect(
      container.querySelector("[data-slot='mountain-skyline']"),
    ).not.toBeNull();
  });

  it("renders the BlueRidgeTimeline milestone strip with its company-history alt", async () => {
    await renderAbout();
    expect(
      screen.getByAltText(
        /carolina futons company milestones from 1991 to present/i,
      ),
    ).toBeInTheDocument();
  });

  // cf-delight Phase 3: pin the ShopTheRoom section was wired in.
  it("renders the ShopTheRoom hotspots section", async () => {
    const { container } = await renderAbout();
    expect(container.querySelector("[data-slot='shop-the-room']")).not.toBeNull();
  });
});
