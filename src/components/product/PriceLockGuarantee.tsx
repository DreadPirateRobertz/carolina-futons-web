"use client";

// Price-Lock Guarantee trust widget on the PDP (cfw-5jt, hookup CF-tjf0).
//
// Records a per-product first-view timestamp in localStorage on mount. On
// subsequent views within the 14-day window the copy switches to the
// remaining-days countdown, which doubles as a soft commitment device:
// customers who saw the price two days ago are reassured we'll honor it.
//
// SSR safety: useSyncExternalStore returns a stable empty server snapshot
// (full lock window) so SSR + first client render emit the same trust copy
// before hydration; the countdown only swaps in once the read snapshot
// reflects a stored timestamp. Per react-hooks/set-state-in-effect, this is
// the endorsed pattern for external state (localStorage) — we cannot use
// useState + setState-in-effect here.
//
// Storage corruption (non-numeric value, future timestamps from clock skew,
// quota errors) all silently fall back to the fresh-view state — a stale or
// invalid lock should never be surfaced as a confident countdown.

import { useEffect, useSyncExternalStore } from "react";

export const PRICE_LOCK_DAYS = 14;
export const PRICE_LOCK_STORAGE_PREFIX = "cf:pricelock:v1:";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function priceLockStorageKey(productSlug: string): string {
  return `${PRICE_LOCK_STORAGE_PREFIX}${productSlug}`;
}

// Days remaining in the 14-day window, given a first-view timestamp.
// Returns PRICE_LOCK_DAYS for a fresh view and 0 once the window has lapsed.
export function daysRemaining(firstViewMs: number, nowMs: number): number {
  if (!Number.isFinite(firstViewMs) || firstViewMs > nowMs) {
    return PRICE_LOCK_DAYS;
  }
  const elapsedDays = Math.floor((nowMs - firstViewMs) / MS_PER_DAY);
  const remaining = PRICE_LOCK_DAYS - elapsedDays;
  if (remaining <= 0) return 0;
  if (remaining > PRICE_LOCK_DAYS) return PRICE_LOCK_DAYS;
  return remaining;
}

// Module-scoped subscriber set so a storage write inside one widget instance
// invalidates the snapshot cache for any other listener (e.g. a future
// header badge that mirrors the same key).
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notify(): void {
  for (const cb of listeners) cb();
}

function readStoredFirstView(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export type PriceLockGuaranteeProps = {
  productSlug: string;
  /** Inject a clock for tests. Defaults to Date.now. */
  now?: () => number;
};

export function PriceLockGuarantee({
  productSlug,
  now = Date.now,
}: PriceLockGuaranteeProps) {
  const key = priceLockStorageKey(productSlug);

  // Read-only external store. Returns a fresh number (firstView ms) or null
  // when nothing is stored / pre-hydration. The mount effect below is the
  // sole writer, so we don't recompute snapshots on every render.
  const firstView = useSyncExternalStore(
    subscribe,
    () => readStoredFirstView(key),
    () => null,
  );

  // Side-effect only — never calls setState. Writing to storage + notify()
  // invalidates the snapshot above, so the countdown swaps in on the next
  // commit without us issuing a setState from inside an effect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (readStoredFirstView(key) != null) return;
    try {
      window.localStorage.setItem(key, String(now()));
      notify();
    } catch {
      // localStorage unavailable (private mode quota, disabled storage) —
      // the widget still renders the fresh-view trust copy.
    }
  }, [key, now]);

  const nowMs = now();
  const remaining = firstView == null ? PRICE_LOCK_DAYS : daysRemaining(firstView, nowMs);
  // After the lock expires (remaining === 0) we keep the widget visible but
  // drop the misleading countdown — the trust message ("we honor today's
  // price") still describes our policy. The countdown also stays hidden on
  // the very first view (firstView == null OR remaining === PRICE_LOCK_DAYS).
  const showCountdown = firstView != null && remaining > 0 && remaining < PRICE_LOCK_DAYS;
  const days = remaining > 0 ? remaining : PRICE_LOCK_DAYS;

  return (
    <div
      data-slot="price-lock-guarantee"
      data-testid="price-lock-guarantee"
      className="flex items-start gap-2 rounded-md border border-cf-cta/20 bg-cf-cta/5 px-3 py-2 text-sm text-cf-espresso"
    >
      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-cf-cta" />
      <p className="leading-snug">
        {showCountdown ? (
          <>
            <span className="font-medium" data-testid="price-lock-countdown">
              Locked for {days} {days === 1 ? "day" : "days"}
            </span>{" "}
            — we&rsquo;ll honor today&rsquo;s price even if it goes up.
          </>
        ) : (
          <>
            <span className="font-medium">
              Price locked for {PRICE_LOCK_DAYS} days after view
            </span>{" "}
            — we&rsquo;ll honor today&rsquo;s price even if it goes up.
          </>
        )}
      </p>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}
