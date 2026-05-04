"use client";

import { useState } from "react";

import {
  ROOM_STYLES,
  ROOM_STYLE_ORDER,
  SCENE_PRODUCTS,
  type RoomStyle,
  type RoomStyleConfig,
  type SceneProduct,
} from "@/lib/design-a-room/room-scenes";

// SVG viewBox: 600 × 420
const VB_W = 600;
const VB_H = 420;

// Room box corners
const FL: [number, number] = [60, 390];   // floor front-left
const FR: [number, number] = [540, 390];  // floor front-right
const BL: [number, number] = [120, 205];  // floor back-left
const BR: [number, number] = [480, 205];  // floor back-right
const BWT = 52;                            // back-wall top y

// Map a normalized floor position (nx ∈ [0,1], nz ∈ [0,1]) to screen coords.
// nz=0 → back of room, nz=1 → front of room.
// nx=0 → left wall, nx=1 → right wall.
function floorPt(nx: number, nz: number): [number, number] {
  const leftX = BL[0] + (FL[0] - BL[0]) * nz;
  const rightX = BR[0] + (FR[0] - BR[0]) * nz;
  const y = BL[1] + (FL[1] - BL[1]) * nz;
  return [leftX + (rightX - leftX) * nx, y];
}

function poly(...pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

function rect4(
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  return poly([x1, y1], [x2, y1], [x2, y2], [x1, y2]);
}

// ── Room shell ───────────────────────────────────────────────────────────────

function RoomShell({ style }: { style: RoomStyleConfig }) {
  return (
    <g>
      {/* Floor */}
      <polygon
        points={poly(FL, FR, [BR[0], BR[1]], [BL[0], BL[1]])}
        fill={style.floorColor}
      />
      {/* Floor planks (subtle stripes) */}
      {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((nz) => {
        const l = floorPt(0, nz);
        const r = floorPt(1, nz);
        return (
          <line
            key={nz}
            x1={l[0]} y1={l[1]} x2={r[0]} y2={r[1]}
            stroke={style.floorStripeColor}
            strokeWidth="1"
            opacity="0.5"
          />
        );
      })}
      {/* Back wall */}
      <rect
        x={BL[0]} y={BWT}
        width={BR[0] - BL[0]} height={BL[1] - BWT}
        fill={style.wallColor}
      />
      {/* Left side wall */}
      <polygon
        points={poly([FL[0], FL[1]], [BL[0], BL[1]], [BL[0], BWT], [FL[0], BWT])}
        fill={style.leftWallColor}
      />
      {/* Wall/floor border */}
      <line x1={BL[0]} y1={BL[1]} x2={BR[0]} y2={BR[1]} stroke="#00000018" strokeWidth="1.5" />
      {/* Left wall/floor border */}
      <line x1={FL[0]} y1={FL[1]} x2={BL[0]} y2={BL[1]} stroke="#00000018" strokeWidth="1.5" />
      {/* Left wall/back wall corner */}
      <line x1={BL[0]} y1={BWT} x2={BL[0]} y2={BL[1]} stroke="#00000014" strokeWidth="1" />
    </g>
  );
}

// ── Shared furniture ─────────────────────────────────────────────────────────

function Rug({
  style,
  frontNz = 0.52,
}: {
  style: RoomStyleConfig;
  frontNz?: number;
}) {
  const tl = floorPt(0.08, 0.06);
  const tr = floorPt(0.92, 0.06);
  const br = floorPt(0.92, frontNz);
  const bl = floorPt(0.08, frontNz);
  const il = floorPt(0.12, 0.095);
  const ir = floorPt(0.88, 0.095);
  const ibr = floorPt(0.88, frontNz - 0.04);
  const ibl = floorPt(0.12, frontNz - 0.04);
  return (
    <g>
      <polygon points={poly(tl, tr, br, bl)} fill={style.rugColor} opacity={0.75} />
      <polygon
        points={poly(il, ir, ibr, ibl)}
        fill="none"
        stroke={style.rugBorder}
        strokeWidth="2"
        opacity={0.45}
      />
    </g>
  );
}

function Plant({ style }: { style: RoomStyleConfig }) {
  const base = floorPt(0.08, 0.1);
  return (
    <g>
      {/* Pot */}
      <ellipse cx={base[0]} cy={base[1]} rx={10} ry={4} fill={style.accentColor} />
      <rect x={base[0] - 10} y={base[1] - 14} width={20} height={14} fill={style.accentColor} rx="2" />
      {/* Stem */}
      <line x1={base[0]} y1={base[1] - 14} x2={base[0]} y2={base[1] - 48} stroke={style.plantColor} strokeWidth="2.5" />
      {/* Leaves */}
      <ellipse cx={base[0] - 16} cy={base[1] - 50} rx={18} ry={10} fill={style.plantColor} transform={`rotate(-25,${base[0] - 16},${base[1] - 50})`} />
      <ellipse cx={base[0] + 16} cy={base[1] - 52} rx={18} ry={10} fill={style.plantColor} transform={`rotate(25,${base[0] + 16},${base[1] - 52})`} />
      <ellipse cx={base[0]} cy={base[1] - 60} rx={14} ry={9} fill={style.plantColor} />
    </g>
  );
}

function LampAndTable({ style, nx }: { style: RoomStyleConfig; nx: number }) {
  const base = floorPt(nx, 0.18);
  const tableW = 28;
  const tableH = 10;
  return (
    <g>
      {/* Table top */}
      <ellipse cx={base[0]} cy={base[1]} rx={tableW / 2} ry={tableH / 2} fill={style.accentColor} />
      <rect x={base[0] - tableW / 2} y={base[1] - tableH / 2} width={tableW} height={20} fill={style.accentColor} rx="1" />
      {/* Lamp pole */}
      <line x1={base[0]} y1={base[1] - 10} x2={base[0]} y2={base[1] - 75} stroke={style.accentColor} strokeWidth="2" />
      {/* Lamp shade */}
      <path
        d={`M${base[0] - 18},${base[1] - 75} Q${base[0]},${base[1] - 92} ${base[0] + 18},${base[1] - 75} Z`}
        fill={style.accentColor}
        stroke={style.productShade}
        strokeWidth="0.8"
        opacity="0.85"
      />
      {/* Light glow on back wall */}
      <ellipse cx={base[0]} cy={base[1] - 58} rx={30} ry={20} fill="#ffffe0" opacity="0.15" />
    </g>
  );
}

// ── Futon scene ──────────────────────────────────────────────────────────────

function FutonInScene({ style }: { style: RoomStyleConfig }) {
  // Seat footprint: nx [0.17, 0.83], nz [0.14, 0.30]
  const sl = floorPt(0.17, 0.30);  // seat front-left
  const sr = floorPt(0.83, 0.30);  // seat front-right
  const bl = floorPt(0.17, 0.14);  // seat back-left
  const br = floorPt(0.83, 0.14);  // seat back-right

  const backH = 58;   // px: back cushion height
  const seatFaceH = 18; // px: front face of seat
  const armH = 38;
  const armW = 14;

  return (
    <g>
      {/* Back cushion face (visible from front) */}
      <polygon
        points={rect4(bl[0], bl[1] - backH, br[0], br[1])}
        fill={style.productShade}
      />
      {/* Cushion divisions on back */}
      {[0.33, 0.66].map((t) => {
        const x = bl[0] + (br[0] - bl[0]) * t;
        return (
          <line
            key={t}
            x1={x} y1={bl[1]}
            x2={x} y2={bl[1] - backH + 4}
            stroke={style.productColor}
            strokeWidth="1.5"
            opacity="0.6"
          />
        );
      })}
      {/* Back cushion top (sliver visible from above) */}
      <polygon
        points={poly(bl, br, floorPt(0.83, 0.13), floorPt(0.17, 0.13))}
        fill={style.productColor}
        opacity="0.7"
      />
      {/* Seat surface */}
      <polygon points={poly(sl, sr, br, bl)} fill={style.productColor} />
      {/* Seat cushion seams */}
      {[0.33, 0.66].map((t) => {
        const f = floorPt(0.17 + t * (0.83 - 0.17), 0.30);
        const b = floorPt(0.17 + t * (0.83 - 0.17), 0.14);
        return (
          <line
            key={t}
            x1={f[0]} y1={f[1]}
            x2={b[0]} y2={b[1]}
            stroke={style.productShade}
            strokeWidth="1"
            opacity="0.4"
          />
        );
      })}
      {/* Seat front face */}
      <polygon
        points={rect4(sl[0], sl[1] - seatFaceH, sr[0], sl[1])}
        fill={style.productShade}
        opacity="0.6"
      />
      {/* Left armrest top */}
      <polygon
        points={poly(
          [sl[0] - armW, sl[1]],
          sl,
          bl,
          [bl[0] - armW, bl[1]],
        )}
        fill={style.productColor}
        opacity="0.85"
      />
      {/* Left armrest face */}
      <polygon
        points={rect4(sl[0] - armW, sl[1] - armH, sl[0], sl[1])}
        fill={style.productShade}
        opacity="0.55"
      />
      {/* Right armrest top */}
      <polygon
        points={poly(
          sr,
          [sr[0] + armW, sr[1]],
          [br[0] + armW, br[1]],
          br,
        )}
        fill={style.productColor}
        opacity="0.85"
      />
      {/* Right armrest face */}
      <polygon
        points={rect4(sr[0], sr[1] - armH, sr[0] + armW, sr[1])}
        fill={style.productShade}
        opacity="0.55"
      />
    </g>
  );
}

function FutonScene({ style }: { style: RoomStyleConfig }) {
  return (
    <g>
      <Rug style={style} frontNz={0.55} />
      <Plant style={style} />
      <FutonInScene style={style} />
      <LampAndTable style={style} nx={0.88} />
    </g>
  );
}

// ── Murphy bed scene ─────────────────────────────────────────────────────────

function MurphyScene({ style }: { style: RoomStyleConfig }) {
  // Cabinet panel on the back wall
  const panelX1 = BL[0] + 55;
  const panelX2 = BR[0] - 55;
  const panelY1 = BWT + 8;
  const panelY2 = BL[1] - 2;
  const mid = (panelX1 + panelX2) / 2;

  return (
    <g>
      <Rug style={style} frontNz={0.45} />
      <Plant style={style} />

      {/* Cabinet body */}
      <rect
        x={panelX1} y={panelY1}
        width={panelX2 - panelX1} height={panelY2 - panelY1}
        fill={style.productColor}
        rx="3"
      />
      {/* Cabinet trim */}
      <rect
        x={panelX1 + 6} y={panelY1 + 6}
        width={panelX2 - panelX1 - 12} height={panelY2 - panelY1 - 12}
        fill="none"
        stroke={style.productShade}
        strokeWidth="2"
        rx="2"
      />
      {/* Center split line */}
      <line
        x1={mid} y1={panelY1 + 6}
        x2={mid} y2={panelY2 - 6}
        stroke={style.productShade}
        strokeWidth="1.5"
      />
      {/* Pull handles */}
      <rect x={mid - 20} y={(panelY1 + panelY2) / 2 - 3} width={15} height={6} fill={style.accentColor} rx="2" />
      <rect x={mid + 5} y={(panelY1 + panelY2) / 2 - 3} width={15} height={6} fill={style.accentColor} rx="2" />
      {/* Label */}
      <text
        x={mid}
        y={panelY1 + 20}
        textAnchor="middle"
        fontSize="10"
        fill={style.productShade}
        opacity="0.7"
        fontFamily="sans-serif"
      >
        Murphy Bed
      </text>

      <LampAndTable style={style} nx={0.88} />
    </g>
  );
}

// ── Platform bed scene ───────────────────────────────────────────────────────

function PlatformScene({ style }: { style: RoomStyleConfig }) {
  // Platform bed: wide, low, centered — no back cushion
  const fl = floorPt(0.14, 0.40);
  const fr = floorPt(0.86, 0.40);
  const bl2 = floorPt(0.14, 0.08);
  const br2 = floorPt(0.86, 0.08);
  const frameH = 12;
  const mattressH = 8;

  // Pillow positions
  const pillows: [number, number][] = [
    [0.25, 0.10],
    [0.45, 0.10],
    [0.65, 0.10],
  ];

  // Night stands
  const nsL = floorPt(0.06, 0.22);
  const nsR = floorPt(0.94, 0.22);

  return (
    <g>
      <Rug style={style} frontNz={0.50} />
      <Plant style={style} />

      {/* Bed frame face */}
      <polygon
        points={rect4(fl[0], fl[1] - frameH, fr[0], fl[1])}
        fill={style.productShade}
        opacity="0.8"
      />
      {/* Bed surface (mattress top) */}
      <polygon points={poly(fl, fr, br2, bl2)} fill={style.productColor} />
      {/* Headboard */}
      <polygon
        points={rect4(bl2[0] - 4, bl2[1] - 40, br2[0] + 4, bl2[1])}
        fill={style.productShade}
        opacity="0.7"
      />
      {/* Mattress front face */}
      <polygon
        points={rect4(fl[0], fl[1] - mattressH - frameH, fr[0], fl[1] - frameH)}
        fill={style.productColor}
        opacity="0.7"
      />
      {/* Pillows */}
      {pillows.map(([nx, nz], i) => {
        const p = floorPt(nx, nz);
        return (
          <ellipse
            key={i}
            cx={p[0]}
            cy={p[1] - mattressH - frameH - 4}
            rx={18}
            ry={8}
            fill={style.accentColor}
            stroke={style.productShade}
            strokeWidth="0.8"
            opacity="0.9"
          />
        );
      })}

      {/* Night stands */}
      {([nsL, nsR] as const).map((ns, i) => (
        <g key={i}>
          <ellipse cx={ns[0]} cy={ns[1]} rx={14} ry={5} fill={style.accentColor} />
          <rect x={ns[0] - 14} y={ns[1] - 5} width={28} height={18} fill={style.accentColor} rx="1" />
        </g>
      ))}

      <LampAndTable style={style} nx={0.88} />
    </g>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const SCENE_LABELS: Record<SceneProduct, string> = {
  futon: "Futon in room",
  murphy: "Murphy bed closed",
  platform: "Platform bed in room",
};

export function RoomSceneViewer() {
  const [activeStyle, setActiveStyle] = useState<RoomStyle>("modern");
  const [activeProduct, setActiveProduct] = useState<SceneProduct>("futon");

  const style = ROOM_STYLES[activeStyle];

  return (
    <div className="space-y-4">
      {/* Style switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-cf-muted uppercase tracking-wide">Style</span>
        {ROOM_STYLE_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveStyle(s)}
            aria-pressed={activeStyle === s}
            className={[
              "rounded-full border px-4 py-1 text-sm font-medium transition-colors",
              activeStyle === s
                ? "border-cf-cta bg-cf-cta text-white"
                : "border-cf-divider bg-white text-cf-ink hover:border-cf-cta/50",
            ].join(" ")}
          >
            {ROOM_STYLES[s].label}
          </button>
        ))}
      </div>

      {/* Product type switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-cf-muted uppercase tracking-wide">Product</span>
        {SCENE_PRODUCTS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveProduct(id)}
            aria-pressed={activeProduct === id}
            className={[
              "rounded-full border px-4 py-1 text-sm font-medium transition-colors",
              activeProduct === id
                ? "border-cf-cta bg-cf-cta text-white"
                : "border-cf-divider bg-white text-cf-ink hover:border-cf-cta/50",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Room scene SVG */}
      <div
        role="img"
        aria-label={SCENE_LABELS[activeProduct]}
        className="overflow-hidden rounded-lg border border-cf-divider bg-cf-sand/10"
      >
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          className="block"
          aria-hidden="true"
        >
          <RoomShell style={style} />
          {activeProduct === "futon" && <FutonScene style={style} />}
          {activeProduct === "murphy" && <MurphyScene style={style} />}
          {activeProduct === "platform" && <PlatformScene style={style} />}
        </svg>
      </div>

      <p className="text-xs text-cf-muted">
        Illustrative scene — furniture placement and finishes are for inspiration only.
        Stop by the showroom to see real frames, fabrics, and mattress options.
      </p>
    </div>
  );
}
