"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart/store";

export type AddToCartButtonProps = {
  productId: string;
  variantId?: string;
  options?: Record<string, string>;
  quantity?: number;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
};

// Consumes godfrey's variant picker output (cf-3qt.2.1):
//   variantId = selectedVariant._id
//   options   = ChoiceSelection (option name → choice value)
// The store handles optimistic apply + rollback; we only surface loading state
// and the post-mutation error so the user sees a recoverable message.
export function AddToCartButton({
  productId,
  variantId,
  options,
  quantity = 1,
  disabled,
  disabledReason,
  className,
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const storeError = useCartStore((s) => s.error);
  const clearError = useCartStore((s) => s.clearError);
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isDisabled = disabled || pending || !productId || quantity < 1;
  const label = pending ? "Adding…" : "Add to cart";

  async function handleClick() {
    if (isDisabled) return;
    setLocalError(null);
    clearError();
    setPending(true);
    const ok = await addItem({ productId, quantity, variantId, options });
    setPending(false);
    if (!ok) setLocalError(storeError ?? "Could not add to cart");
  }

  const error = localError ?? null;

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
