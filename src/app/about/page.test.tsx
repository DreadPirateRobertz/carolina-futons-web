import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import AboutPage, { metadata } from "./page";
import { BUSINESS } from "@/lib/business/contact-info";

afterEach(() => cleanup());

describe("AboutPage — smoke", () => {
  it("exports metadata.title containing 'About' for the /about tab/SEO", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/About/);
  });

  it("renders an h1 naming the page", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
  });

  it("surfaces the 1991 founding year so the family-owned-since story is visible", () => {
    render(<AboutPage />);
    expect(screen.getAllByText(/1991/).length).toBeGreaterThan(0);
  });

  it("renders the Hendersonville storefront address from BUSINESS", () => {
    render(<AboutPage />);
    expect(screen.getAllByText(new RegExp(BUSINESS.street, "i")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(BUSINESS.city, "i")).length).toBeGreaterThan(0);
  });

  // cf-93rb A.2: hero band + milestone-strip illustrations are wired into
  // /about. The skyline is decorative; the timeline carries the
  // 1991→present milestone semantics and ships a meaningful alt.
  it("renders the decorative MountainSkyline header band", () => {
    const { container } = render(<AboutPage />);
    expect(
      container.querySelector("[data-slot='mountain-skyline']"),
    ).not.toBeNull();
  });

  it("renders the BlueRidgeTimeline milestone strip with its company-history alt", () => {
    render(<AboutPage />);
    expect(
      screen.getByAltText(
        /carolina futons company milestones from 1991 to present/i,
      ),
    ).toBeInTheDocument();
  });
});
