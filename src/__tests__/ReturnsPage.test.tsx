import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import ReturnsPage, { metadata } from "@/app/returns/page";
import { BUSINESS } from "@/lib/business/contact-info";

describe("ReturnsPage — metadata", () => {
  it("exports a title + description", () => {
    expect(metadata.title).toMatch(/returns/i);
    expect(metadata.description).toBeTruthy();
  });
});

describe("ReturnsPage — rendering", () => {
  it("renders the primary h1 heading", () => {
    render(<ReturnsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /returns/i }),
    ).toBeInTheDocument();
  });

  it("states the 30-day return window", () => {
    render(<ReturnsPage />);
    expect(screen.getByText(/30 days of delivery/i)).toBeInTheDocument();
  });

  it("renders a restocking region", () => {
    render(<ReturnsPage />);
    expect(
      screen.getByRole("region", { name: /restocking and return shipping/i }),
    ).toBeInTheDocument();
  });

  it("renders a custom/made-to-order region noting final-sale status", () => {
    render(<ReturnsPage />);
    const region = screen.getByRole("region", { name: /custom and made-to-order/i });
    expect(region.textContent).toMatch(/final sale/i);
  });

  it("renders a damaged-on-arrival region with a 48-hour claim window", () => {
    render(<ReturnsPage />);
    const region = screen.getByRole("region", { name: /damaged on arrival/i });
    expect(region.textContent).toMatch(/48 hours/i);
  });

  it("surfaces the store phone + email as contact links", () => {
    render(<ReturnsPage />);
    expect(screen.getByRole("link", { name: BUSINESS.phone })).toBeInTheDocument();
    // The page has multiple email links (damaged-on-arrival + start-a-return sections)
    const emailLinks = screen.getAllByRole("link", { name: BUSINESS.email });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("constrains body copy to the 65ch measure", () => {
    const { container } = render(<ReturnsPage />);
    expect(container.querySelector("article")?.className).toMatch(/max-w-\[65ch\]/);
  });
});
