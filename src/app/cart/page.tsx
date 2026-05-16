"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/cart/cart-state";
import { trackBeginCheckout } from "@/lib/analytics/ga4-events";
import { cn } from "@/lib/utils";
import { EmptyCartIllustration } from "@/components/illustrations/EmptyCartIllustration";
import { PackingBearIllustration } from "@/components/illustrations/PackingBearIllustration";
import { logError } from "@/lib/log";

export default function CartPage() {
  const { state, itemCount, subtotalCents, isCartPending, removeLine, setQuantity } = useCart();

  if (state.lines.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-espresso">
          Your cart
        </h1>
        <EmptyCartIllustration className="mt-6 w-full max-w-[260px]" />
        <p className="mt-6 text-cf-charcoal/70">Your cart is empty.</p>
        <Link
          href="/shop"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
        >
          Continue shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-espresso">
          Your cart
          <span className="ml-3 text-base font-normal text-cf-espresso/60">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </h1>
        {/* Companion illustration — keeps mascot world cohesion on the
            populated cart layout without crowding the line items. */}
        <PackingBearIllustration className="hidden h-auto w-[180px] shrink-0 rounded-lg shadow-sm md:block lg:w-[200px]" />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr,320px]">
        {/* Line items */}
        <ul data-slot="cart-lines" className="divide-y divide-cf-divider">
          {state.lines.map((line) => (
            <li
              key={line.id}
              data-testid="cart-line"
              className="flex gap-4 py-6"
            >
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-cf-sand">
                {line.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={line.imageUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <ShoppingBag
                    className="size-8 text-cf-espresso/30"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {line.productUrl ? (
                      <Link
                        href={line.productUrl}
                        className="font-medium text-cf-espresso hover:underline"
                      >
                        {line.productName}
                      </Link>
                    ) : (
                      <p className="font-medium text-cf-espresso">
                        {line.productName}
                      </p>
                    )}
                    {line.variantLabel ? (
                      <p className="mt-0.5 text-sm text-cf-charcoal/60">
                        {line.variantLabel}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-semibold text-cf-espresso">
                    {formatCents(line.unitPriceCents * line.quantity)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Quantity stepper */}
                  <div
                    role="group"
                    aria-label={`Quantity for ${line.productName}`}
                    className="flex h-9 items-center rounded-md border border-cf-divider"
                  >
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={line.quantity <= 1}
                      onClick={() =>
                        setQuantity(line.id, Math.max(1, line.quantity - 1))
                      }
                      className="flex h-full w-9 items-center justify-center text-cf-espresso transition-colors hover:bg-cf-sand disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus className="size-3.5" aria-hidden="true" />
                    </button>
                    <span
                      aria-live="polite"
                      className="w-8 text-center text-sm font-medium tabular-nums text-cf-espresso"
                    >
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQuantity(line.id, line.quantity + 1)}
                      className="flex h-full w-9 items-center justify-center text-cf-espresso transition-colors hover:bg-cf-sand"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  {/* icon-only interactive — WCAG 1.4.11 non-text contrast, 3:1 threshold; passes at ~4:1 */}
                  <button
                    type="button"
                    aria-label={`Remove ${line.productName}`}
                    onClick={() => removeLine(line.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-cf-charcoal/70 transition-colors hover:bg-cf-sand hover:text-cf-error"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Order summary */}
        <aside
          aria-labelledby="order-summary-heading"
          className="h-fit rounded-xl border border-cf-divider bg-cf-cream p-6 shadow-sm"
        >
          <h2
            id="order-summary-heading"
            className="font-heading text-lg font-semibold text-cf-espresso"
          >
            Order summary
          </h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-cf-charcoal/70">Subtotal</dt>
              <dd
                className="font-medium text-cf-espresso tabular-nums"
                data-testid="cart-subtotal"
              >
                {formatCents(subtotalCents)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-cf-divider pt-3 text-base">
              <dt className="font-semibold text-cf-espresso">Estimated total</dt>
              <dd className="font-bold text-cf-espresso tabular-nums">
                {formatCents(subtotalCents)}
              </dd>
            </div>
          </dl>

          <p className="mt-2 text-xs text-muted-foreground">
            Shipping and taxes calculated at checkout.
          </p>

          {/* Plain <a> — not <Link> — so the browser makes a full
              navigation request that properly follows the 307 to the
              Wix-hosted payment page. Next.js <Link> does SPA-style
              fetch and won't follow an external redirect.
              Disabled while isCartPending to prevent navigating before
              addItemAction has committed the cart to Wix. */}
          <a
            href="/checkout"
            aria-disabled={isCartPending}
            data-testid="proceed-to-checkout"
            onClick={(e) => {
              if (isCartPending) {
                e.preventDefault();
                return;
              }
              try {
                trackBeginCheckout(
                  state.lines.map((line) => ({
                    item_id: line.productId,
                    item_name: line.productName,
                    item_variant: line.variantLabel,
                    price: line.unitPriceCents / 100,
                    quantity: line.quantity,
                  })),
                  subtotalCents / 100,
                );
              } catch (e) {
                void logError("cart-page", "trackBeginCheckout", e);
              }
            }}
            className={cn(
              "mt-5 flex h-12 w-full items-center justify-center rounded-md bg-cf-cta text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
              isCartPending && "cursor-not-allowed opacity-60",
            )}
          >
            {isCartPending ? "Saving…" : "Proceed to checkout"}
          </a>

          <Link
            href="/shop"
            className="mt-3 flex h-10 w-full items-center justify-center rounded-md border border-cf-divider text-sm font-medium text-cf-espresso transition-colors hover:bg-cf-sand"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}
