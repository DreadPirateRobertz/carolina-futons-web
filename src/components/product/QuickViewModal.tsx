"use client";

import { useEffect, useId, useRef, useState } from "react";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { VariantPicker } from "@/components/product/VariantPicker";
import { fetchQuickViewProduct } from "@/app/actions/quick-view";
import { formatPlpPrice } from "@/lib/product/plp-price";
import { getPlpCardImages } from "@/lib/product/plp-card-images";
import {
  findMatchingVariant,
  getSelectedImageUrl,
  getSelectedPrice,
  initialSelection,
  isSelectionComplete,
  isVariantInStock,
  type ChoiceSelection,
  type ProductOptionInput,
  type VariantInput,
} from "@/lib/product/variant-selection";
import type { WixProduct } from "@/lib/wix/products";

export type QuickViewModalProps = {
  productSlug: string;
  productName: string;
  triggerLabel?: string;
  triggerClassName?: string;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; product: WixProduct }
  | { kind: "error" };

function readOptions(product: WixProduct): ReadonlyArray<ProductOptionInput> {
  const opts = (product as { productOptions?: ReadonlyArray<ProductOptionInput> | null })
    .productOptions;
  return Array.isArray(opts) ? opts : [];
}

function readVariants(product: WixProduct): ReadonlyArray<VariantInput> {
  const v = (product as { variants?: ReadonlyArray<VariantInput> | null }).variants;
  return Array.isArray(v) ? v : [];
}

export function QuickViewModal({
  productSlug,
  productName,
  triggerLabel = "Quick view",
  triggerClassName,
}: QuickViewModalProps) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Open / close the native dialog in lockstep with `open` state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    } else {
      try {
        dialog.close();
      } catch {
        dialog.removeAttribute("open");
      }
    }
  }, [open]);

  // Mirror native ESC close into React state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  // Lazy fetch on first open. Re-fetch on retry from the error state. A
  // request nonce guards against stale resolutions when the user closes +
  // reopens before the previous fetch settles — without it the previous
  // payload would clobber the fresh state.
  const fetchIdRef = useRef(0);
  useEffect(() => {
    if (!open || load.kind !== "idle") return;
    const myId = ++fetchIdRef.current;
    setLoad({ kind: "loading" });
    fetchQuickViewProduct(productSlug).then((result) => {
      if (myId !== fetchIdRef.current) return;
      if (result.ok) {
        setLoad({ kind: "loaded", product: result.product });
      } else {
        setLoad({ kind: "error" });
      }
    });
  }, [open, load.kind, productSlug]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) setOpen(false);
  };

  const close = () => setOpen(false);
  const retry = () => setLoad({ kind: "idle" });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex items-center justify-center rounded border border-cf-sand bg-white/90 px-3 py-1.5 text-xs font-medium text-cf-espresso shadow-sm transition-colors hover:bg-cf-sand/30"
        }
        data-slot="quick-view-modal-trigger"
        aria-haspopup="dialog"
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={handleBackdrop}
        className="m-auto w-full max-w-2xl rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black/40 dark:bg-cf-cream open:animate-[fadeIn_0.15s_ease]"
        data-slot="quick-view-modal"
      >
        <div className="flex items-center justify-between border-b border-cf-sand/40 px-5 py-4">
          <h2
            id={titleId}
            className="font-heading text-base font-semibold text-cf-espresso"
          >
            {productName}
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-cf-espresso/50 transition-colors hover:text-cf-espresso"
            aria-label="Close quick view"
            data-slot="quick-view-modal-close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
          {load.kind === "loading" || load.kind === "idle" ? (
            <p
              className="py-8 text-center text-sm text-cf-espresso/60"
              data-slot="quick-view-loading"
            >
              Loading…
            </p>
          ) : null}

          {load.kind === "error" ? (
            <div className="py-8 text-center" data-slot="quick-view-error">
              <p className="text-sm text-cf-espresso/70">
                Couldn’t load product details.
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 rounded border border-cf-sand px-3 py-1.5 text-sm font-medium text-cf-espresso hover:bg-cf-sand/20"
              >
                Try again
              </button>
            </div>
          ) : null}

          {load.kind === "loaded" ? (
            <QuickViewBody
              product={load.product}
              productSlug={productSlug}
              productName={productName}
              onAdded={close}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}

function QuickViewBody({
  product,
  productSlug,
  productName,
  onAdded,
}: {
  product: WixProduct;
  productSlug: string;
  productName: string;
  onAdded: () => void;
}) {
  const productOptions = readOptions(product);
  const variants = readVariants(product);
  const fallbackPrice = formatPlpPrice(product);
  const fallbackPriceCents = Math.round(
    (product.priceData?.price ?? product.priceRange?.minValue ?? 0) * 100,
  );
  const { primary } = getPlpCardImages(product);

  const [selection, setSelection] = useState<ChoiceSelection>(() =>
    initialSelection(productOptions, variants),
  );

  const selectedVariant = findMatchingVariant(variants, selection);
  const selectionComplete =
    productOptions.length === 0 ||
    isSelectionComplete(productOptions, selection);
  const inStock = selectedVariant
    ? isVariantInStock(selectedVariant)
    : productOptions.length === 0;
  const imageUrl = getSelectedImageUrl(variants, selection, primary ?? undefined);
  const selectedPrice = getSelectedPrice(variants, selection, fallbackPrice);
  const variantLabel = Object.entries(selection)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const productId = (product as { _id?: string | null })._id ?? "";

  const disabledReason = !selectionComplete
    ? "Select options to continue"
    : !inStock
      ? "Out of stock"
      : undefined;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div data-slot="quick-view-media">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={productName}
            className="aspect-square w-full rounded-lg object-cover"
          />
        ) : (
          <div className="aspect-square w-full rounded-lg bg-cf-sand" />
        )}
      </div>
      <div className="space-y-4" data-slot="quick-view-details">
        <p
          className="text-lg font-medium text-cf-espresso"
          data-slot="quick-view-price"
          aria-live="polite"
        >
          {selectedPrice}
        </p>
        <VariantPicker
          productOptions={productOptions}
          variants={variants}
          fallbackPrice={fallbackPrice}
          onSelectionChange={(next) => setSelection(next)}
        />
        <AddToCartButton
          productId={productId}
          productName={productName}
          variantId={selectedVariant?._id ?? undefined}
          variantLabel={variantLabel || undefined}
          options={selection}
          imageUrl={imageUrl}
          productUrl={`/products/${productSlug}`}
          unitPriceCents={fallbackPriceCents}
          formattedUnitPrice={selectedPrice}
          disabled={!selectionComplete || !inStock}
          disabledReason={disabledReason}
          onAdded={onAdded}
        />
      </div>
    </div>
  );
}
