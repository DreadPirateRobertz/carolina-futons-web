"use client";

import { useState } from "react";

import {
  DEFAULT_FUTON_IDX,
  FUTON_OPTIONS,
  type FutonOption,
} from "@/lib/design-a-room/steps";

const CANVAS_W = 400;
const CANVAS_H = 320;
const PADDING = 24;
const ROOM_MIN = 6;
const ROOM_MAX = 30;
const ROOM_DEFAULT_W = 12;
const ROOM_DEFAULT_D = 10;

function toScale(roomFt: number, canvasPx: number): number {
  if (roomFt <= 0) return 0;
  return (canvasPx - PADDING * 2) / (roomFt * 12);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function parseRoomFt(raw: string, fallback: number): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? clamp(n, ROOM_MIN, ROOM_MAX) : fallback;
}

export function RoomPlannerCanvas() {
  const [roomWStr, setRoomWStr] = useState(String(ROOM_DEFAULT_W));
  const [roomDStr, setRoomDStr] = useState(String(ROOM_DEFAULT_D));
  const [selectedIdx, setSelectedIdx] = useState(DEFAULT_FUTON_IDX);

  const roomW = parseRoomFt(roomWStr, ROOM_DEFAULT_W);
  const roomD = parseRoomFt(roomDStr, ROOM_DEFAULT_D);
  const futon: FutonOption = FUTON_OPTIONS[selectedIdx] ?? FUTON_OPTIONS[DEFAULT_FUTON_IDX]!;

  const scale = Math.min(toScale(roomW, CANVAS_W), toScale(roomD, CANVAS_H));

  const roomPxW = roomW * 12 * scale;
  const roomPxD = roomD * 12 * scale;
  const roomX = (CANVAS_W - roomPxW) / 2;
  const roomY = (CANVAS_H - roomPxD) / 2;

  const futonPxW = clamp(futon.widthIn * scale, 1, Math.max(1, roomPxW - 2));
  const futonPxD = clamp(futon.depthIn * scale, 1, Math.max(1, roomPxD - 2));

  const fits = futon.widthIn <= roomW * 12 && futon.depthIn <= roomD * 12;

  const inputClass =
    "mt-1 rounded-md border border-cf-divider bg-white px-3 py-2 text-sm shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-cf-ink">
          Room width (ft)
          <input
            type="number"
            min={ROOM_MIN}
            max={ROOM_MAX}
            value={roomWStr}
            onChange={(e) => setRoomWStr(e.target.value)}
            onBlur={(e) => {
              const n = parseRoomFt(e.target.value, ROOM_DEFAULT_W);
              setRoomWStr(String(n));
            }}
            className={inputClass}
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
            onBlur={(e) => {
              const n = parseRoomFt(e.target.value, ROOM_DEFAULT_D);
              setRoomDStr(String(n));
            }}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cf-ink">
          Futon / bed size
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className={inputClass}
          >
            {FUTON_OPTIONS.map((opt, i) => (
              <option key={opt.label} value={i}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        aria-label="Room plan view"
        role="img"
        className="overflow-hidden rounded-lg border border-cf-divider bg-cf-sand/20"
      >
        <svg
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          width="100%"
          className="block"
          aria-hidden="true"
        >
          <rect
            x={roomX}
            y={roomY}
            width={roomPxW}
            height={roomPxD}
            rx={2}
            fill="white"
            stroke="#d4c5ad"
            strokeWidth={1.5}
          />
          <text
            x={CANVAS_W / 2}
            y={roomY - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#7a6a58"
          >
            {roomW} ft × {roomD} ft
          </text>
          <rect
            x={roomX + 1}
            y={roomY + 1}
            width={futonPxW}
            height={futonPxD}
            rx={2}
            fill={fits ? "#4a7d9420" : "#e8400020"}
            stroke={fits ? "#4a7d94" : "#e84000"}
            strokeWidth={1.5}
          />
          {futonPxW > 36 && futonPxD > 16 ? (
            <text
              x={roomX + 1 + futonPxW / 2}
              y={roomY + 1 + futonPxD / 2 + 4}
              textAnchor="middle"
              fontSize={9}
              fill={fits ? "#2c5c70" : "#8b2000"}
            >
              {futon.shortLabel}
            </text>
          ) : null}
        </svg>
      </div>

      {!fits ? (
        <p className="text-xs text-red-700" role="alert">
          This piece is wider or deeper than the room dimensions you entered.
          Adjust the room size or choose a smaller option.
        </p>
      ) : (
        <p className="text-xs text-cf-muted">
          Blue rectangle shows the sleeping/open footprint of the selected piece.
          Dimensions are approximate — allow clearance for doors and traffic paths.
        </p>
      )}
    </div>
  );
}
