import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import SustainabilityPage, { metadata } from "./page";

afterEach(() => cleanup());

// /sustainability ports the Wix Sustainability page to cfw. AC: hero +
// 3+ story rows. These tests pin the AC contract — heading present,
// metadata SEO-safe, and at least three story rows visible — so a future
// CMS-swap doesn't silently regress to a blank brand page.
describe("SustainabilityPage — smoke", () => {
  it("exports metadata.title containing 'Sustainability' for the /sustainability tab/SEO", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/Sustainability/i);
  });

  it("renders an h1 with the hero heading", () => {
    render(<SustainabilityPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/cares for the planet/i);
  });

  it("renders at least 3 story rows under the 'How we build it' section", () => {
    render(<SustainabilityPage />);
    const storiesSection = screen.getByRole("region", { name: /how we build it/i });
    const rows = within(storiesSection).getAllByRole("listitem");
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the certifications block with FSC, GREENGUARD, and CertiPUR-US", () => {
    render(<SustainabilityPage />);
    expect(screen.getByText(/FSC Certified/i)).toBeDefined();
    expect(screen.getByText(/GREENGUARD Gold/i)).toBeDefined();
    expect(screen.getByText(/CertiPUR-US/i)).toBeDefined();
  });

  it("renders a trade-in CTA pointing to /contact", () => {
    render(<SustainabilityPage />);
    const cta = screen.getByRole("link", { name: /ask about trade-in/i });
    expect(cta.getAttribute("href")).toBe("/contact");
  });
});
