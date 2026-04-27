"use client";

import { useState } from "react";

import { fireMetaEvent } from "@/components/analytics/MetaPixel";
import { trackAddToCart } from "@/lib/analytics/ga4-events";
import { useCart } from "@/components/cart/CartProvider";
import { makeLineId, type CartLineItem } from "@/lib/cart/cart-state";
import { addItemAction } from "@/app/actions/cart";

export type AddToCartButtonProps = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  formattedUnitPrice: string;
  variantId?: string;
  variantLabel?: string;
  imageUrl?: string;
  productUrl?: string;
  options?: Record<string, string>;
  quantity?: number;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  // Fires after the server action confirms the line was added. Used by the
  // PDP sticky-CTA spike (cf-pdp-sticky-cta) to auto-dismiss the bottom sheet
  // once the user has successfully added — failure path keeps the sheet open
  // so the inline error remains visible.
  onAdded?: () => void;
};

// Client-cart-first per cf-3qt.2.3 contract: call useCart().addLine() for
// instant UI, then fire the server action to keep Wix currentCart in sync so
// cf-3qt.2.4 checkout (which creates the redirect from currentCart) sees the
// same lines. On server failure we roll the optimistic line back out via
// removeLine() and surface a recoverable error.
export function AddToCartButton({
  productId,
  productName,
  unitPriceCents,
  formattedUnitPrice,
  variantId,
  variantLabel,
  imageUrl,
  productUrl,
  options,
  quantity = 1,
  disabled,
  disabledReason,
  className,
  onAdded,
}: AddToCartButtonProps) {
  const { addLine, removeLine, openCart } = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = disabled || pending || !productId || quantity < 1;
  const label = pending ? "Adding…" : "Add to cart";

  async function handleClick() {
    if (isDisabled) return;
    setError(null);
    const line: CartLineItem = {
      id: makeLineId(productId, variantId),
      productId,
      productName,
      variantId,
      variantLabel,
      imageUrl,
      productUrl,
      quantity,
      unitPriceCents,
      formattedUnitPrice,
    };
    addLine(line);
    openCart();
    setPending(true);
    const result = await addItemAction({
      productId,
      quantity,
      variantId,
      options,
    });
    setPending(false);
    if (!result.ok) {
      removeLine(line.id);
      setError(result.error ?? "Could not add to cart");
      return;
    }
    // Pixel events fire only after the server confirms the line so the
    // analytics signal aligns with the real cart state (no inflated counts
    // on validation failures). Each helper no-ops when its install env is
    // unset.
    fireMetaEvent("AddToCart", {
      content_ids: [productId],
      content_type: "product",
      value: (unitPriceCents * quantity) / 100,
      currency: "USD",
      contents: [{ id: productId, quantity }],
    });
    trackAddToCart({
      item_id: productId,
      item_name: productName,
      item_variant: variantLabel,
      price: unitPriceCents / 100,
      quantity,
    });
    onAdded?.();
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-describedby={
          disabledReason || error ? "add-to-cart-status" : undefined
        }
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {label}
      </button>
      {disabledReason && !error ? (
        <p
          id="add-to-cart-status"
          className="mt-2 text-sm text-zinc-600"
          role="status"
        >
          {disabledReason}
        </p>
      ) : null}
      {error ? (
        <p
          id="add-to-cart-status"
          className="mt-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
