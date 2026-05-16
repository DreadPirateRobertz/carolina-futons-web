"use client";

// Home page "Recently Viewed" strip (cf-l6aj.8).
//
// Reads the same localStorage LRU written by PdpRecentlyViewed — no writes
// here. Complements ContinueShoppingStrip (which appears earlier on the page)
// by surfacing the same data as a lightweight reminder after the filter-first
// product browser. Capped at 4 items; renders nothing when LRU is empty.
//
// useSyncExternalStore pattern (not useEffect+setState): localStorage is an
// external store. The server snapshot is an empty array so SSR and the first
// hydration frame are identical — no flicker, no hydration mismatch.
// The storage event listener syncs across tabs.

import { useSyncExternalStore } from "react";
import Link from "next/link";

import {
  RECENTLY_VIEWED_STORAGE_KEY,
  readRecentlyViewed,
  type RecentlyViewedItem,
} from "@/lib/product/recently-viewed";

const MAX_DISPLAY = 4;
const HEADING_ID = "home-recently-viewed-heading";

const EMPTY: ReadonlyArray<RecentlyViewedItem> = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedItems: ReadonlyArray<RecentlyViewedItem> = EMPTY;

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (e.key === RECENTLY_VIEWED_STORAGE_KEY) cb();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => { listeners.delete(cb); };
}

function getSnapshot(): ReadonlyArray<RecentlyViewedItem> {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  cachedItems = readRecentlyViewed(window.localStorage).slice(0, MAX_DISPLAY);
  return cachedItems;
}

function getServerSnapshot(): ReadonlyArray<RecentlyViewedItem> {
  return EMPTY;
}

export function RecentlyViewedStrip() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby={HEADING_ID}
      data-slot="recently-viewed-strip"
      className="border-t border-cf-divider bg-white py-8"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          id={HEADING_ID}
          className="font-heading text-lg font-semibold text-cf-espresso"
        >
          Recently viewed
        </h2>
        <ul
          className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 motion-safe:scroll-smooth"
          data-slot="recently-viewed-row"
        >
          {items.map((item) => (
            <RecentTile key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function RecentTile({ item }: { item: RecentlyViewedItem }) {
  return (
    <li className="w-40 shrink-0 snap-start sm:w-44">
      <Link
        href={`/products/${item.slug}`}
        className="group block rounded-lg border border-transparent transition hover:border-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
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
