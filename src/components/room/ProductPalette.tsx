"use client";

// ProductPalette — sidebar of draggable furniture items for DragDropRoomPlanner.
// Each tile is a native HTML5 draggable that sets a "new:<futonIdx>" dataTransfer
// value consumed by the canvas drop handler.

import { FUTON_OPTIONS } from "@/lib/design-a-room/steps";

const CATEGORY_LABELS: Record<string, string> = {
  futon: "Futon Frames",
  murphy: "Murphy Beds",
};

type PaletteItem = {
  futonIdx: number;
  label: string;
  category: "futon" | "murphy";
  widthIn: number;
  depthIn: number;
};

const PALETTE_ITEMS: PaletteItem[] = FUTON_OPTIONS.map((opt, i) => ({
  futonIdx: i,
  label: opt.shortLabel,
  category: opt.shortLabel.toLowerCase().includes("murphy") ? "murphy" : "futon",
  widthIn: opt.widthIn,
  depthIn: opt.depthIn,
}));

type ProductPaletteProps = {
  onDragStart: (futonIdx: number, e: React.DragEvent) => void;
};

export function ProductPalette({ onDragStart }: ProductPaletteProps) {
  const futons = PALETTE_ITEMS.filter((i) => i.category === "futon");
  const murphys = PALETTE_ITEMS.filter((i) => i.category === "murphy");

  return (
    <aside
      aria-label="Furniture palette"
      data-slot="product-palette"
      className="flex w-44 shrink-0 flex-col gap-4 rounded-lg border border-cf-divider bg-white p-3 text-xs"
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-cf-muted">
        Drag to room
      </p>

      <PaletteGroup label={CATEGORY_LABELS.futon} items={futons} onDragStart={onDragStart} />
      <PaletteGroup label={CATEGORY_LABELS.murphy} items={murphys} onDragStart={onDragStart} />
    </aside>
  );
}

function PaletteGroup({
  label,
  items,
  onDragStart,
}: {
  label: string;
  items: PaletteItem[];
  onDragStart: (futonIdx: number, e: React.DragEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-cf-espresso">{label}</span>
      {items.map((item) => (
        <div
          key={item.futonIdx}
          draggable
          onDragStart={(e) => onDragStart(item.futonIdx, e)}
          role="button"
          aria-label={`Add ${item.label} to room`}
          tabIndex={0}
          className="cursor-grab select-none rounded border border-cf-sand bg-cf-sand/20 px-2 py-1.5 leading-snug text-cf-espresso transition hover:bg-cf-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 active:cursor-grabbing"
        >
          <span className="block font-medium">{item.label}</span>
          <span className="text-[10px] text-cf-muted">
            {Math.round(item.widthIn / 12 * 10) / 10}′ × {Math.round(item.depthIn / 12 * 10) / 10}′
          </span>
        </div>
      ))}
    </div>
  );
}
