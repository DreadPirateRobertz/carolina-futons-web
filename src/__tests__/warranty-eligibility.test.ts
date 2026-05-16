/**
 * cf-g640 (cfw-avc.fu1): PdpWarrantyInfo must only render for products
 * covered by the uniform 15-year frame warranty. Mattresses and covers
 * carry separate manufacturer terms documented on /warranty; rendering
 * the frame warranty section on those PDPs miscommunicates the actual
 * coverage and creates real legal exposure (NC GS 25-2-313).
 *
 * `qualifiesForFrameWarranty(slug)` is the gate. The PDP page wraps the
 * <PdpWarrantyInfo /> render in this predicate; the component itself
 * stays pure (no category awareness).
 *
 * Decision: ALLOWLIST (slug prefix/suffix shape) — conservative default
 * returns false for unknown slugs. The customer-facing risk of
 * accidentally renaming a frame slug and missing the warranty surface
 * (acceptable: customer sees no warranty section, asks support) is much
 * lower than the risk of accidentally classifying a mattress as a frame
 * (unacceptable: customer registers, denied 4 years later).
 */
import { describe, expect, it } from "vitest";

import { qualifiesForFrameWarranty } from "@/lib/product/warranty-eligibility";

describe("qualifiesForFrameWarranty", () => {
  it("returns true for futon frame slugs", () => {
    expect(qualifiesForFrameWarranty("kingston-futon-frame")).toBe(true);
    expect(qualifiesForFrameWarranty("cambridge-futon-frame")).toBe(true);
    expect(qualifiesForFrameWarranty("brooklyn-futon")).toBe(true);
  });

  it("returns true for Murphy cabinet bed slugs", () => {
    expect(qualifiesForFrameWarranty("murphy-cabinet-bed-queen")).toBe(true);
    expect(qualifiesForFrameWarranty("aspen-murphy-bed")).toBe(true);
  });

  it("returns true for platform bed slugs", () => {
    expect(qualifiesForFrameWarranty("kingston-platform-bed")).toBe(true);
    expect(qualifiesForFrameWarranty("lowline-platform-bed-king")).toBe(true);
  });

  it("returns true for sofa bed slugs", () => {
    expect(qualifiesForFrameWarranty("cody-sofa-bed")).toBe(true);
    expect(qualifiesForFrameWarranty("urban-sofabed")).toBe(true);
  });

  it("returns FALSE for mattress slugs (separate manufacturer terms)", () => {
    expect(qualifiesForFrameWarranty("mesa-1000-mattress")).toBe(false);
    expect(qualifiesForFrameWarranty("mesa-3000-mattress")).toBe(false);
    expect(qualifiesForFrameWarranty("mesa-5000-mattress")).toBe(false);
    expect(qualifiesForFrameWarranty("organic-cotton-mattress")).toBe(false);
  });

  it("returns FALSE for cover/slipcover slugs (separate terms)", () => {
    expect(qualifiesForFrameWarranty("kingston-cover")).toBe(false);
    expect(qualifiesForFrameWarranty("twin-mattress-cover")).toBe(false);
    expect(qualifiesForFrameWarranty("herringbone-slipcover")).toBe(false);
  });

  it("returns FALSE for unknown / accessory slugs (conservative default)", () => {
    // Better to silently omit the warranty section on an unknown SKU than
    // to render the frame warranty copy on an item that carries no such
    // coverage. The customer can find /warranty via the footer link.
    expect(qualifiesForFrameWarranty("bedside-lamp")).toBe(false);
    expect(qualifiesForFrameWarranty("gift-card-50")).toBe(false);
    expect(qualifiesForFrameWarranty("")).toBe(false);
  });

  it("handles empty / whitespace input defensively", () => {
    expect(qualifiesForFrameWarranty("")).toBe(false);
    expect(qualifiesForFrameWarranty("   ")).toBe(false);
  });

  it("is case-insensitive on the slug match", () => {
    // Slugs are conventionally lowercase, but a redirect-map mistake or
    // a future CMS migration could surface mixed case. Defensive.
    expect(qualifiesForFrameWarranty("KINGSTON-FUTON-FRAME")).toBe(true);
    expect(qualifiesForFrameWarranty("Mesa-1000-Mattress")).toBe(false);
  });
});
