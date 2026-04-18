import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PdpStockBadge } from "@/components/product/PdpStockBadge";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PdpStockBadge", () => {
  it("renders 'In stock' chip with role=status, aria-label, and data-stock-state='in_stock'", () => {
    render(<PdpStockBadge stock={{ trackInventory: true, inStock: true }} />);
    const chip = screen.getByRole("status");
    expect(chip.textContent).toMatch(/in stock/i);
    expect(chip.getAttribute("aria-label")).toMatch(/in stock/i);
    expect(chip.getAttribute("data-stock-state")).toBe("in_stock");
  });

  it("renders 'Out of stock' chip with role=status, aria-label, and data-stock-state='out_of_stock'", () => {
    render(<PdpStockBadge stock={{ trackInventory: true, inStock: false }} />);
    const chip = screen.getByRole("status");
    expect(chip.textContent).toMatch(/out of stock/i);
    expect(chip.getAttribute("aria-label")).toMatch(/out of stock/i);
    expect(chip.getAttribute("data-stock-state")).toBe("out_of_stock");
  });

  it("logs a schema-drift canary when trackInventory=true with inStock missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<PdpStockBadge stock={{ trackInventory: true }} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/schema/i);
  });

  it("does not log the canary for tracked items with inStock present", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<PdpStockBadge stock={{ trackInventory: true, inStock: true }} />);
    expect(warn).not.toHaveBeenCalled();
  });

  it("renders nothing when trackInventory=false (untracked item, inStock=true)", () => {
    const { container } = render(
      <PdpStockBadge stock={{ trackInventory: false, inStock: true }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when trackInventory=false (untracked item, inStock=false)", () => {
    const { container } = render(
      <PdpStockBadge stock={{ trackInventory: false, inStock: false }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when stock is missing (no claim)", () => {
    const { container } = render(<PdpStockBadge stock={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies the in-stock semantic class (cf-success) when in_stock", () => {
    render(<PdpStockBadge stock={{ trackInventory: true, inStock: true }} />);
    const chip = screen.getByRole("status");
    expect(chip.className).toMatch(/cf-success/);
  });

  it("applies the out-of-stock semantic class (cf-error) when out_of_stock", () => {
    render(<PdpStockBadge stock={{ trackInventory: true, inStock: false }} />);
    const chip = screen.getByRole("status");
    expect(chip.className).toMatch(/cf-error/);
  });
});
