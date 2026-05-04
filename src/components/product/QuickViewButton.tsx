"use client";

import { useState } from "react";

import { QuickViewModal } from "@/components/product/QuickViewModal";

// Sibling-of-Link button on the card. The card body is wrapped in a <Link>
// so we keep the trigger outside that link to avoid nested-anchor semantics
// (and to prevent click-bubbling into the PDP navigation).
export function QuickViewButton({
  slug,
  productName,
}: {
  slug: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-slot="quick-view-button"
        aria-label={`Quick view: ${productName}`}
        onClick={() => setOpen(true)}
        className="rounded-full border border-zinc-300 bg-white/90 px-3 py-1 text-xs font-medium text-cf-ink shadow-sm backdrop-blur hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-100"
      >
        Quick view
      </button>
      <QuickViewModal
        open={open}
        slug={slug}
        productName={productName}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
