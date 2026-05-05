"use client";

import { useState, useTransition } from "react";

import { addItemAction } from "@/app/actions/cart";
import {
  calcBundlePrice,
  formatUSD,
  type BundlePriceSummary,
} from "@/lib/bundle/pricing";
import type { WixProduct } from "@/lib/wix/products";

function productPrice(p: WixProduct): number {
  return p.priceData?.discountedPrice ?? p.priceData?.price ?? 0;
}

function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: WixProduct;
  selected: boolean;
  onSelect: () => void;
}) {
  const price = productPrice(product);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "w-full rounded-lg border-2 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
        selected
          ? "border-cf-cta bg-cf-cta/5"
          : "border-cf-divider bg-white hover:border-cf-cta/50 hover:bg-cf-cream/30",
      ].join(" ")}
    >
      <span className="block font-medium text-cf-ink">{product.name}</span>
      {price > 0 && (
        <span className="mt-1 block text-sm text-cf-charcoal/70">
          {formatUSD(price)}
        </span>
      )}
    </button>
  );
}

function PriceSummary({ summary }: { summary: BundlePriceSummary }) {
  return (
    <div
      data-slot="bundle-price-summary"
      className="rounded-lg border border-cf-divider bg-cf-cream/50 p-5 space-y-2 text-sm"
    >
      <div className="flex justify-between text-cf-charcoal/70">
        <span>Frame</span>
        <span>{formatUSD(summary.framePrice)}</span>
      </div>
      <div className="flex justify-between text-cf-charcoal/70">
        <span>Mattress</span>
        <span>{formatUSD(summary.mattressPrice)}</span>
      </div>
      {summary.accessoriesTotal > 0 && (
        <div className="flex justify-between text-cf-charcoal/70">
          <span>Accessories</span>
          <span>{formatUSD(summary.accessoriesTotal)}</span>
        </div>
      )}
      {summary.discountPct > 0 && (
        <div className="flex justify-between text-emerald-700 font-medium">
          <span>Bundle discount ({summary.discountPct}%)</span>
          <span>−{formatUSD(summary.discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between border-t border-cf-divider pt-2 font-semibold text-cf-ink">
        <span>Total</span>
        <span>{formatUSD(summary.total)}</span>
      </div>
    </div>
  );
}

type Props = {
  frames: WixProduct[];
  mattresses: WixProduct[];
};

export function BundleConfigurator({ frames, mattresses }: Props) {
  const [selectedFrame, setSelectedFrame] = useState<WixProduct | null>(null);
  const [selectedMattress, setSelectedMattress] = useState<WixProduct | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isPending, startTransition] = useTransition();

  const summary: BundlePriceSummary | null =
    selectedFrame && selectedMattress
      ? calcBundlePrice(
          productPrice(selectedFrame),
          productPrice(selectedMattress),
          0,
        )
      : null;

  function handleAddToCart() {
    if (!selectedFrame?._id || !selectedMattress?._id) return;
    setAddError(null);

    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        addItemAction({ productId: selectedFrame._id!, quantity: 1 }),
        addItemAction({ productId: selectedMattress._id!, quantity: 1 }),
      ]);

      if (!r1.ok || !r2.ok) {
        setAddError("Couldn't add to cart — please try again.");
        return;
      }
      setAddedToCart(true);
    });
  }

  const canAdd = Boolean(selectedFrame && selectedMattress);

  return (
    <div data-slot="bundle-configurator" className="space-y-10">
      {/* Step 1 — Frame */}
      <section>
        <h2 className="mb-4 font-heading text-xl font-semibold text-cf-navy">
          1. Choose a futon frame
        </h2>
        {frames.length === 0 ? (
          <p className="text-sm text-cf-charcoal/60">
            Frame catalog unavailable — please try again shortly.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {frames.map((p) => (
              <li key={p._id}>
                <ProductCard
                  product={p}
                  selected={selectedFrame?._id === p._id}
                  onSelect={() => setSelectedFrame(p)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Step 2 — Mattress */}
      <section>
        <h2 className="mb-4 font-heading text-xl font-semibold text-cf-navy">
          2. Choose a mattress
        </h2>
        {mattresses.length === 0 ? (
          <p className="text-sm text-cf-charcoal/60">
            Mattress catalog unavailable — please try again shortly.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mattresses.map((p) => (
              <li key={p._id}>
                <ProductCard
                  product={p}
                  selected={selectedMattress?._id === p._id}
                  onSelect={() => setSelectedMattress(p)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Price summary + CTA */}
      {summary && (
        <section className="space-y-4">
          <PriceSummary summary={summary} />

          {addedToCart ? (
            <p
              data-testid="bundle-added"
              className="text-sm font-medium text-emerald-700"
            >
              Added to cart! View in your{" "}
              <a href="/cart" className="underline underline-offset-2">
                cart
              </a>
              .
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAdd || isPending}
                className="inline-flex items-center rounded-md bg-cf-cta px-7 py-3 font-medium text-white transition-colors hover:bg-cf-cta-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
              >
                {isPending ? "Adding…" : "Add bundle to cart"}
              </button>
              {addError && (
                <p role="alert" className="text-sm text-red-600">
                  {addError}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
