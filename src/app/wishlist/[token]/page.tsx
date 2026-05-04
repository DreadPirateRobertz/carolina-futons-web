// cf-u89z: Public read-only wishlist view — /wishlist/[token]
// No auth required. The token is an HMAC-signed memberId; invalid/tampered
// tokens render the not-found state rather than leaking any error detail.

import type { Metadata } from "next";
import Link from "next/link";
import { getSharedWishlist } from "@/app/actions/wishlist";
import type { WishlistItem } from "@/lib/wishlist/wishlist-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared Wishlist — Carolina Futons",
  description: "A curated selection from a Carolina Futons wishlist.",
  robots: { index: false },
};

export default async function SharedWishlistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSharedWishlist(token);

  if (!result.success || result.items.length === 0) {
    return (
      <main
        className="mx-auto max-w-2xl px-4 py-16 text-center"
        data-testid="shared-wishlist-not-found"
      >
        <h1 className="font-heading text-2xl font-semibold text-cf-ink">
          Wishlist not found
        </h1>
        <p className="mt-3 text-cf-muted">
          This link may have expired or been removed.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded bg-cf-espresso px-5 py-2 text-sm font-medium text-white hover:bg-cf-espresso/90"
        >
          Browse products
        </Link>
      </main>
    );
  }

  return (
    <main
      className="mx-auto max-w-4xl px-4 py-10"
      data-testid="shared-wishlist-view"
    >
      <header className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-cf-ink">
          Shared Wishlist
        </h1>
        <p className="mt-1 text-sm text-cf-muted">
          {result.total} {result.total === 1 ? "item" : "items"} saved
        </p>
      </header>

      <ul
        role="list"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
        data-testid="shared-wishlist-items"
      >
        {result.items.map((item) => (
          <SharedWishlistCard key={item.id} item={item} />
        ))}
      </ul>
    </main>
  );
}

function SharedWishlistCard({ item }: { item: WishlistItem }) {
  return (
    <li className="overflow-hidden rounded-lg border border-cf-sand bg-white dark:bg-cf-cream dark:border-cf-ink/30">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.name}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="aspect-square w-full bg-cf-sand/40" aria-hidden="true" />
      )}
      <div className="p-3">
        <p className="truncate text-sm font-medium text-cf-ink">{item.name}</p>
        <p className="mt-0.5 text-sm text-cf-muted">
          ${(item.price ?? 0).toFixed(2)}
        </p>
        {item.productSlug ? (
          <Link
            href={`/products/${item.productSlug}`}
            className="mt-2 inline-block text-xs text-cf-espresso underline-offset-2 hover:underline"
          >
            View product
          </Link>
        ) : null}
      </div>
    </li>
  );
}
