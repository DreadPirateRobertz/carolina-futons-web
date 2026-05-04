"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { removeFromWishlist } from "@/app/actions/wishlist";
import type { WishlistItem } from "@/lib/wishlist/wishlist-types";

export type WishlistListProps = {
  initialItems: readonly WishlistItem[];
};

// cf-rs9k: client list. Server fetches initial state via getWishlist; this
// component owns local optimistic-remove state so the row disappears as
// soon as the user clicks Remove rather than waiting for a router refresh.
// On Server Action failure we revert the optimistic removal + surface a
// row-level error. There is no "add" affordance here — the dashboard view
// is read+remove only; adding happens from the PDP (separate bead).
export function WishlistList({ initialItems }: WishlistListProps) {
  const [items, setItems] = useStateItems(initialItems);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useStateError();

  function handleRemove(productId: string) {
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
  }

  if (items.length === 0) {
    return (
      <div
        data-slot="wishlist-empty"
        className="rounded-lg border border-cf-divider bg-white p-8 text-center dark:bg-cf-cream"
      >
        <p className="text-sm text-cf-muted">
          Your wishlist is empty. Add a piece you love from any product
          page and it&rsquo;ll show up here.
        </p>
        <Link
          href="/shop"
          className="mt-4 inline-block text-sm font-medium text-cf-cta hover:underline"
        >
          Browse the shop &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div data-slot="wishlist-list" className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <ul aria-label="Wishlist" className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <WishlistRow
              item={item}
              pending={pending}
              onRemove={handleRemove}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function WishlistRow({
  item,
  pending,
  onRemove,
}: {
  item: WishlistItem;
  pending: boolean;
  onRemove: (productId: string) => void;
}) {
  const productHref = item.productSlug
    ? `/products/${item.productSlug}`
    : "/shop";
  return (
    <article
      data-slot="wishlist-row"
      data-product-id={item.productId}
      className="flex items-center gap-4 rounded-lg border border-cf-divider bg-white p-4 dark:bg-cf-cream"
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-16 w-16 shrink-0 rounded bg-cf-cream"
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
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.productId)}
        disabled={pending}
        aria-label={`Remove ${item.name || "item"} from wishlist`}
        className="text-sm text-cf-muted underline-offset-2 hover:text-cf-ink hover:underline disabled:opacity-60"
      >
        Remove
      </button>
    </article>
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

function useStateItems(initial: readonly WishlistItem[]) {
  return useState<WishlistItem[]>([...initial]);
}

function useStateError() {
  return useState<string | null>(null);
}
