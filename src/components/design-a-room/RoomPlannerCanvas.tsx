"use client";

import { useState, useRef, useEffect } from "react";

import {
  FUTON_OPTIONS,
} from "@/lib/design-a-room/steps";
import {
  clampItemToRoom,
  effectiveDims,
  makeItemId,
  pxToRoomIn,
  roomInToPx,
  scaleForRoom,
  encodeLayout,
  decodeLayout,
  buildShareUrl,
  type PlacedItem,
  type LayoutState,
} from "@/lib/design-a-room/planner-logic";

const CANVAS_W = 600;
const CANVAS_H = 480;
const PADDING = 32;
const ROOM_MIN = 6;
const ROOM_MAX = 30;
const ROOM_DEFAULT_W = 12;
const ROOM_DEFAULT_D = 10;

function parseRoomFt(raw: string, fallback: number): number {
  const n = parseFloat(raw);
  return Number.isFinite(n)
    ? Math.max(ROOM_MIN, Math.min(ROOM_MAX, n))
    : fallback;
}

type DragPayload =
  | { type: "new"; futonIdx: number }
  | { type: "move"; itemId: string };

const INPUT_CLS =
  "mt-1 rounded-md border border-cf-divider bg-white px-3 py-2 text-sm shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta";

export function RoomPlannerCanvas() {
  const [roomWStr, setRoomWStr] = useState(String(ROOM_DEFAULT_W));
  const [roomDStr, setRoomDStr] = useState(String(ROOM_DEFAULT_D));
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [shareMsg, setShareMsg] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragPayload = useRef<DragPayload | null>(null);
  const dragOffsetInRoom = useRef({ xIn: 0, yIn: 0 });

  const roomW = parseRoomFt(roomWStr, ROOM_DEFAULT_W);
  const roomD = parseRoomFt(roomDStr, ROOM_DEFAULT_D);

  // Uniform scale: fit the smaller dimension, centered with padding
  const scale = Math.min(
    scaleForRoom(roomW, CANVAS_W, PADDING),
    scaleForRoom(roomD, CANVAS_H, PADDING),
  );
  const roomPxW = roomW * 12 * scale;
  const roomPxD = roomD * 12 * scale;
  // Room origin: center the room in the canvas
  const roomOriginX = (CANVAS_W - roomPxW) / 2;
  const roomOriginY = (CANVAS_H - roomPxD) / 2;

  // Load from ?layout= on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("layout");
    if (!encoded) return;
    const state = decodeLayout(encoded);
    if (!state) return;
    setRoomWStr(String(state.roomWFt));
    setRoomDStr(String(state.roomDFt));
    setItems(state.items);
  }, []);

  function canvasRelative(e: React.DragEvent): { x: number; y: number } | null {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const pos = canvasRelative(e);
    if (!pos || !dragPayload.current) return;

    // Canvas px → room-origin-relative px → room inches
    const canvasX = pos.x - dragOffsetInRoom.current.xIn * scale;
    const canvasY = pos.y - dragOffsetInRoom.current.yIn * scale;
    const rawXIn = pxToRoomIn(canvasX, roomOriginX, scale);
    const rawYIn = pxToRoomIn(canvasY, roomOriginY, scale);

    const payload = dragPayload.current;
    dragPayload.current = null;

    if (payload.type === "new") {
      const futon = FUTON_OPTIONS[payload.futonIdx];
      if (!futon) return;
      const { w, d } = effectiveDims(futon.widthIn, futon.depthIn, false);
      const { xIn, yIn } = clampItemToRoom(rawXIn, rawYIn, w, d, roomW * 12, roomD * 12);
      setItems((prev) => [
        ...prev,
        { id: makeItemId(), futonIdx: payload.futonIdx, xIn, yIn, rotated: false },
      ]);
    } else {
      const targetId = payload.itemId;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== targetId) return item;
          const futon = FUTON_OPTIONS[item.futonIdx];
          if (!futon) return item;
          const { w, d } = effectiveDims(futon.widthIn, futon.depthIn, item.rotated);
          const { xIn, yIn } = clampItemToRoom(rawXIn, rawYIn, w, d, roomW * 12, roomD * 12);
          return { ...item, xIn, yIn };
        }),
      );
    }
  }

  function rotateItem(id: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const futon = FUTON_OPTIONS[item.futonIdx];
        if (!futon) return item;
        const rotated = !item.rotated;
        const { w, d } = effectiveDims(futon.widthIn, futon.depthIn, rotated);
        const { xIn, yIn } = clampItemToRoom(item.xIn, item.yIn, w, d, roomW * 12, roomD * 12);
        return { ...item, rotated, xIn, yIn };
      }),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleShare() {
    const state: LayoutState = { roomWFt: roomW, roomDFt: roomD, items };
    const url = buildShareUrl(window.location.href, state);
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied!");
    } catch {
      setShareMsg(url);
    }
    setTimeout(() => setShareMsg(""), 5000);
  }

  return (
    <div className="space-y-4">
      {/* Room dimension inputs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-cf-ink">
          Room width (ft)
          <input
            type="number"
            min={ROOM_MIN}
            max={ROOM_MAX}
            value={roomWStr}
            onChange={(e) => setRoomWStr(e.target.value)}
            onBlur={(e) =>
              setRoomWStr(String(parseRoomFt(e.target.value, ROOM_DEFAULT_W)))
            }
            className={INPUT_CLS}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cf-ink">
          Room depth (ft)
          <input
            type="number"
            min={ROOM_MIN}
            max={ROOM_MAX}
            value={roomDStr}
            onChange={(e) => setRoomDStr(e.target.value)}
            onBlur={(e) =>
              setRoomDStr(String(parseRoomFt(e.target.value, ROOM_DEFAULT_D)))
            }
            className={INPUT_CLS}
          />
        </label>
      </div>

      {/* Draggable palette */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cf-muted">
          Drag a piece into the room
        </p>
        <div className="flex flex-wrap gap-2">
          {FUTON_OPTIONS.map((opt, i) => (
            <div
              key={opt.label}
              draggable
              onDragStart={(e) => {
                dragPayload.current = { type: "new", futonIdx: i };
                dragOffsetInRoom.current = { xIn: 0, yIn: 0 };
                e.dataTransfer.effectAllowed = "move";
              }}
              className="cursor-grab select-none rounded-md border border-cf-divider bg-white px-3 py-1.5 text-xs font-medium text-cf-ink shadow-sm active:cursor-grabbing"
            >
              {opt.shortLabel}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="overflow-x-auto">
        <div
          ref={canvasRef}
          role="application"
          aria-label="Room plan — drag furniture pieces into the room"
          className="relative rounded-lg border border-cf-divider bg-cf-sand/20"
          style={{ width: CANVAS_W, height: CANVAS_H }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Room floor */}
          <div
            aria-hidden="true"
            className="absolute rounded-sm border border-[#d4c5ad] bg-white"
            style={{
              left: roomOriginX,
              top: roomOriginY,
              width: roomPxW,
              height: roomPxD,
            }}
          />

          {/* Room label */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute text-[10px] text-cf-muted"
            style={{
              left: CANVAS_W / 2,
              top: Math.max(4, roomOriginY - 16),
              transform: "translateX(-50%)",
            }}
          >
            {roomW}&thinsp;ft × {roomD}&thinsp;ft
          </div>

          {/* Placed items */}
          {items.map((item) => {
            const futon = FUTON_OPTIONS[item.futonIdx];
            if (!futon) return null;
            const { w, d } = effectiveDims(futon.widthIn, futon.depthIn, item.rotated);
            const pxLeft = roomInToPx(item.xIn, roomOriginX, scale);
            const pxTop = roomInToPx(item.yIn, roomOriginY, scale);
            const pxW = w * scale;
            const pxH = d * scale;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  dragPayload.current = { type: "move", itemId: item.id };
                  dragOffsetInRoom.current = {
                    xIn: (e.clientX - rect.left) / scale,
                    yIn: (e.clientY - rect.top) / scale,
                  };
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="absolute cursor-grab rounded-sm border border-[#4a7d94] bg-[#4a7d9426] active:cursor-grabbing"
                style={{ left: pxLeft, top: pxTop, width: pxW, height: pxH }}
                title={futon.shortLabel}
              >
                {pxW > 44 && pxH > 22 && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center select-none text-[9px] text-[#2c5c70]">
                    {futon.shortLabel}
                  </span>
                )}
                <div className="absolute right-0 top-0 flex">
                  <button
                    onClick={() => rotateItem(item.id)}
                    className="rounded-bl rounded-tr bg-white/80 px-1 py-0.5 text-[9px] leading-none text-cf-ink hover:bg-white"
                    aria-label={`Rotate ${futon.shortLabel}`}
                  >
                    ↻
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="rounded-tr bg-white/80 px-1 py-0.5 text-[9px] leading-none text-red-700 hover:bg-white"
                    aria-label={`Remove ${futon.shortLabel}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Share + hint */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleShare}
          disabled={items.length === 0}
          className="rounded-md border border-cf-divider bg-white px-4 py-2 text-sm font-medium text-cf-ink shadow-sm hover:bg-cf-sand/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Share layout
        </button>
        {shareMsg && (
          <span className="break-all text-xs text-cf-muted">{shareMsg}</span>
        )}
      </div>

      <p className="text-xs text-cf-muted">
        Drag pieces from the palette into the room. Use ↻ to rotate, × to
        remove. Dimensions shown are the sleeping / open footprint — allow
        clearance for doors and traffic paths.
      </p>
    </div>
  );
}
