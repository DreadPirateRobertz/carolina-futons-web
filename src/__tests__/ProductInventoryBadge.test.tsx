import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProductInventoryBadge } from "@/components/product/ProductInventoryBadge";

// cfw-6bp: variant-aware "Only N left in stock" urgency cue. The badge
// must stay silent outside the narrow low-stock window so it never
// double-claims with PdpStockBadge (in-stock / out-of-stock chip).

describe("<ProductInventoryBadge />", () => {
  it("renders 'Only N left in stock' when 1 ≤ quantity ≤ 5", () => {
    render(<ProductInventoryBadge quantity={3} />);
    const badge = screen.getByRole("status");
    expect(badge.textContent).toBe("Only 3 left in stock");
    expect(badge.getAttribute("aria-label")).toBe("Only 3 left in stock");
    expect(badge.getAttribute("data-slot")).toBe("product-inventory-badge");
  });

  it("renders the boundary value quantity=5 as low stock", () => {
    render(<ProductInventoryBadge quantity={5} />);
    expect(screen.getByRole("status").textContent).toBe("Only 5 left in stock");
  });

  it("renders the floor value quantity=1 as low stock", () => {
    render(<ProductInventoryBadge quantity={1} />);
    expect(screen.getByRole("status").textContent).toBe("Only 1 left in stock");
  });

  it("renders nothing when quantity is greater than the threshold (count > 5)", () => {
    const { container } = render(<ProductInventoryBadge quantity={6} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when quantity is zero (out-of-stock owns its own badge)", () => {
    const { container } = render(<ProductInventoryBadge quantity={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for negative oversell quantities", () => {
    const { container } = render(<ProductInventoryBadge quantity={-2} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when quantity is null (untracked / unknown)", () => {
    const { container } = render(<ProductInventoryBadge quantity={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when quantity is undefined", () => {
    const { container } = render(<ProductInventoryBadge quantity={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when quantity is NaN (defensive against bad upstream data)", () => {
    const { container } = render(<ProductInventoryBadge quantity={Number.NaN} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when quantity is Infinity", () => {
    const { container } = render(
      <ProductInventoryBadge quantity={Number.POSITIVE_INFINITY} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
