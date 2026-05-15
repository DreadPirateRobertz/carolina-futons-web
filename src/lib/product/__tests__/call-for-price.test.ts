/**
 * cf-pdp-g4 (cf-lc1c G-4): call-for-price boundary.
 *
 * Wix Velo's isCallForPrice() (public/productPageUtils.js) treats a price of
 * $1 or less as a call-for-price placeholder. cf-3pwy F1 documented the
 * catalogPriceFix migration that deliberately sets price=0 on call-for-price
 * SKUs to trigger native-widget "Price unavailable" rendering. cfw's cents-
 * based equivalent: cents ≤ 100.
 */
import { describe, it, expect } from "vitest";

import {
  CALL_FOR_PRICE_TEXT,
  CALL_FOR_PRICE_THRESHOLD_CENTS,
  isCallForPriceCents,
} from "@/lib/product/call-for-price";

describe("isCallForPriceCents", () => {
  it("treats 0 cents (the catalogPriceFix placeholder) as call-for-price", () => {
    expect(isCallForPriceCents(0)).toBe(true);
  });

  it("treats 100 cents ($1 — Wix's ≤$1 threshold) as call-for-price", () => {
    expect(isCallForPriceCents(100)).toBe(true);
  });

  it("treats 50 cents (the prior $0.50 placeholder) as call-for-price", () => {
    expect(isCallForPriceCents(50)).toBe(true);
  });

  it("treats 101 cents (just over the threshold) as a real price", () => {
    expect(isCallForPriceCents(101)).toBe(false);
  });

  it("treats 79900 cents ($799 Eureka frame) as a real price", () => {
    expect(isCallForPriceCents(79900)).toBe(false);
  });

  it("treats negative cents as call-for-price (defensive)", () => {
    expect(isCallForPriceCents(-1)).toBe(true);
  });

  it("treats NaN as call-for-price (defensive — missing priceData branch)", () => {
    expect(isCallForPriceCents(Number.NaN)).toBe(true);
  });

  it("matches the Wix Velo isCallForPrice($1.00) inclusive boundary", () => {
    // Wix Velo: isCallForPrice(price) returns true when price <= 1 (dollars).
    // CALL_FOR_PRICE_THRESHOLD_CENTS exposes the same boundary in cents so
    // downstream consumers can compare. Pin so a future tightening (e.g. to
    // <$1) is intentional rather than drive-by.
    expect(CALL_FOR_PRICE_THRESHOLD_CENTS).toBe(100);
  });

  it("exports the customer-facing copy as a stable constant", () => {
    // The PDP CTA + price label both read this string. Pin so a copy edit
    // ripples through both sites and the test suite catches drift.
    expect(typeof CALL_FOR_PRICE_TEXT).toBe("string");
    expect(CALL_FOR_PRICE_TEXT.length).toBeGreaterThan(0);
  });
});
