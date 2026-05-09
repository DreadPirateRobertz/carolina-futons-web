"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { CareGuide, ProductDimensions } from "@/lib/product/size-guide-shared";
import { PdpSizeGuide } from "@/components/product/PdpSizeGuide";

export type ProductInfoModalProps = {
  productName: string;
  dimensions: ProductDimensions | null;
  careGuide: CareGuide | null;
};

type Tab = "dimensions" | "care";

const GENERIC_CARE: Array<{ title: string; body: string }> = [
  {
    title: "Routine Cleaning",
    body: "Vacuum upholstered surfaces weekly. Spot-clean spills immediately with a lightly damp cloth and mild soap. Avoid soaking the fabric.",
  },
  {
    title: "Frame & Hardware",
    body: "Wipe wood and metal components with a dry or slightly damp cloth. Avoid harsh chemicals. Tighten bolts every 6–12 months.",
  },
  {
    title: "Avoid",
    body: "Direct sunlight for extended periods, bleach-based cleaners, and placing on uneven surfaces that stress the frame.",
  },
];

function GenericCareGuide() {
  return (
    <div className="space-y-4" data-slot="generic-care-guide">
      <p className="text-sm text-cf-espresso/70">
        No product-specific care guide is available yet. General furniture care guidelines:
      </p>
      {GENERIC_CARE.map((tip) => (
        <div key={tip.title}>
          <p className="text-xs font-semibold text-cf-espresso/70 uppercase tracking-wide mb-1">
            {tip.title}
          </p>
          <p className="text-sm text-cf-espresso/80">{tip.body}</p>
        </div>
      ))}
    </div>
  );
}

function CareGuideContent({ guide }: { guide: CareGuide }) {
  return (
    <div className="space-y-4" data-slot="care-guide-content">
      {guide.material !== "unknown" && (
        <p className="text-xs font-semibold uppercase tracking-wide text-cf-espresso/60 capitalize">
          {guide.material} Care
        </p>
      )}
      {guide.cleaningMethod && (
        <div>
          <p className="text-xs font-medium text-cf-espresso/70 uppercase tracking-wide mb-1">Cleaning</p>
          <p className="text-sm text-cf-espresso/80 whitespace-pre-line">{guide.cleaningMethod}</p>
        </div>
      )}
      {guide.maintenanceTips && (
        <div>
          <p className="text-xs font-medium text-cf-espresso/70 uppercase tracking-wide mb-1">Maintenance</p>
          <p className="text-sm text-cf-espresso/80 whitespace-pre-line">{guide.maintenanceTips}</p>
        </div>
      )}
      {guide.warningNotes && (
        <div>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">⚠ Warnings</p>
          <p className="text-sm text-cf-espresso/80 whitespace-pre-line">{guide.warningNotes}</p>
        </div>
      )}
    </div>
  );
}

export function ProductInfoModal({
  productName,
  dimensions,
  careGuide,
}: ProductInfoModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dimensions");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dimTabId = useId();
  const careTabId = useId();
  const dimPanelId = useId();
  const carePanelId = useId();

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

  // Close on backdrop click
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) setOpen(false);
  };

  // Close on Escape (native <dialog> already does this, but update state)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded border border-cf-sand px-3 py-1.5 text-sm font-medium text-cf-espresso hover:bg-cf-sand/20 transition-colors"
        data-slot="product-info-modal-trigger"
        aria-haspopup="dialog"
      >
        Dimensions & Care
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={handleDialogClick}
        className="m-auto w-full max-w-lg rounded-xl bg-white dark:bg-cf-cream p-0 shadow-2xl backdrop:bg-black/40 open:animate-[fadeIn_0.15s_ease]"
        data-slot="product-info-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cf-sand/40 px-5 py-4">
          <h2 id={titleId} className="font-heading text-base font-semibold text-cf-espresso">
            {productName}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-cf-espresso/50 hover:text-cf-espresso transition-colors"
            aria-label="Close dimensions and care guide"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex border-b border-cf-sand/40 px-5">
          <button
            role="tab"
            id={dimTabId}
            aria-controls={dimPanelId}
            aria-selected={activeTab === "dimensions"}
            onClick={() => setActiveTab("dimensions")}
            className={`py-2.5 pr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "dimensions"
                ? "border-cf-espresso text-cf-espresso"
                : "border-transparent text-cf-espresso/50 hover:text-cf-espresso/80"
            }`}
          >
            Dimensions
          </button>
          <button
            role="tab"
            id={careTabId}
            aria-controls={carePanelId}
            aria-selected={activeTab === "care"}
            onClick={() => setActiveTab("care")}
            className={`py-2.5 pr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "care"
                ? "border-cf-espresso text-cf-espresso"
                : "border-transparent text-cf-espresso/50 hover:text-cf-espresso/80"
            }`}
          >
            Care Guide
          </button>
        </div>

        {/* Tab panels */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div
            role="tabpanel"
            id={dimPanelId}
            aria-labelledby={dimTabId}
            hidden={activeTab !== "dimensions"}
          >
            {/* Reuse PdpSizeGuide without the outer section wrapper — strip care guide here */}
            <PdpSizeGuide
              productName={productName}
              dimensions={dimensions}
            />
          </div>

          <div
            role="tabpanel"
            id={carePanelId}
            aria-labelledby={careTabId}
            hidden={activeTab !== "care"}
          >
            {careGuide ? (
              <CareGuideContent guide={careGuide} />
            ) : (
              <GenericCareGuide />
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
