import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import WarrantyPage, { metadata } from "@/app/warranty/page";
import { BUSINESS } from "@/lib/business/contact-info";

describe("WarrantyPage — metadata", () => {
  it("exports a title + description", () => {
    expect(metadata.title).toMatch(/warranty/i);
    expect(metadata.description).toBeTruthy();
    expect(metadata.description as string).toContain(`${BUSINESS.warrantyYears}-year`);
  });
});

describe("WarrantyPage — rendering", () => {
  it("renders the h1 with the 15-year warranty headline", () => {
    render(<WarrantyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /15-year warranty/i }),
    ).toBeInTheDocument();
  });

  it("mentions the 1991 founding year", () => {
    render(<WarrantyPage />);
    expect(screen.getByText(/1991/)).toBeInTheDocument();
  });

  it("renders a coverage region", () => {
    render(<WarrantyPage />);
    expect(
      screen.getByRole("region", { name: /what the warranty covers/i }),
    ).toBeInTheDocument();
  });

  it("renders an exclusions region", () => {
    render(<WarrantyPage />);
    expect(
      screen.getByRole("region", {
        name: /what the warranty does not cover/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders a transferability region that states not transferable", () => {
    render(<WarrantyPage />);
    const region = screen.getByRole("region", { name: /transferability/i });
    expect(region.textContent).toMatch(/not transferable/i);
  });

  it("renders a filing-a-claim region with email + phone", () => {
    render(<WarrantyPage />);
    const region = screen.getByRole("region", { name: /filing a claim/i });
    expect(region.textContent).toContain(BUSINESS.email);
    expect(region.textContent).toContain(BUSINESS.phone);
  });

  it("constrains body copy to the 65ch measure", () => {
    const { container } = render(<WarrantyPage />);
    expect(container.querySelector("article")?.className).toMatch(/max-w-\[65ch\]/);
  });
});
