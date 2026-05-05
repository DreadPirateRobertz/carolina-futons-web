import { describe, it, expect } from "vitest";
import { calcBundlePrice, formatUSD } from "@/lib/bundle/pricing";

describe("calcBundlePrice", () => {
  it("applies 5% discount when subtotal is $500–$999", () => {
    const result = calcBundlePrice(400, 200, 0); // subtotal = 600
    expect(result.discountPct).toBe(5);
    expect(result.subtotal).toBe(600);
    expect(result.discountAmount).toBe(30);
    expect(result.total).toBe(570);
  });

  it("applies 7% discount when subtotal is $1000–$1999", () => {
    const result = calcBundlePrice(700, 400, 0); // subtotal = 1100
    expect(result.discountPct).toBe(7);
    expect(result.discountAmount).toBe(77);
    expect(result.total).toBe(1023);
  });

  it("applies 10% discount when subtotal is $2000+", () => {
    const result = calcBundlePrice(1500, 600, 0); // subtotal = 2100
    expect(result.discountPct).toBe(10);
    expect(result.discountAmount).toBe(210);
    expect(result.total).toBe(1890);
  });

  it("applies no discount when subtotal is below $500", () => {
    const result = calcBundlePrice(200, 150, 0); // subtotal = 350
    expect(result.discountPct).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(350);
  });

  it("adds accessories at full price (not discounted)", () => {
    const result = calcBundlePrice(700, 400, 50); // frame+mattress=$1100, accessories=$50
    expect(result.discountPct).toBe(7);
    expect(result.accessoriesTotal).toBe(50);
    // discount only on frame+mattress subtotal
    expect(result.total).toBe(1023 + 50);
  });

  it("handles zero prices without dividing by zero", () => {
    const result = calcBundlePrice(0, 0, 0);
    expect(result.discountPct).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe("formatUSD", () => {
  it("formats whole-dollar amounts without cents", () => {
    expect(formatUSD(1200)).toMatch(/\$1,200/);
  });

  it("formats zero as $0", () => {
    expect(formatUSD(0)).toMatch(/\$0/);
  });
});
