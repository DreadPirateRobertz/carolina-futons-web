"use client";

// cfw-9vs: Top-level /wishlist client view. Owns:
//   - optimistic remove (mirrors the dashboard list pattern from cf-rs9k)
//   - per-row qty selector (1–9) used as the add-to-cart quantity
//   - per-row "Add to cart" that hands off to <CartProvider>.addLine + the
//     addItemAction Server Action (same path as <AddToCartButton>)
//   - share button that copies a public /wishlist-share/<token> URL
//
// Why the qty selector lives only on the row (not stored server-side):
// Wix's wishlistService has no quantity column, and adding one is out of
// scope for cfw-9vs. The selector is a transient input — its only job is
// to tell add-to-cart "how many of this item should I push to the cart?".
// Refreshing the page resets it to 1, which matches the "wishlist is a
// reminder, not an order" mental model.

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";

import { addItemAction } from "@/app/actions/cart";
import {
  generateShareToken,
  removeFromWishlist,
} from "@/app/actions/wishlist";
import { useCart } from "@/components/cart/CartProvider";
import { EmptyWishlistIllustration } from "@/components/illustrations/EmptyWishlistIllustration";
import { makeLineId, type CartLineItem } from "@/lib/cart/cart-state";
import type { WishlistItem } from "@/lib/wishlist/wishlist-types";

const MAX_QTY = 9;

export type WishlistViewProps = {
  initialItems: readonly WishlistItem[];
};

type ShareState = "idle" | "pending" | "copied" | "error";

export function WishlistView({ initialItems }: WishlistViewProps) {
  const [items, setItems] = useState<WishlistItem[]>([...initialItems]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRemove = useCallback(
    (productId: string) => {
      setError(null);
      const previous = items;
      setItems((curr) => curr.filter((i) => i.productId !== productId));
      startTransition(async () => {
        try {
          const result = (await removeFromWishlist(productId)) as
            | { success: boolean; error?: string }
            | undefined;
          if (!result?.success) {
            setItems(previous);
            setError(result?.error ?? "Could not remove. Please try again.");
          }
        } catch {
          setItems(previous);
          setError("Could not remove. Please try again.");
        }
      });
    },
    [items],
  );

  if (items.length === 0) {
    return (
      <main
        className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24"
        data-testid="wishlist-page"
        data-state="empty"
      >
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-espresso">
          Your wishlist
        </h1>
        <EmptyWishlistIllustration className="mt-6 w-full max-w-[260px]" />
        <p className="mt-6 text-cf-charcoal/70">
          Your wishlist is empty. Save a piece you love from any product page
          and it&rsquo;ll show up here.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
        >
          Browse the shop
        </Link>
      </main>
    );
  }

  return (
    <main
      className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8"
      data-testid="wishlist-page"
      data-state="populated"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-espresso">
            Your wishlist
            <span className="ml-3 text-base font-normal text-cf-espresso/60">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </h1>
          <p className="mt-1 text-sm text-cf-charcoal/70">
            Adjust the quantity, then add a piece to your cart when you&rsquo;re
            ready.
          </p>
        </div>
        <ShareButton />
      </header>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <ul aria-label="Wishlist" className="mt-8 space-y-4">
        {items.map((item) => (
          <li key={item.id}>
            <WishlistRow
              item={item}
              removePending={pending}
              onRemove={handleRemove}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}

function WishlistRow({
  item,
  removePending,
  onRemove,
}: {
  item: WishlistItem;
  removePending: boolean;
  onRemove: (productId: string) => void;
}) {
  const productHref = item.productSlug
    ? `/products/${item.productSlug}`
    : "/shop";
  const [qty, setQty] = useState(1);
  const [rowError, setRowError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { addLine, removeLine, openCart, beginCartWrite, endCartWrite } =
    useCart();

  const canAddToCart = item.inStock && !!item.productId;

  async function handleAddToCart() {
    if (!canAddToCart || adding) return;
    setRowError(null);
    const unitPriceCents = priceToCents(item.price);
    const line: CartLineItem = {
      id: makeLineId(item.productId),
      productId: item.productId,
      productName: item.name || "Item",
      imageUrl: item.imageUrl || undefined,
      productUrl: item.productSlug ? `/products/${item.productSlug}` : undefined,
      quantity: qty,
      unitPriceCents,
      formattedUnitPrice: formatPrice(item.price),
    };
    addLine(line);
    openCart();
    setAdding(true);
    beginCartWrite();
    try {
      const result = await addItemAction({
        productId: item.productId,
        quantity: qty,
      });
      if (!result.ok) {
        removeLine(line.id);
        setRowError(result.error ?? "Could not add to cart");
      }
    } catch {
      removeLine(line.id);
      setRowError("Could not add to cart");
    } finally {
      setAdding(false);
      endCartWrite();
    }
  }

  return (
    <article
      data-slot="wishlist-row"
      data-product-id={item.productId}
      className="flex flex-col gap-4 rounded-lg border border-cf-divider bg-white p-4 sm:flex-row sm:items-center dark:bg-cf-cream"
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="h-20 w-20 shrink-0 rounded object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-20 w-20 shrink-0 rounded bg-cf-cream"
        />
      )}

      <div className="min-w-0 flex-1">
        <Link
          href={productHref}
          className="block truncate font-medium text-cf-ink hover:underline"
        >
          {item.name || "Product"}
        </Link>
        <p className="mt-0.5 text-sm text-cf-muted">
          {formatPrice(item.price)}
          {!item.inStock ? (
            <span className="ml-2 text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Out of stock
            </span>
          ) : null}
        </p>
        {rowError ? (
          <p
            role="alert"
            className="mt-1 text-xs text-red-700"
            data-testid="wishlist-row-error"
          >
            {rowError}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor={`qty-${item.id}`}
          className="text-xs uppercase tracking-wide text-cf-muted"
        >
          Qty
        </label>
        <select
          id={`qty-${item.id}`}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          disabled={!canAddToCart || adding}
          aria-label={`Quantity for ${item.name || "item"}`}
          className="h-9 rounded border border-cf-divider bg-white px-2 text-sm text-cf-ink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cf-cream"
        >
          {Array.from({ length: MAX_QTY }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAddToCart || adding}
          aria-label={`Add ${item.name || "item"} to cart`}
          className="inline-flex h-9 items-center justify-center rounded-md bg-cf-cta px-4 text-sm font-medium text-white transition hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {adding ? "Adding…" : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          disabled={removePending}
          aria-label={`Remove ${item.name || "item"} from wishlist`}
          className="text-sm text-cf-muted underline-offset-2 hover:text-cf-ink hover:underline disabled:opacity-60"
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function ShareButton() {
  const [state, setState] = useState<ShareState>("idle");
  const [, startTransition] = useTransition();

  function handleClick() {
    if (state === "pending" || state === "copied") return;
    setState("pending");
    startTransition(async () => {
      const resetLater = () => setTimeout(() => setState("idle"), 3000);
      try {
        const result = await generateShareToken();
        if (!result.success) {
          setState("error");
          resetLater();
          return;
        }
        const url = `${window.location.origin}/wishlist-share/${result.token}`;
        await navigator.clipboard.writeText(url);
        setState("copied");
        resetLater();
      } catch {
        setState("error");
        resetLater();
      }
    });
  }

  const label =
    state === "pending"
      ? "Generating…"
      : state === "copied"
        ? "Link copied!"
        : state === "error"
          ? "Try again"
          : "Share wishlist";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "pending"}
      aria-label="Copy shareable wishlist link to clipboard"
      data-testid="wishlist-share-button"
      data-state={state}
      className="inline-flex h-10 items-center rounded border border-cf-espresso/30 px-3 text-sm text-cf-espresso transition hover:bg-cf-espresso/5 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function priceToCents(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}
