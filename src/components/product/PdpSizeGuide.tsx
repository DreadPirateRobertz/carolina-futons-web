"use client";

import { useId, useState } from "react";

import {
  checkRoomFit,
  convertDimensions,
  type CareGuide,
  type ProductDimensions,
  type RoomFitVerdict,
} from "@/lib/product/size-guide";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PdpSizeGuideProps = {
  productName: string;
  dimensions: ProductDimensions | null;
  careGuide?: CareGuide | null;
};

type Unit = "in" | "cm";

// ── SVG helpers ───────────────────────────────────────────────────────────────

function fmt(val: number | null, unit: Unit): string {
  if (val === null) return "—";
  return `${val}${unit === "cm" ? " cm" : '"'}`;
}

function DimensionDiagram({
  dims,
  unit,
  position,
}: {
  dims: ProductDimensions;
  unit: Unit;
  position: "closed" | "open";
}) {
  const uid = useId().replace(/:/g, "");
  const pos = position === "open" ? dims.open : dims.closed;
  const w = fmt(pos.width, unit);
  const d = fmt(pos.depth, unit);
  const h = fmt(pos.height, unit);
  const ariaLabel = `Dimension diagram — ${position} position: ${w} wide, ${d} deep, ${h} high`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 200"
      role="img"
      aria-label={ariaLabel}
      className="w-full max-w-xs"
    >
      <style>{`text{font-family:inherit;font-size:12px;fill:#2C1A0E;}`}</style>
      {/* furniture box */}
      <rect x="50" y="40" width="200" height="120" fill="none" stroke="#2C1A0E" strokeWidth="1.5" rx="4" />
      {/* width arrow */}
      <line x1="50" y1="178" x2="250" y2="178" stroke="#2C1A0E" strokeWidth="1.2" markerStart={`url(#${uid}al)`} markerEnd={`url(#${uid}ar)`} />
      <text x="150" y="194" textAnchor="middle">{w} W</text>
      {/* height arrow */}
      <line x1="268" y1="40" x2="268" y2="160" stroke="#2C1A0E" strokeWidth="1.2" markerStart={`url(#${uid}au)`} markerEnd={`url(#${uid}ad)`} />
      <text x="278" y="104" textAnchor="start">{h} H</text>
      {/* depth arrow */}
      <line x1="50" y1="22" x2="250" y2="22" stroke="#2C1A0E" strokeWidth="1.2" markerStart={`url(#${uid}al)`} markerEnd={`url(#${uid}ar)`} />
      <text x="150" y="16" textAnchor="middle">{d} D</text>
      <defs>
        <marker id={`${uid}ar`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#2C1A0E" /></marker>
        <marker id={`${uid}al`} markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto"><path d="M8,0 L0,3 L8,6" fill="#2C1A0E" /></marker>
        <marker id={`${uid}au`} markerWidth="6" markerHeight="8" refX="3" refY="0" orient="auto"><path d="M0,8 L3,0 L6,8" fill="#2C1A0E" /></marker>
        <marker id={`${uid}ad`} markerWidth="6" markerHeight="8" refX="3" refY="8" orient="auto"><path d="M0,0 L3,8 L6,0" fill="#2C1A0E" /></marker>
      </defs>
    </svg>
  );
}

// ── RoomFitChecker ────────────────────────────────────────────────────────────

const VERDICT_STYLES: Record<RoomFitVerdict, string> = {
  fits: "bg-green-50 text-green-800 border-green-200",
  tight: "bg-amber-50 text-amber-800 border-amber-200",
  "no-fit": "bg-red-50 text-red-800 border-red-200",
  unknown: "bg-cf-sand/30 text-cf-espresso/70 border-cf-sand",
};

const VERDICT_ICONS: Record<RoomFitVerdict, string> = {
  fits: "✓",
  tight: "⚠",
  "no-fit": "✗",
  unknown: "?",
};

const CM_PER_IN = 2.54;

function RoomFitChecker({ dims, unit }: { dims: ProductDimensions; unit: Unit }) {
  const widthId = useId();
  const depthId = useId();
  const resultId = useId();

  const [roomWidth, setRoomWidth] = useState("");
  const [roomDepth, setRoomDepth] = useState("");
  const [result, setResult] = useState<ReturnType<typeof checkRoomFit> | null>(null);
  const [error, setError] = useState("");

  const unitLabel = unit === "cm" ? "centimetres" : "inches";
  const placeholder = unit === "cm" ? "e.g. 305" : "e.g. 120";

  const handleCheck = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const w = parseFloat(roomWidth);
    const d = parseFloat(roomDepth);
    if (!Number.isFinite(w) || !Number.isFinite(d) || w <= 0 || d <= 0) {
      setError("Enter positive numbers for both width and depth.");
      setResult(null);
      return;
    }
    setError("");
    // checkRoomFit always works in inches — convert if user is in cm mode
    const toIn = (v: number) => unit === "cm" ? v / CM_PER_IN : v;
    setResult(checkRoomFit(dims, toIn(w), toIn(d)));
  };

  return (
    <div data-slot="room-fit-checker">
      <h3 className="text-sm font-semibold text-cf-espresso mb-3">Will It Fit?</h3>
      <form onSubmit={handleCheck} className="space-y-3" aria-label="Room fit checker">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={widthId} className="text-xs text-cf-espresso/70">
              Room width ({unit})
            </label>
            <input
              id={widthId}
              type="number"
              min="1"
              max="9999"
              step="1"
              value={roomWidth}
              onChange={(e) => setRoomWidth(e.target.value)}
              placeholder={placeholder}
              className="w-28 rounded border border-cf-sand px-2 py-1.5 text-sm"
              aria-label={`Room width in ${unitLabel}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={depthId} className="text-xs text-cf-espresso/70">
              Room depth ({unit})
            </label>
            <input
              id={depthId}
              type="number"
              min="1"
              max="9999"
              step="1"
              value={roomDepth}
              onChange={(e) => setRoomDepth(e.target.value)}
              placeholder={placeholder}
              className="w-28 rounded border border-cf-sand px-2 py-1.5 text-sm"
              aria-label={`Room depth in ${unitLabel}`}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded bg-cf-espresso px-4 py-1.5 text-sm font-medium text-white hover:bg-cf-espresso/90"
            >
              Check Fit
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div
          id={resultId}
          role="status"
          aria-live="polite"
          className={`mt-3 rounded border px-3 py-2 text-sm ${VERDICT_STYLES[result.verdict]}`}
          data-testid="room-fit-result"
          data-verdict={result.verdict}
        >
          <span aria-hidden="true" className="mr-1.5 font-bold">
            {VERDICT_ICONS[result.verdict]}
          </span>
          {result.message}
        </div>
      )}
    </div>
  );
}

// ── DimensionGrid ─────────────────────────────────────────────────────────────

function DimensionGrid({
  dims,
  unit,
}: {
  dims: ProductDimensions;
  unit: Unit;
}) {
  const d = dims.unit === unit ? dims : convertDimensions(dims, unit);
  const u = unit;

  const rows: Array<{ label: string; value: string }> = [
    {
      label: "Closed (sofa)",
      value: `${fmt(d.closed.width, u)} W × ${fmt(d.closed.depth, u)} D × ${fmt(d.closed.height, u)} H`,
    },
    {
      label: "Open (bed)",
      value: `${fmt(d.open.width, u)} W × ${fmt(d.open.depth, u)} D × ${fmt(d.open.height, u)} H`,
    },
  ];

  if (d.seatHeight !== null) {
    rows.push({ label: "Seat height", value: fmt(d.seatHeight, u) });
  }
  if (d.weight !== null) {
    rows.push({ label: "Weight", value: `${d.weight} lbs` });
  }
  if (d.mattressSize) {
    rows.push({ label: "Mattress size", value: d.mattressSize });
  }

  return (
    <dl className="divide-y divide-cf-sand/40 text-sm" data-slot="dimension-grid">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4 py-2">
          <dt className="text-cf-espresso/70">{row.label}</dt>
          <dd className="font-medium text-cf-espresso">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── PdpSizeGuide (main export) ────────────────────────────────────────────────

export function PdpSizeGuide({ productName, dimensions, careGuide }: PdpSizeGuideProps) {
  const [unit, setUnit] = useState<Unit>("in");
  const [diagramPosition, setDiagramPosition] = useState<"closed" | "open">("closed");
  const inchesId = useId();
  const cmId = useId();

  if (!dimensions) {
    return (
      <section
        aria-label="Product dimensions"
        data-slot="pdp-size-guide"
        className="mt-16 max-w-2xl rounded-lg border border-cf-sand/60 bg-cf-sand/10 p-5"
      >
        <h2 className="font-heading text-base font-semibold text-cf-espresso mb-2">
          Dimensions
        </h2>
        <p className="text-sm text-cf-espresso/60">Dimensions coming soon for this product.</p>
      </section>
    );
  }

  return (
    <section
      aria-label={`Dimensions — ${productName}`}
      data-slot="pdp-size-guide"
      className="mt-16 max-w-2xl space-y-6 rounded-lg border border-cf-sand/60 bg-cf-sand/10 p-5"
    >
      {/* Header + unit toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-cf-espresso">
          Dimensions — {productName}
        </h2>
        <fieldset className="flex items-center gap-1 rounded-full border border-cf-sand bg-white px-1 py-0.5 text-xs">
          <legend className="sr-only">Measurement unit</legend>
          <label
            htmlFor={inchesId}
            className={`cursor-pointer rounded-full px-2.5 py-0.5 transition-colors ${unit === "in" ? "bg-cf-espresso text-white" : "text-cf-espresso/70 hover:text-cf-espresso"}`}
          >
            <input
              id={inchesId}
              type="radio"
              name="unit"
              value="in"
              checked={unit === "in"}
              onChange={() => setUnit("in")}
              className="sr-only"
            />
            Inches
          </label>
          <label
            htmlFor={cmId}
            className={`cursor-pointer rounded-full px-2.5 py-0.5 transition-colors ${unit === "cm" ? "bg-cf-espresso text-white" : "text-cf-espresso/70 hover:text-cf-espresso"}`}
          >
            <input
              id={cmId}
              type="radio"
              name="unit"
              value="cm"
              checked={unit === "cm"}
              onChange={() => setUnit("cm")}
              className="sr-only"
            />
            Centimeters
          </label>
        </fieldset>
      </div>

      {/* Dimension grid */}
      <DimensionGrid dims={dimensions} unit={unit} />

      {/* SVG diagram with position toggle */}
      <div className="space-y-2">
        <div className="flex gap-2" role="group" aria-label="Diagram position">
          {(["closed", "open"] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setDiagramPosition(pos)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                diagramPosition === pos
                  ? "bg-cf-espresso text-white"
                  : "border border-cf-sand text-cf-espresso/70 hover:text-cf-espresso"
              }`}
              aria-pressed={diagramPosition === pos}
            >
              {pos === "closed" ? "Sofa (closed)" : "Bed (open)"}
            </button>
          ))}
        </div>
        <DimensionDiagram dims={dimensions} unit={unit} position={diagramPosition} />
      </div>

      {/* Room-fit checker */}
      <RoomFitChecker dims={dimensions} unit={unit} />

      {/* Care guide inline (if available) */}
      {careGuide && (
        <div data-slot="care-guide-inline" className="border-t border-cf-sand/40 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-cf-espresso capitalize">
            {careGuide.material !== "unknown" ? `${careGuide.material} Care Guide` : "Care Guide"}
          </h3>
          {careGuide.cleaningMethod && (
            <div>
              <p className="text-xs font-medium text-cf-espresso/70 uppercase tracking-wide mb-1">Cleaning</p>
              <p className="text-sm text-cf-espresso/80 whitespace-pre-line">{careGuide.cleaningMethod}</p>
            </div>
          )}
          {careGuide.maintenanceTips && (
            <div>
              <p className="text-xs font-medium text-cf-espresso/70 uppercase tracking-wide mb-1">Maintenance</p>
              <p className="text-sm text-cf-espresso/80 whitespace-pre-line">{careGuide.maintenanceTips}</p>
            </div>
          )}
          {careGuide.warningNotes && (
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">⚠ Warnings</p>
              <p className="text-sm text-cf-espresso/80 whitespace-pre-line">{careGuide.warningNotes}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
