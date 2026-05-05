"use client";

// DragDropRoomPlanner — cf-l6aj.15.
// Full drag-drop room planner with localStorage persistence.
// Extends the coordinate logic from RoomPlannerCanvas but adds:
//   • ProductPalette sidebar (draggable furniture catalog)
//   • localStorage save/load (auto-saves on every change)
//   • Clear button

import { useState, useRef, useEffect } from "react";

import { FUTON_OPTIONS } from "@/lib/design-a-room/steps";
import {
  clampItemToRoom,
  effectiveDims,
  makeItemId,
  pxToRoomIn,
  scaleForRoom,
  type PlacedItem,
  type LayoutState,
} from "@/lib/design-a-room/planner-logic";
import { saveLayout, loadLayout, clearLayout } from "@/lib/room-planner/save";
import { ProductPalette } from "@/components/room/ProductPalette";

const CANVAS_W = 600;
const CANVAS_H = 480;
const PADDING = 32;
const ROOM_MIN = 6;
const ROOM_MAX = 30;
const ROOM_DEFAULT_W = 12;
const ROOM_DEFAULT_D = 10;
const GRID_FT = 1; // snap grid in feet

function parseRoomFt(raw: string, fallback: number): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? Math.max(ROOM_MIN, Math.min(ROOM_MAX, n)) : fallback;
}

function snapToGrid(valueIn: number, gridFt: number): number {
  const gridIn = gridFt * 12;
  return Math.round(valueIn / gridIn) * gridIn;
}

type DragPayload =
  | { type: "new"; futonIdx: number }
  | { type: "move"; itemId: string };

const INPUT_CLS =
  "rounded-md border border-cf-divider bg-white px-3 py-2 text-sm shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta w-20";

export function DragDropRoomPlanner() {
  const [roomWStr, setRoomWStr] = useState(String(ROOM_DEFAULT_W));
  const [roomDStr, setRoomDStr] = useState(String(ROOM_DEFAULT_D));
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragPayload = useRef<DragPayload | null>(null);
  const dragOffsetInRoom = useRef({ xIn: 0, yIn: 0 });

  // Load from localStorage on mount. setState is required here because
  // localStorage isn't available during SSR — initial state must be deterministic.
  useEffect(() => {
    const layout = loadLayout();
    if (!layout) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoomWStr(String(layout.roomWFt));
    setRoomDStr(String(layout.roomDFt));
    setItems(layout.items);
  }, []);

  const roomW = parseRoomFt(roomWStr, ROOM_DEFAULT_W);
  const roomD = parseRoomFt(roomDStr, ROOM_DEFAULT_D);

  const scale = Math.min(
    scaleForRoom(roomW, CANVAS_W, PADDING),
    scaleForRoom(roomD, CANVAS_H, PADDING),
  );
  const roomPxW = roomW * 12 * scale;
  const roomPxD = roomD * 12 * scale;
  const roomOriginX = (CANVAS_W - roomPxW) / 2;
  const roomOriginY = (CANVAS_H - roomPxD) / 2;

  function persistLayout(layout: LayoutState) {
    saveLayout(layout);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function canvasRelative(e: React.DragEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // ProductPalette drag start: encode futonIdx.
  function handlePaletteDragStart(futonIdx: number, e: React.DragEvent) {
    dragPayload.current = { type: "new", futonIdx };
    dragOffsetInRoom.current = { xIn: 0, yIn: 0 };
    e.dataTransfer.effectAllowed = "copy";
  }

  // Item drag start (move): encode itemId + drag offset.
  function handleItemDragStart(item: PlacedItem, e: React.DragEvent) {
    e.stopPropagation();
    const pos = canvasRelative(e);
    if (pos) {
      const opt = FUTON_OPTIONS[item.futonIdx];
      const { w, d } = effectiveDims(opt.widthIn, opt.depthIn, item.rotated);
      const itemPxX = roomOriginX + item.xIn * scale;
      const itemPxY = roomOriginY + item.yIn * scale;
      dragOffsetInRoom.current = {
        xIn: pxToRoomIn(pos.x - itemPxX, 0, scale),
        yIn: pxToRoomIn(pos.y - itemPxY, 0, scale),
      };
      void w; void d;
    }
    dragPayload.current = { type: "move", itemId: item.id };
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragPayload.current?.type === "new" ? "copy" : "move";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const pos = canvasRelative(e);
    if (!pos || !dragPayload.current) return;

    const payload = dragPayload.current;
    dragPayload.current = null;

    const rawXIn = pxToRoomIn(pos.x - roomOriginX, 0, scale) - dragOffsetInRoom.current.xIn;
    const rawYIn = pxToRoomIn(pos.y - roomOriginY, 0, scale) - dragOffsetInRoom.current.yIn;

    if (payload.type === "new") {
      const opt = FUTON_OPTIONS[payload.futonIdx];
      const { w, d } = effectiveDims(opt.widthIn, opt.depthIn, false);
      const { xIn, yIn } = clampItemToRoom(
        snapToGrid(rawXIn, GRID_FT),
        snapToGrid(rawYIn, GRID_FT),
        w, d, roomW * 12, roomD * 12,
      );
      const next: PlacedItem[] = [
        ...items,
        { id: makeItemId(), futonIdx: payload.futonIdx, xIn, yIn, rotated: false },
      ];
      setItems(next);
      persistLayout({ roomWFt: roomW, roomDFt: roomD, items: next });
    } else {
      setItems((prev) => {
        const next = prev.map((item) => {
          if (item.id !== payload.itemId) return item;
          const opt = FUTON_OPTIONS[item.futonIdx];
          const { w, d } = effectiveDims(opt.widthIn, opt.depthIn, item.rotated);
          const { xIn, yIn } = clampItemToRoom(
            snapToGrid(rawXIn, GRID_FT),
            snapToGrid(rawYIn, GRID_FT),
            w, d, roomW * 12, roomD * 12,
          );
          return { ...item, xIn, yIn };
        });
        persistLayout({ roomWFt: roomW, roomDFt: roomD, items: next });
        return next;
      });
    }
  }

  function rotateItem(id: string) {
    setItems((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        const opt = FUTON_OPTIONS[item.futonIdx];
        const rotated = !item.rotated;
        const { w, d } = effectiveDims(opt.widthIn, opt.depthIn, rotated);
        const { xIn, yIn } = clampItemToRoom(item.xIn, item.yIn, w, d, roomW * 12, roomD * 12);
        return { ...item, rotated, xIn, yIn };
      });
      persistLayout({ roomWFt: roomW, roomDFt: roomD, items: next });
      return next;
    });
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      persistLayout({ roomWFt: roomW, roomDFt: roomD, items: next });
      return next;
    });
  }

  function handleClear() {
    setItems([]);
    clearLayout();
  }

  return (
    <div
      data-slot="drag-drop-room-planner"
      className="flex flex-col gap-4"
    >
      {/* Room size controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-cf-muted">Width (ft)</span>
          <input
            type="number"
            min={ROOM_MIN}
            max={ROOM_MAX}
            value={roomWStr}
            onChange={(e) => setRoomWStr(e.target.value)}
            className={INPUT_CLS}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-cf-muted">Depth (ft)</span>
          <input
            type="number"
            min={ROOM_MIN}
            max={ROOM_MAX}
            value={roomDStr}
            onChange={(e) => setRoomDStr(e.target.value)}
            className={INPUT_CLS}
          />
        </label>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-muted hover:border-red-300 hover:text-red-600"
        >
          Clear
        </button>
        {saved && (
          <span aria-live="polite" className="text-xs text-green-600">
            Layout saved ✓
          </span>
        )}
      </div>

      {/* Planner area: palette + canvas */}
      <div className="flex gap-4">
        <ProductPalette onDragStart={handlePaletteDragStart} />

        {/* Canvas */}
        <div
          ref={canvasRef}
          role="application"
          aria-label="Room planner canvas"
          data-slot="room-canvas"
          className="relative shrink-0 overflow-hidden rounded-lg border border-cf-divider bg-cf-sand/10"
          style={{ width: CANVAS_W, height: CANVAS_H }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Room outline */}
          <div
            className="absolute rounded border-2 border-cf-espresso/30 bg-white/60"
            style={{
              left: roomOriginX,
              top: roomOriginY,
              width: roomPxW,
              height: roomPxD,
            }}
          />

          {/* Grid lines (1ft) */}
          {Array.from({ length: Math.floor(roomW) - 1 }).map((_, i) => (
            <div
              key={`vg-${i}`}
              aria-hidden="true"
              className="absolute border-l border-dashed border-cf-sand/60"
              style={{
                left: roomOriginX + (i + 1) * 12 * scale,
                top: roomOriginY,
                height: roomPxD,
              }}
            />
          ))}
          {Array.from({ length: Math.floor(roomD) - 1 }).map((_, i) => (
            <div
              key={`hg-${i}`}
              aria-hidden="true"
              className="absolute border-t border-dashed border-cf-sand/60"
              style={{
                top: roomOriginY + (i + 1) * 12 * scale,
                left: roomOriginX,
                width: roomPxW,
              }}
            />
          ))}

          {/* Placed items */}
          {items.map((item) => {
            const opt = FUTON_OPTIONS[item.futonIdx];
            const { w, d } = effectiveDims(opt.widthIn, opt.depthIn, item.rotated);
            const pxX = roomOriginX + item.xIn * scale;
            const pxY = roomOriginY + item.yIn * scale;
            const pxW = w * scale;
            const pxD = d * scale;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleItemDragStart(item, e)}
                className="group absolute flex cursor-grab flex-col items-center justify-center rounded border-2 border-cf-cta bg-cf-cta/20 text-center text-[10px] font-medium text-cf-cta active:cursor-grabbing"
                style={{ left: pxX, top: pxY, width: pxW, height: pxD }}
                title={`${opt.shortLabel}${item.rotated ? " (rotated)" : ""}`}
              >
                <span className="truncate px-1 leading-tight">{opt.shortLabel}</span>
                <div className="absolute right-0 top-0 hidden gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    aria-label={`Rotate ${opt.shortLabel}`}
                    onClick={() => rotateItem(item.id)}
                    className="rounded bg-white/80 px-1 text-xs hover:bg-white"
                  >
                    ↻
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${opt.shortLabel}`}
                    onClick={() => removeItem(item.id)}
                    className="rounded bg-white/80 px-1 text-xs text-red-500 hover:bg-white"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-cf-muted">
              Drag furniture from the palette
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
