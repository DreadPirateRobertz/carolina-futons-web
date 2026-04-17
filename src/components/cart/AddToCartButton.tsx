"use client";

import { useState } from "react";

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
    }
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
        className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
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
