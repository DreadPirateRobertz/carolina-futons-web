"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  getQuickViewProductData,
  type QuickViewProduct,
} from "@/app/actions/quick-view";
import { colorNameToHex } from "@/lib/product/color-options";

type Props = {
  open: boolean;
  slug: string;
  productName: string;
  onClose: () => void;
  /**
   * Optional fetcher override — primarily for tests. Production code calls
   * the `getQuickViewProductData` server action by default.
   */
  fetchProduct?: (slug: string) => Promise<QuickViewProduct | null>;
};

// Lightweight quick-view: image, name, price, short description, color
// preview (when applicable), CTA into the full PDP. Deliberately NOT a full
// AddToCart surface — variant pickers are non-trivial and live on the PDP.
// Keeps the modal small enough to mount lazily without blocking card render.
export function QuickViewModal({
  open,
  slug,
  productName,
  onClose,
  fetchProduct = getQuickViewProductData,
}: Props) {
  const [data, setData] = useState<QuickViewProduct | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Lazy-fetch when first opened. Subsequent re-opens reuse cached data.
  // `loadState` is intentionally excluded from deps — including it would
  // re-run cleanup right after `setLoadState("loading")`, marking the
  // in-flight fetch as cancelled before its `.then` resolves.
  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag must be set before async fetchProduct fires
    setLoadState("loading");
    fetchProduct(slug)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setLoadState("error");
          return;
        }
        setData(result);
        setLoadState("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, slug, data, fetchProduct]);

  // Focus management + Escape-to-close.
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-slot="quick-view-overlay"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view: ${productName}`}
        data-slot="quick-view-dialog"
        className="relative w-full max-w-lg rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl dark:bg-cf-cream"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 rounded-md p-2 text-cf-muted hover:text-cf-ink dark:text-cf-cream/60 dark:hover:text-cf-cream"
        >
          <span aria-hidden="true">×</span>
        </button>

        {loadState === "error" ? (
          <p className="py-12 text-center text-sm text-red-600">
            Couldn&rsquo;t load this product. Please try again.
          </p>
        ) : data ? (
          <div className="space-y-4">
            {data.imageUrl ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-700">
                <Image
                  src={data.imageUrl}
                  alt={data.name}
                  fill
                  sizes="(min-width: 640px) 32rem, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div>
              <h2 className="text-lg font-semibold text-cf-ink dark:text-cf-cream">{data.name}</h2>
              <p className="mt-1 text-base text-cf-muted">{data.priceText}</p>
            </div>
            {data.colorChoices.length > 0 ? (
              <div data-slot="quick-view-colors">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-cf-muted">
                  {data.colorChoices.length === 1
                    ? "Color"
                    : `${data.colorChoices.length} colors`}
                </p>
                <ul className="flex flex-wrap items-center gap-2">
                  {data.colorChoices.map((c) => (
                    <li
                      key={c.label}
                      className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                    >
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 rounded-full border border-zinc-400"
                        style={{ backgroundColor: c.hex ?? colorNameToHex(c.label) }}
                      />
                      <span>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.description ? (
              <p className="text-sm text-cf-ink/80 dark:text-cf-cream/80">{data.description}</p>
            ) : null}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Link
                href={`/products/${data.slug}`}
                className="text-sm text-cf-cta hover:underline"
                onClick={onClose}
              >
                View full details &rarr;
              </Link>
              {!data.inStock ? (
                <span className="text-xs text-red-600">Out of stock</span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-cf-muted">Loading…</p>
        )}
      </div>
    </div>
  );
}
