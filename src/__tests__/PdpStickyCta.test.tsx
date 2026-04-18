import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PdpStickyCta } from "@/components/product/PdpStickyCta";

describe("PdpStickyCta", () => {
  it("renders nothing when visible=false", () => {
    const { container } = render(
      <PdpStickyCta visible={false} productName="Kingston Futon" formattedPrice="$899">
        <button>Add to cart</button>
      </PdpStickyCta>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a labeled region with name, price, and children when visible=true", () => {
    render(
      <PdpStickyCta visible productName="Kingston Futon" formattedPrice="$899">
        <button>Add to cart</button>
      </PdpStickyCta>,
    );
    // Labelled region so screen readers associate the sticky bar with its purpose.
    const region = screen.getByRole("region", { name: /quick add to cart/i });
    expect(region).toBeTruthy();
    expect(screen.getByText("Kingston Futon")).toBeTruthy();
    expect(screen.getByText("$899")).toBeTruthy();
    expect(screen.getByRole("button", { name: /add to cart/i })).toBeTruthy();
  });

  it("is hidden on print media (data-slot for targeting)", () => {
    render(
      <PdpStickyCta visible productName="x" formattedPrice="$1">
        <button>Add to cart</button>
      </PdpStickyCta>,
    );
    const region = screen.getByRole("region", { name: /quick add to cart/i });
    // Contract: the slot is marked so PDP smoke tests + print CSS can target it.
    expect(region.getAttribute("data-slot")).toBe("pdp-sticky-cta");
    expect(region.className).toContain("print:hidden");
  });

  it("uses fixed positioning with safe-area inset padding on mobile", () => {
    // Contract: sticky bar must respect iOS home-indicator safe area so the CTA
    // does not sit under the notch/indicator on mobile Safari.
    render(
      <PdpStickyCta visible productName="x" formattedPrice="$1">
        <button>Add to cart</button>
      </PdpStickyCta>,
    );
    const region = screen.getByRole("region", { name: /quick add to cart/i });
    expect(region.className).toContain("fixed");
    expect(region.className).toContain("safe-area-inset-bottom");
  });
});
