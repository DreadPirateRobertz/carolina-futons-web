import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PdpWhiteGlove } from "@/components/product/PdpWhiteGlove";

// cf-3r9v: white-glove badge appears on PDP when unitPriceCents is at
// or above $1,500 (150_000 cents). Below threshold the component
// returns null so PDPs for sub-$1,500 SKUs render exactly like before.

describe("PdpWhiteGlove", () => {
  it("renders the badge at the $1,500 threshold", () => {
    render(<PdpWhiteGlove unitPriceCents={150_000} />);
    const region = screen.getByRole("region", {
      name: /free white-glove delivery/i,
    });
    expect(region).toBeInTheDocument();
    expect(region.textContent).toMatch(/schedule delivery at checkout/i);
  });

  it("renders for the audited Ranchero $2,978 SKU", () => {
    render(<PdpWhiteGlove unitPriceCents={297_800} />);
    expect(
      screen.getByRole("region", { name: /free white-glove delivery/i }),
    ).toBeInTheDocument();
  });

  it("renders nothing just below the threshold", () => {
    const { container } = render(
      <PdpWhiteGlove unitPriceCents={149_999} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a sub-$1,500 SKU", () => {
    const { container } = render(<PdpWhiteGlove unitPriceCents={49_900} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when price is non-finite (defensive guard)", () => {
    const { container } = render(<PdpWhiteGlove unitPriceCents={NaN} />);
    expect(container.firstChild).toBeNull();
  });
});
