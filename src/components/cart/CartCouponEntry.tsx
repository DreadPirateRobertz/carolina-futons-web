"use client";

import { useState, type FormEvent } from "react";

import {
  applyCouponAction,
  removeCouponAction,
} from "@/app/actions/cart";

// cf-snil (cf-wsrr.F2): in-cart coupon entry. Surfaces the
// `currentCart.updateCurrentCart({ couponCode })` SDK hook so users with
// promo codes from email campaigns / sale URLs / referral links can apply
// the code BEFORE they redirect to the Wix-hosted checkout page.
//
// Pre-cf-snil: cfw had no UI for coupons; users had to enter the code on
// the Wix-hosted page after the checkout redirect. cf-wsrr cart-parity
// audit (2026-05-15) graded this as the single most-impactful cart parity
// gap vs Wix Studio.
//
// Scope of THIS component:
// - Collapsible input + Apply button
// - "Applied" state showing the accepted code + Remove control
// - Inline error message for invalid codes (no toast layer in this rev)
//
// NOT in scope (cf-snil.fu1):
// - Reflecting the discount in the CartDrawer subtotal (requires
//   threading appliedDiscounts through CartProvider state). The Wix-
//   hosted checkout page still shows the discount correctly — the
//   in-cart "Applied" indicator is the first-cut feedback users need.

export type CartCouponEntryProps = {
  // Optional initial applied code (for SSR hydration once
  // CartProvider tracks it). Today this is undefined.
  initialAppliedCode?: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "applying" }
  | { kind: "applied"; code: string }
  | { kind: "error"; message: string };

export function CartCouponEntry({ initialAppliedCode }: CartCouponEntryProps = {}) {
  const [expanded, setExpanded] = useState(Boolean(initialAppliedCode));
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>(
    initialAppliedCode
      ? { kind: "applied", code: initialAppliedCode }
      : { kind: "idle" },
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "applying" });
    const result = await applyCouponAction(code);
    if (result.ok) {
      setStatus({ kind: "applied", code: code.trim() });
      setCode("");
      return;
    }
    setStatus({ kind: "error", message: result.error });
  }

  async function handleRemove() {
    setStatus({ kind: "applying" });
    const result = await removeCouponAction();
    if (result.ok) {
      setStatus({ kind: "idle" });
      return;
    }
    setStatus({ kind: "error", message: result.error });
  }

  const applying = status.kind === "applying";

  if (!expanded) {
    return (
      <div className="mt-3" data-testid="cart-coupon-entry-collapsed">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm text-cf-cta underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 rounded-sm"
          data-testid="cart-coupon-toggle"
        >
          Have a promo code?
        </button>
      </div>
    );
  }

  if (status.kind === "applied") {
    return (
      <div
        className="mt-3 rounded-md bg-cf-sand/40 px-3 py-2"
        data-testid="cart-coupon-entry-applied"
      >
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-cf-espresso">
            <span aria-hidden="true">✓ </span>
            Code <strong data-testid="cart-coupon-applied-code">{status.code}</strong> applied
          </p>
          <button
            type="button"
            onClick={handleRemove}
            disabled={applying}
            className="text-xs text-cf-espresso/80 underline underline-offset-2 hover:no-underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 rounded-sm"
            data-testid="cart-coupon-remove"
          >
            Remove
          </button>
        </div>
        <p className="mt-1 text-xs text-cf-espresso/80">
          Discount will be reflected on the next page after checkout.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3"
      data-testid="cart-coupon-entry-form"
      noValidate
    >
      <label
        htmlFor="cart-coupon-input"
        className="block text-xs font-medium text-cf-espresso"
      >
        Promo code
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="cart-coupon-input"
          name="couponCode"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={applying}
          placeholder="SUMMER15"
          className="block w-full rounded-md border border-cf-charcoal/20 bg-white px-3 py-2 text-sm text-cf-espresso placeholder-cf-charcoal/60 shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
          data-testid="cart-coupon-input"
        />
        <button
          type="submit"
          disabled={applying || code.trim().length === 0}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-cf-cta px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cf-cta/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
          data-testid="cart-coupon-apply"
        >
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>
      {status.kind === "error" ? (
        <p
          role="alert"
          className="mt-1 text-xs text-red-700"
          data-testid="cart-coupon-error"
        >
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
