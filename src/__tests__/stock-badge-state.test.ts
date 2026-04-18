import { describe, it, expect } from "vitest";

import { getStockBadgeState } from "@/lib/product/stock-badge-state";

describe("getStockBadgeState — 4-case truth table", () => {
  it("returns 'in_stock' when trackInventory=true, inStock=true", () => {
    expect(getStockBadgeState({ trackInventory: true, inStock: true })).toBe(
      "in_stock",
    );
  });

  it("returns 'out_of_stock' when trackInventory=true, inStock=false", () => {
    expect(getStockBadgeState({ trackInventory: true, inStock: false })).toBe(
      "out_of_stock",
    );
  });

  it("returns null when trackInventory=false, inStock=true (untracked claims no state)", () => {
    expect(
      getStockBadgeState({ trackInventory: false, inStock: true }),
    ).toBeNull();
  });

  it("returns null when trackInventory=false, inStock=false (untracked claims no state)", () => {
    expect(
      getStockBadgeState({ trackInventory: false, inStock: false }),
    ).toBeNull();
  });
});

describe("getStockBadgeState — missing-field fallback", () => {
  it("returns null when stock is undefined", () => {
    expect(getStockBadgeState(undefined)).toBeNull();
  });

  it("returns null when stock is null", () => {
    expect(getStockBadgeState(null)).toBeNull();
  });

  it("returns null when trackInventory is missing", () => {
    expect(getStockBadgeState({ inStock: true })).toBeNull();
  });

  it("treats trackInventory=true with missing inStock as out_of_stock (conservative)", () => {
    expect(getStockBadgeState({ trackInventory: true })).toBe("out_of_stock");
  });
});
