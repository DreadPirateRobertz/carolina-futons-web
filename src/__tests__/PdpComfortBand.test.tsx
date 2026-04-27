import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PdpComfortBand } from "@/components/product/PdpComfortBand";

// marugame-illustrations: comfort-level callout band with inline SVG scenes.

describe("PdpComfortBand (cf-marugame-illustrations)", () => {
  it("renders the comfort levels landmark", () => {
    render(<PdpComfortBand />);
    expect(
      screen.getByRole("region", { name: /comfort levels/i }),
    ).toBeInTheDocument();
  });

  it("renders all three comfort level labels", () => {
    render(<PdpComfortBand />);
    expect(screen.getByText(/^plush$/i)).toBeInTheDocument();
    expect(screen.getByText(/^medium$/i)).toBeInTheDocument();
    expect(screen.getByText(/^firm$/i)).toBeInTheDocument();
  });

  it("renders a tagline for each comfort level", () => {
    render(<PdpComfortBand />);
    expect(screen.getByText(/cloud-soft support/i)).toBeInTheDocument();
    expect(screen.getByText(/balanced everyday comfort/i)).toBeInTheDocument();
    expect(screen.getByText(/structured, supportive feel/i)).toBeInTheDocument();
  });

  it("renders exactly three list items", () => {
    render(<PdpComfortBand />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders three aria-hidden decorative SVG scenes", () => {
    const { container } = render(<PdpComfortBand />);
    const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgs).toHaveLength(3);
  });

  it("exposes the pdp-comfort-band data slot", () => {
    const { container } = render(<PdpComfortBand />);
    expect(
      container.querySelector('[data-slot="pdp-comfort-band"]'),
    ).not.toBeNull();
  });

  it("presents comfort levels in soft-to-firm order", () => {
    render(<PdpComfortBand />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/plush/i);
    expect(items[1]).toHaveTextContent(/medium/i);
    expect(items[2]).toHaveTextContent(/firm/i);
  });
});
