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

describe("ShippingPage — JSON-LD (cfw-r0i)", () => {
  it("emits a LocalBusiness JSON-LD <script> tag (mirrors Wix injectShippingSchema)", () => {
    const { container } = render(<ShippingPage />);
    const script = container.querySelector(
      'script[type="application/ld+json"]#jsonld-shipping-localbusiness',
    );
    expect(script).not.toBeNull();
    const json = JSON.parse(script!.textContent ?? "{}");
    expect(json["@type"]).toBe("LocalBusiness");
    expect(json["@context"]).toBe("https://schema.org");
    expect(typeof json.name).toBe("string");
    expect(json.name.length).toBeGreaterThan(0);
  });
});

describe("ShippingPage — Once-it-arrives cross-link (cfw-kqry)", () => {
  it("renders the 'Once it arrives' section", () => {
    render(<ShippingPage />);
    expect(
      screen.getByRole("region", { name: /once it arrives/i }),
    ).toBeInTheDocument();
  });

  it("links to /guides (buying & care hub)", () => {
    render(<ShippingPage />);
    const link = screen.getByRole("link", { name: /buying.*care guides/i });
    expect(link).toHaveAttribute("href", "/guides");
  });

  it("links to the specific /guides/warranty-and-care entry", () => {
    render(<ShippingPage />);
    const link = screen.getByRole("link", { name: /warranty.*care guide/i });
    expect(link).toHaveAttribute("href", "/guides/warranty-and-care");
  });
});
