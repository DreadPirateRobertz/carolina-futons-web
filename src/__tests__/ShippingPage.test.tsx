import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import ShippingPage, { metadata } from "@/app/shipping/page";
import { BUSINESS } from "@/lib/business/contact-info";

describe("ShippingPage — metadata", () => {
  it("exports a title + description", () => {
    expect(metadata.title).toMatch(/shipping/i);
    expect(metadata.description).toBeTruthy();
  });
});

describe("ShippingPage — rendering", () => {
  it("renders the primary h1 heading", () => {
    render(<ShippingPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /shipping/i }),
    ).toBeInTheDocument();
  });

  it("includes the 1991 founding year in the lead copy", () => {
    render(<ShippingPage />);
    expect(screen.getByText(/1991/)).toBeInTheDocument();
  });

  it("renders a lead-times region", () => {
    render(<ShippingPage />);
    expect(screen.getByRole("region", { name: /lead times/i })).toBeInTheDocument();
  });

  it("renders a carriers-and-transit region", () => {
    render(<ShippingPage />);
    expect(
      screen.getByRole("region", { name: /carriers and transit/i }),
    ).toBeInTheDocument();
  });

  it("surfaces the store phone + email as contact links", () => {
    render(<ShippingPage />);
    expect(screen.getByRole("link", { name: BUSINESS.phone })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: BUSINESS.email })).toBeInTheDocument();
  });

  it("constrains body copy to the 65ch measure", () => {
    const { container } = render(<ShippingPage />);
    expect(container.querySelector("article")?.className).toMatch(/max-w-\[65ch\]/);
  });
});
