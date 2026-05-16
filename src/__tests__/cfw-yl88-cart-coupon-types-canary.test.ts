// cfw-yl88: canary that fails to COMPILE if a future PR drops the
// optional `appliedCoupon` field from CartActionResult or HydrateCartResult.
//
// WHY: cf-5qv7 added coupon state to the cart-state reducer + components
// (CartCouponEntry, CartHydrator) read `result.appliedCoupon` from the
// server-action results — but the producer-side types were missed in
// that land, so every PR's `tsc --noEmit` failed with TS2339 on main.
// This canary keeps the producer ⇄ consumer type contract from drifting
// again: if either type loses the field, the type predicates here stop
// being assignable and CI's typecheck job catches it before merge.
//
// Tests don't assert behavior — production code does. The compile pass
// IS the assertion. Vitest's runtime suite just confirms the module
// imports cleanly so the typecheck step actually runs against it.

import { describe, expect, it } from "vitest";

import type { CartActionResult, HydrateCartResult } from "@/app/actions/cart";
import type { AppliedCoupon } from "@/lib/cart/cart-state";

describe("cfw-yl88 — cart action result types include appliedCoupon", () => {
  it("CartActionResult.ok=true accepts appliedCoupon", () => {
    const sample: CartActionResult = {
      ok: true,
      cart: null,
      appliedCoupon: { code: "SUMMER15", discountCents: 1500 },
    };
    if (sample.ok) {
      // Compile-time witness that the field is reachable post-narrow.
      const acc: AppliedCoupon | undefined = sample.appliedCoupon;
      expect(acc?.code).toBe("SUMMER15");
      expect(acc?.discountCents).toBe(1500);
    }
  });

  it("CartActionResult.ok=true is valid without appliedCoupon (optional)", () => {
    const sample: CartActionResult = { ok: true, cart: null };
    if (sample.ok) {
      expect(sample.appliedCoupon).toBeUndefined();
    }
  });

  it("HydrateCartResult.ok=true accepts appliedCoupon", () => {
    const sample: HydrateCartResult = {
      ok: true,
      lines: [],
      appliedCoupon: { code: "WELCOME", discountCents: 500 },
    };
    if (sample.ok) {
      const acc: AppliedCoupon | undefined = sample.appliedCoupon;
      expect(acc?.code).toBe("WELCOME");
      expect(acc?.discountCents).toBe(500);
    }
  });

  it("HydrateCartResult.ok=true is valid without appliedCoupon (optional)", () => {
    const sample: HydrateCartResult = { ok: true, lines: [] };
    if (sample.ok) {
      expect(sample.appliedCoupon).toBeUndefined();
    }
  });

  it("error branches remain unaffected", () => {
    const aerr: CartActionResult = { ok: false, error: "Invalid code" };
    const herr: HydrateCartResult = { ok: false, error: "Network error" };
    if (!aerr.ok) expect(aerr.error).toBe("Invalid code");
    if (!herr.ok) expect(herr.error).toBe("Network error");
  });
});
