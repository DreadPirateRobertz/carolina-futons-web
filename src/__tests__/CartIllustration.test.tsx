import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { CartIllustration } from "@/components/illustrations/CartIllustration";

// marugame-illustrations: filled-cart Blue Ridge strip contract.

describe("CartIllustration", () => {
  it("renders an svg slot with aria-hidden so AT users skip it", () => {
    const { container } = render(<CartIllustration />);
    const svg = container.querySelector("[data-slot='cart-illustration']");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("merges a caller-supplied className for layout overrides", () => {
    const { container } = render(<CartIllustration className="w-full" />);
    const svg = container.querySelector("[data-slot='cart-illustration']");
    expect(svg?.getAttribute("class")).toContain("w-full");
    expect(svg?.getAttribute("class")).toContain("pointer-events-none");
  });
});
