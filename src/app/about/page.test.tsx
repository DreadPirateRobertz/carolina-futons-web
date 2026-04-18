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
});
