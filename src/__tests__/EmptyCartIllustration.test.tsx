import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { EmptyCartIllustration } from "@/components/illustrations/EmptyCartIllustration";

// cf-93rb Phase E — empty-cart illustration contract.
//
// Decorative element next to the "Your cart is empty" heading. The
// heading carries the meaning, so the SVG must stay out of the AT tree
// (aria-hidden) and ship an empty default alt-equivalent.

describe("EmptyCartIllustration", () => {
  it("renders an svg slot with aria-hidden so AT users skip it", () => {
    const { container } = render(<EmptyCartIllustration />);
    const svg = container.querySelector(
      "[data-slot='empty-cart-illustration']",
    );
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("merges a caller-supplied className for layout overrides", () => {
    const { container } = render(
      <EmptyCartIllustration className="max-w-[180px]" />,
    );
    const svg = container.querySelector(
      "[data-slot='empty-cart-illustration']",
    );
    expect(svg?.getAttribute("class")).toContain("max-w-[180px]");
    expect(svg?.getAttribute("class")).toContain("pointer-events-none");
  });
});
