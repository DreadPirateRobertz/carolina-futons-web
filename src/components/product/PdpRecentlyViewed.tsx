"use client";

// Recently-viewed strip on the PDP (cf-3qt.7.N.1).
//
// Behavior:
//   * On mount: push the current product into the ring buffer, then read the
//     buffer back and render everything EXCEPT the current product. Pushing
//     first means a re-visit promotes the product to most-recent so it
//     surfaces when the user navigates to a sibling PDP.
//   * SSR renders null — useEffect only fires on the client, so the initial
//     HTML never contains stale localStorage data and there's no hydration
//     mismatch. First paint of the strip therefore happens after hydration.
//   * Empty list → return null (no "Nothing viewed yet" placeholder rot).
//   * Horizontal scroll row, cf-sand divider, cf-card tiles. `motion-safe:`
//     gates scroll-smooth so prefers-reduced-motion users get an instant snap.

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  pushRecentlyViewed,
  readRecentlyViewed,
  writeRecentlyViewed,
  type RecentlyViewedItem,
} from "@/lib/product/recently-viewed";

export type PdpRecentlyViewedProps = {
  currentProductId: string;
  currentProductSlug: string;
  currentProductName: string;
  currentProductImageUrl?: string;
  currentProductPriceText?: string;
};

const HEADING_ID = "pdp-recently-viewed-heading";

export function PdpRecentlyViewed(props: PdpRecentlyViewedProps) {
  const {
    currentProductId,
    currentProductSlug,
    currentProductName,
    currentProductImageUrl,
    currentProductPriceText,
  } = props;

  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storage = safeLocalStorage();
    const existing = readRecentlyViewed(storage);
    const self: RecentlyViewedItem = {
      id: currentProductId,
      slug: currentProductSlug,
      name: currentProductName,
      imageUrl: currentProductImageUrl,
      priceText: currentProductPriceText,
      viewedAt: Date.now(),
    };
    const updated = pushRecentlyViewed(existing, self);
    writeRecentlyViewed(storage, updated);
    setItems(updated.filter((item) => item.id !== currentProductId));
  }, [
    currentProductId,
    currentProductSlug,
    currentProductName,
    currentProductImageUrl,
    currentProductPriceText,
  ]);

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby={HEADING_ID}
      data-slot="pdp-recently-viewed"
      className="mt-12 border-t border-cf-divider py-6"
    >
      <h2
        id={HEADING_ID}
        className="font-heading text-lg font-semibold text-cf-espresso"
      >
        You recently viewed
      </h2>
      <ul
        className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 motion-safe:scroll-smooth"
        data-slot="pdp-recently-viewed-row"
      >
        {items.map((item) => (
          <RecentTile key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function RecentTile({ item }: { item: RecentlyViewedItem }) {
  return (
    <li className="w-40 shrink-0 snap-start sm:w-44">
      <Link
        href={`/products/${item.slug}`}
        className="group block rounded-lg border border-transparent transition hover:border-cf-sand"
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="aspect-square w-full rounded-md object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="aspect-square w-full rounded-md bg-cf-sand/40"
          />
        )}
        <div className="mt-2 px-1">
          <p className="truncate text-sm font-medium text-cf-espresso">
            {item.name}
          </p>
          {item.priceText ? (
            <p className="text-sm text-cf-espresso/70">{item.priceText}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
