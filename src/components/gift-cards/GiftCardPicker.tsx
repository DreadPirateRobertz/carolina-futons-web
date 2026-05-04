"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { addItemAction } from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";
import { makeLineId } from "@/lib/cart/cart-state";
import type { WixProduct } from "@/lib/wix/products";

type Props = { cards: WixProduct[] };

export function GiftCardPicker({ cards }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    cards[0]?._id ?? null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addLine, removeLine, openCart } = useCart();

  if (cards.length === 0) {
    return (
      <p className="text-cf-charcoal/60">
        Gift cards are coming soon — check back shortly.
      </p>
    );
  }

  const selected = cards.find((c) => c._id === selectedId) ?? cards[0];
  const priceCents = Math.round((selected.priceData?.price ?? 0) * 100);
  const formattedPrice = selected.priceData?.formatted?.price ?? `$${selected.priceData?.price ?? 0}`;
  const imageUrl = selected.media?.mainMedia?.image?.url;

  async function handleAddToCart() {
    if (!selected._id) return;
    setPending(true);
    setError(null);

    const tempId = makeLineId(selected._id);
    addLine({
      id: tempId,
      productId: selected._id,
      productName: selected.name ?? "Gift Card",
      quantity: 1,
      unitPriceCents: priceCents,
      formattedUnitPrice: formattedPrice,
      imageUrl,
    });

    const result = await addItemAction({ productId: selected._id, quantity: 1 });
    setPending(false);

    if (!result.ok) {
      removeLine(tempId);
      setError(result.error);
      return;
    }
    openCart();
  }

  return (
    <div className="space-y-8">
      {/* Denomination grid */}
      <div>
        <p className="mb-3 text-sm font-medium text-cf-charcoal">
          Select amount
        </p>
        <div className="flex flex-wrap gap-3">
          {cards.map((card) => {
            const label =
              card.priceData?.formatted?.price ??
              `$${card.priceData?.price ?? ""}`;
            return (
              <button
                key={card._id}
                type="button"
                aria-pressed={card._id === selectedId}
                onClick={() => {
                  setSelectedId(card._id ?? null);
                  setError(null);
                }}
                className={[
                  "rounded-md border px-5 py-2.5 text-sm font-semibold transition",
                  card._id === selectedId
                    ? "border-cf-espresso bg-cf-espresso text-white"
                    : "border-cf-smoke bg-white text-cf-charcoal hover:border-cf-espresso",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected card preview */}
      <div className="flex items-start gap-6 rounded-lg border border-cf-smoke bg-cf-sand/40 p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-cf-espresso text-white">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={selected.name ?? "Gift card"}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <Gift className="h-8 w-8" />
          )}
        </div>
        <div>
          <p className="font-heading text-lg font-semibold text-cf-espresso">
            {selected.name ?? "Carolina Futons Gift Card"}
          </p>
          <p className="mt-1 text-cf-charcoal/70 text-sm">
            {selected.description
              ? selected.description.replace(/<[^>]+>/g, "").slice(0, 120)
              : "Redeemable on any purchase at carolinafutons.com or in-store."}
          </p>
          <p className="mt-2 text-xl font-bold text-cf-espresso">
            {formattedPrice}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Add to cart */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={pending || !selected._id}
        className="w-full rounded-md bg-cf-cta px-6 py-3 font-semibold text-white transition hover:bg-cf-cta/90 disabled:opacity-60 sm:w-auto sm:min-w-48"
      >
        {pending ? "Adding…" : `Add ${formattedPrice} gift card to cart`}
      </button>

      <p className="text-xs text-cf-charcoal/70">
        Gift cards are delivered digitally and can be applied at checkout.
        Non-refundable. No cash value.
      </p>
    </div>
  );
}
