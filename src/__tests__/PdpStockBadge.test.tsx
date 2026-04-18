import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PdpStockBadge } from "@/components/product/PdpStockBadge";
import { getStockBadgeState } from "@/lib/product/stock-badge-state";

afterEach(() => {
  vi.restoreAllMocks();
});

// ── getStockBadgeState unit tests ───────────────────────────────────────────

describe("getStockBadgeState", () => {
  it("returns null when stock is null or undefined", () => {
    expect(getStockBadgeState(null)).toBeNull();
    expect(getStockBadgeState(undefined)).toBeNull();
  });

  it("returns null when trackInventory is false or absent", () => {
    expect(getStockBadgeState({ trackInventory: false, inStock: true })).toBeNull();
    expect(getStockBadgeState({ inStock: true })).toBeNull();
  });

  it("returns 'in_stock' when tracked, inStock=true, quantity > 5", () => {
    expect(getStockBadgeState({ trackInventory: true, inStock: true, quantity: 6 })).toBe("in_stock");
  });

  it("returns 'in_stock' when tracked, inStock=true, quantity absent", () => {
    expect(getStockBadgeState({ trackInventory: true, inStock: true })).toBe("in_stock");
    expect(getStockBadgeState({ trackInventory: true, inStock: true, quantity: null })).toBe("in_stock");
  });

  it("returns 'low_stock' when tracked, inStock=true, quantity <= 5", () => {
    expect(getStockBadgeState({ trackInventory: true, inStock: true, quantity: 5 })).toBe("low_stock");
    expect(getStockBadgeState({ trackInventory: true, inStock: true, quantity: 1 })).toBe("low_stock");
  });

  it("returns 'out_of_stock' when tracked and inStock=false", () => {
    expect(getStockBadgeState({ trackInventory: true, inStock: false })).toBe("out_of_stock");
  });

  it("returns 'out_of_stock' when tracked and inStock is null (conservative)", () => {
    expect(getStockBadgeState({ trackInventory: true, inStock: null })).toBe("out_of_stock");
  });

  it("returns 'out_of_stock' when tracked, inStock=true, but quantity=0 (stale flag)", () => {
    expect(getStockBadgeState({ trackInventory: true, inStock: true, quantity: 0 })).toBe("out_of_stock");
  });

  it("returns 'out_of_stock' when tracked, inStock=true, but quantity < 0 (oversell)", () => {
    expect(getStockBadgeState({ trackInventory: true, inStock: true, quantity: -1 })).toBe("out_of_stock");
  });
});

// ── PdpStockBadge render tests ──────────────────────────────────────────────

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

  it("renders low-stock badge with quantity and cf-warning class", () => {
    render(<PdpStockBadge stock={{ trackInventory: true, inStock: true, quantity: 3 }} />);
    const chip = screen.getByRole("status");
    expect(chip.getAttribute("aria-label")).toBe("Low stock — 3 left");
    expect(chip.getAttribute("data-stock-state")).toBe("low_stock");
    expect(chip.textContent).toMatch(/low stock.*3 left/i);
    expect(chip.className).toMatch(/cf-warning/);
  });

  it("renders 'In stock' (not low-stock) when quantity=6 (above threshold)", () => {
    render(<PdpStockBadge stock={{ trackInventory: true, inStock: true, quantity: 6 }} />);
    const chip = screen.getByRole("status");
    expect(chip.getAttribute("data-stock-state")).toBe("in_stock");
    expect(chip.getAttribute("aria-label")).toBe("In stock");
  });

  it("renders 'Out of stock' when inStock=true but quantity=0 (stale flag)", () => {
    render(<PdpStockBadge stock={{ trackInventory: true, inStock: true, quantity: 0 }} />);
    const chip = screen.getByRole("status");
    expect(chip.getAttribute("data-stock-state")).toBe("out_of_stock");
    expect(chip.getAttribute("aria-label")).toBe("Out of stock");
  });

  it("renders 'Out of stock' when inStock=null (canary: warn + OOS chip)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<PdpStockBadge stock={{ trackInventory: true, inStock: null }} />);
    const chip = screen.getByRole("status");
    expect(chip.getAttribute("data-stock-state")).toBe("out_of_stock");
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
