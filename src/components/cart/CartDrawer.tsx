"use client";

import type { MouseEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";

import { CartCouponEntry } from "@/components/cart/CartCouponEntry";
import { useCart } from "@/components/cart/CartProvider";
import { CartIllustration } from "@/components/illustrations/CartIllustration";
import { EmptyCartIllustration } from "@/components/illustrations/EmptyCartIllustration";
import { formatCents } from "@/lib/cart/cart-state";
import { trackBeginCheckout } from "@/lib/analytics/ga4-events";
import { cn } from "@/lib/utils";

// Right-hand slide-in cart drawer. `Dialog.Root` is explicitly `modal` so
// focus is trapped, the body is scroll-locked, and outside pointer events are
// blocked while open. `Dialog.Close` lives inside the popup so touch screen
// readers can escape per base-ui's accessibility guidance.

export function CartDrawer() {
  const {
    state,
    itemCount,
    subtotalCents,
    isOpen,
    isCartPending,
    setOpen,
    removeLine,
    setQuantity,
  } = useCart();

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen} modal={true}>
      <Dialog.Portal>
        <Dialog.Backdrop
          data-testid="cart-backdrop"
          className={cn(
            "fixed inset-0 z-50 bg-cf-espresso/40 backdrop-blur-sm",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "transition-opacity duration-200",
          )}
        />
        <Dialog.Popup
          data-testid="cart-drawer"
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-cf-cream shadow-xl",
            "data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
            "transition-transform duration-200 ease-out",
            "focus:outline-none",
          )}
        >
          <header className="flex items-center justify-between border-b border-cf-divider px-5 py-4">
            <Dialog.Title className="font-heading text-xl font-semibold text-cf-espresso">
              Your cart
              {itemCount > 0 ? (
                <span className="ml-2 text-sm font-normal text-cf-espresso/60">
                  ({itemCount} {itemCount === 1 ? "item" : "items"})
                </span>
              ) : null}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close cart"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-espresso transition-colors hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </header>

          <Dialog.Description className="sr-only">
            Review items in your cart, adjust quantities, remove items, or
            continue to checkout.
          </Dialog.Description>

          {state.lines.length === 0 ? (
            <EmptyCart onClose={() => setOpen(false)} />
          ) : (
            <>
              <CartIllustration className="w-full" />
              <ul
                data-slot="cart-lines"
                className="min-h-0 flex-1 divide-y divide-cf-divider overflow-y-auto px-5"
              >
                {state.lines.map((line) => (
                  <li
                    key={line.id}
                    data-testid="cart-line"
                    className="flex gap-4 py-4"
                  >
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-cf-sand">
                      {line.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={line.imageUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ShoppingBag
                          className="size-6 text-cf-espresso/40"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {line.productUrl ? (
                            <Link
                              href={line.productUrl}
                              onClick={(e) => {
                                if (isModifiedClick(e)) return;
                                setOpen(false);
                              }}
                              className="block truncate font-medium text-cf-espresso hover:text-cf-cta focus-visible:outline-none focus-visible:text-cf-cta"
                            >
                              {line.productName}
                            </Link>
                          ) : (
                            <span className="block truncate font-medium text-cf-espresso">
                              {line.productName}
                            </span>
                          )}
                          {line.variantLabel ? (
                            <p className="truncate text-sm text-cf-espresso/60">
                              {line.variantLabel}
                            </p>
                          ) : null}
                        </div>
                        <p
                          className="shrink-0 text-sm font-medium text-cf-espresso"
                          data-testid="cart-line-price"
                        >
                          {formatCents(line.unitPriceCents * line.quantity)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <QuantityStepper
                          lineId={line.id}
                          productName={line.productName}
                          quantity={line.quantity}
                          onChange={(q) => setQuantity(line.id, q)}
                        />
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          aria-label={`Remove ${line.productName} from cart`}
                          className="text-sm text-cf-espresso/70 underline-offset-4 hover:text-cf-error hover:underline focus-visible:outline-none focus-visible:text-cf-error focus-visible:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <footer className="border-t border-cf-divider px-5 py-4">
                {/* cf-snil (cf-wsrr.F2): in-cart promo code entry. Renders
                    above the subtotal so users discover it BEFORE they
                    commit to the checkout redirect. */}
                <CartCouponEntry />
                <div className="mt-3 flex items-center justify-between text-base">
                  <span className="font-medium text-cf-espresso">Subtotal</span>
                  <span
                    className="font-semibold text-cf-espresso"
                    data-testid="cart-subtotal"
                  >
                    {formatCents(subtotalCents)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-cf-espresso/60">
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
                  onClick={(e) => {
                    if (isCartPending || isModifiedClick(e)) {
                      e.preventDefault();
                      return;
                    }
                    // cf-rfb6: GA4 begin_checkout fires at the moment of
                    // checkout intent — clicking through to /checkout.
                    // No-ops if gtag is unset; wrapped so GA4 errors
                    // never block navigation.
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
                      console.error("[cart-drawer] trackBeginCheckout failed", e);
                    }
                    setOpen(false);
                  }}
                  data-testid="cart-checkout-cta"
                  className={cn(
                    "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-cf-cta px-4 text-sm font-semibold text-white transition-colors",
                    "hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
                    isCartPending && "cursor-not-allowed opacity-60",
                  )}
                >
                  {isCartPending ? "Saving…" : "Go to checkout"}
                </a>
              </footer>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Let the browser keep its default behavior for ⌘/ctrl/shift/middle clicks
// (new tab, new window, download). We only want to auto-close the drawer on a
// plain click that will actually navigate this tab.
function isModifiedClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div
      data-testid="cart-empty"
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
    >
      {/* cf-93rb Phase E: brand-coherent illustration replacing the
          generic ShoppingBag icon — Blue Ridge band + folded futon
          frame with a cf-cta seam. Decorative, the heading carries
          the meaning. */}
      <EmptyCartIllustration className="max-w-[180px]" />
      <div className="space-y-1">
        <p className="font-heading text-lg font-semibold text-cf-espresso">
          Your cart is empty
        </p>
        <p className="text-sm text-cf-espresso/60">
          Add a futon, mattress, or frame to get started.
        </p>
      </div>
      <Link
        href="/shop"
        onClick={(e) => {
          if (isModifiedClick(e)) return;
          onClose();
        }}
        className={cn(
          "mt-2 inline-flex min-h-11 items-center justify-center rounded-md bg-cf-cta px-5 text-sm font-semibold text-white transition-colors",
          "hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
        )}
      >
        Start shopping
      </Link>
    </div>
  );
}

function QuantityStepper({
  lineId,
  productName,
  quantity,
  onChange,
}: {
  lineId: string;
  productName: string;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-md border border-cf-divider"
      data-testid="cart-qty-stepper"
      data-line-id={lineId}
    >
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        aria-label={`Decrease quantity of ${productName}`}
        className="inline-flex h-9 w-9 items-center justify-center text-cf-espresso transition-colors hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta disabled:cursor-not-allowed disabled:opacity-40"
        disabled={quantity <= 1}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span
        className="min-w-8 text-center text-sm font-medium tabular-nums text-cf-espresso"
        data-testid="cart-qty-value"
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label={`Increase quantity of ${productName}`}
        className="inline-flex h-9 w-9 items-center justify-center text-cf-espresso transition-colors hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
