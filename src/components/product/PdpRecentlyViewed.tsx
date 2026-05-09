"use client";

// Recently-viewed strip on the PDP (cf-3qt.7.N.1).
//
// Why useSyncExternalStore instead of useEffect + setState?
//   react-hooks/set-state-in-effect flags synchronous setState inside an
//   effect as a cascading-rerender hazard. localStorage is genuinely an
//   external data source, so the React-endorsed pattern here is
//   useSyncExternalStore: it returns a stable server snapshot (empty array)
//   that matches SSR, then switches to the live snapshot after hydration —
//   no useEffect re-render pass, no setState-in-effect lint violation.
//
// The useEffect below only performs the write-current-product side effect.
// It never calls setState; the notify() call invalidates the module-scoped
// snapshot cache so useSyncExternalStore can deliver the fresh buffer.
//
// Empty list → return null. No "Nothing viewed yet" placeholder rot.
// motion-safe:scroll-smooth gates the smooth-scroll behavior on
// prefers-reduced-motion — CSS honors the MQ, zero JS needed.

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";

import {
  RECENTLY_VIEWED_STORAGE_KEY,
  pushRecentlyViewed,
  readRecentlyViewed,
  writeRecentlyViewed,
  type RecentlyViewedItem,
} from "@/lib/product/recently-viewed";
import { wixImageUrl } from "@/lib/wix/wix-image";

export type PdpRecentlyViewedProps = {
  currentProductId: string;
  currentProductSlug: string;
  currentProductName: string;
  currentProductImageUrl?: string;
  currentProductPriceText?: string;
};

const HEADING_ID = "pdp-recently-viewed-heading";

// Shared empty reference. useSyncExternalStore requires getSnapshot to
// return the same object across calls when nothing has changed — returning
// a fresh [] each time would tear the subscription and infinite-loop.
const EMPTY_SNAPSHOT: ReadonlyArray<RecentlyViewedItem> = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedItems: ReadonlyArray<RecentlyViewedItem> = EMPTY_SNAPSHOT;

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notify(): void {
  cachedRaw = undefined;
  for (const cb of listeners) cb();
}

function getSnapshot(): ReadonlyArray<RecentlyViewedItem> {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
  } catch {
    return EMPTY_SNAPSHOT;
  }
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  cachedItems = readRecentlyViewed(window.localStorage);
  return cachedItems;
}

function getServerSnapshot(): ReadonlyArray<RecentlyViewedItem> {
  return EMPTY_SNAPSHOT;
}

export function PdpRecentlyViewed(props: PdpRecentlyViewedProps) {
  const {
    currentProductId,
    currentProductSlug,
    currentProductName,
    currentProductImageUrl,
    currentProductPriceText,
  } = props;

  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const storage = safeLocalStorage();
    if (!storage) return;
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
    notify();
  }, [
    currentProductId,
    currentProductSlug,
    currentProductName,
    currentProductImageUrl,
    currentProductPriceText,
  ]);

  const items = stored.filter((item) => item.id !== currentProductId);
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby={HEADING_ID}
      data-slot="pdp-recently-viewed"
      className="mt-16 border-t border-cf-divider pt-10"
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
            src={wixImageUrl(item.imageUrl, 240, 240)}
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
