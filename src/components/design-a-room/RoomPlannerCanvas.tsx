"use client";

import { useState } from "react";

import { FUTON_OPTIONS, type FutonOption } from "@/lib/design-a-room/steps";

const CANVAS_W = 400;
const CANVAS_H = 320;
const PADDING = 24;

function toScale(roomFt: number, canvasPx: number): number {
  return (canvasPx - PADDING * 2) / (roomFt * 12);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function RoomPlannerCanvas() {
  const [roomW, setRoomW] = useState(12);
  const [roomD, setRoomD] = useState(10);
  const [selectedIdx, setSelectedIdx] = useState(1);

  const futon: FutonOption = FUTON_OPTIONS[selectedIdx] ?? FUTON_OPTIONS[1]!;

  const scaleX = toScale(roomW, CANVAS_W);
  const scaleY = toScale(roomD, CANVAS_H);
  const scale = Math.min(scaleX, scaleY);

  const roomPxW = clamp(roomW * 12 * scale, 1, CANVAS_W - PADDING * 2);
  const roomPxD = clamp(roomD * 12 * scale, 1, CANVAS_H - PADDING * 2);

  const roomX = (CANVAS_W - roomPxW) / 2;
  const roomY = (CANVAS_H - roomPxD) / 2;

  const futonPxW = clamp(futon.widthIn * scale, 1, roomPxW - 2);
  const futonPxD = clamp(futon.depthIn * scale, 1, roomPxD - 2);

  const fits = futon.widthIn <= roomW * 12 && futon.depthIn <= roomD * 12;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-cf-ink">
          Room width (ft)
          <input
            type="number"
            min={6}
            max={30}
            value={roomW}
            onChange={(e) => setRoomW(clamp(Number(e.target.value), 6, 30))}
            className="mt-1 rounded-md border border-cf-divider bg-white px-3 py-2 text-sm shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cf-ink">
          Room depth (ft)
          <input
            type="number"
            min={6}
            max={30}
            value={roomD}
            onChange={(e) => setRoomD(clamp(Number(e.target.value), 6, 30))}
            className="mt-1 rounded-md border border-cf-divider bg-white px-3 py-2 text-sm shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cf-ink">
          Futon / bed size
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="mt-1 rounded-md border border-cf-divider bg-white px-3 py-2 text-sm shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
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
          {/* room outline */}
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
          {/* room label */}
          <text
            x={CANVAS_W / 2}
            y={roomY - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#7a6a58"
          >
            {roomW} ft × {roomD} ft
          </text>
          {/* futon */}
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
          {/* futon label */}
          {futonPxW > 36 && futonPxD > 16 ? (
            <text
              x={roomX + 1 + futonPxW / 2}
              y={roomY + 1 + futonPxD / 2 + 4}
              textAnchor="middle"
              fontSize={9}
              fill={fits ? "#2c5c70" : "#8b2000"}
            >
              {futon.label.split("(")[0]?.trim()}
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
          Blue rectangle shows the footprint of the selected piece inside your
          room. Dimensions are approximate — allow clearance for doors and
          traffic paths.
        </p>
      )}
    </div>
  );
}
