import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { PackingBearIllustration } from "@/components/illustrations/PackingBearIllustration";

// cfw-pm3: companion illustration on the populated /cart page. Decorative
// (heading carries meaning) so AT users skip it; layout-overridable via
// caller className.

describe("PackingBearIllustration", () => {
  it("renders an svg slot with aria-hidden so AT users skip it", () => {
    const { container } = render(<PackingBearIllustration />);
    const svg = container.querySelector(
      "[data-slot='packing-bear-illustration']",
    );
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("includes the wrapped parcel detail (distinct from sleeping-bear empty state)", () => {
    const { container } = render(<PackingBearIllustration />);
    expect(
      container.querySelector("[data-slot='packing-bear-parcel']"),
    ).not.toBeNull();
  });

  it("merges a caller-supplied className for layout overrides", () => {
    const { container } = render(
      <PackingBearIllustration className="w-[180px]" />,
    );
    const svg = container.querySelector(
      "[data-slot='packing-bear-illustration']",
    );
    expect(svg?.getAttribute("class")).toContain("w-[180px]");
    expect(svg?.getAttribute("class")).toContain("pointer-events-none");
  });
});
