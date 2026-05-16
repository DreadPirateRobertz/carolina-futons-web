"use client";

import { useState, type FormEvent } from "react";

import {
  applyCouponAction,
  removeCouponAction,
} from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";

// cf-snil (cf-wsrr.F2) + cf-5qv7 (cf-snil.fu1): in-cart coupon entry.
// Surfaces the `currentCart.updateCurrentCart({ couponCode })` SDK hook so
// users with promo codes from email campaigns / sale URLs / referral
// links can apply the code BEFORE they redirect to the Wix-hosted
// checkout page. cf-5qv7 wires success/remove paths into CartProvider so
// the CartDrawer footer can render the discount line + post-discount
// total before redirect.
//
// "Applied" state reads from CartProvider's appliedCoupon (sourced by
// CartHydrator on mount + setAppliedCoupon on successful apply), not a
// local prop — that way an applyCouponAction success on PDP would
// immediately surface as applied in any CartDrawer that mounts later.

export type CartCouponEntryProps = {
  // Optional initial applied code (test-only — production code reads from
  // useCart().appliedCoupon). Kept for the cf-snil unit tests that pre-
  // date the provider wiring.
  initialAppliedCode?: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "applying" }
  | { kind: "applied"; code: string }
  | { kind: "error"; message: string };

export function CartCouponEntry({ initialAppliedCode }: CartCouponEntryProps = {}) {
  const { appliedCoupon, setAppliedCoupon, clearAppliedCoupon } = useCart();
  // Provider state wins over the test-only prop; the prop only matters
  // when no provider coupon exists yet.
  const activeCode = appliedCoupon?.code ?? initialAppliedCode;
  const [expanded, setExpanded] = useState(Boolean(activeCode));
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>(
    activeCode ? { kind: "applied", code: activeCode } : { kind: "idle" },
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "applying" });
    const result = await applyCouponAction(code);
    if (result.ok) {
      const acceptedCode = result.appliedCoupon?.code ?? code.trim();
      if (result.appliedCoupon) {
        setAppliedCoupon(
          result.appliedCoupon.code,
          result.appliedCoupon.discountCents,
        );
      }
      setStatus({ kind: "applied", code: acceptedCode });
      setCode("");
      return;
    }
    setStatus({ kind: "error", message: result.error });
  }

  async function handleRemove() {
    setStatus({ kind: "applying" });
    const result = await removeCouponAction();
    if (result.ok) {
      clearAppliedCoupon();
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
        {appliedCoupon && appliedCoupon.discountCents > 0 ? null : (
          <p className="mt-1 text-xs text-cf-espresso/80">
            Discount will be reflected on the next page after checkout.
          </p>
        )}
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
