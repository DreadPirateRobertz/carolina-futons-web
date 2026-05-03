"use client";

import { useId, useState } from "react";

import {
  getEstDays,
  getShippingTier,
  getShippingZone,
  isValidZip,
  type ShippingTier,
} from "@/lib/product/shipping-estimate";

type ResultState =
  | { kind: "idle" }
  | { kind: "ok"; zip: string; tier: ShippingTier; window: string }
  | { kind: "error"; message: string };

const TIER_COPY: Record<ShippingTier, string> = {
  parcel: "Ships UPS Ground",
  ltl: "Ships LTL freight",
  freight: "Ships full pallet freight",
  "white-glove": "Free white-glove delivery",
  unsupported: "Outside our delivery area",
};

export type PdpShippingEstimateProps = {
  weightLbs?: number;
  palletized?: boolean;
};

export function PdpShippingEstimate({
  weightLbs = 0,
  palletized = false,
}: PdpShippingEstimateProps) {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<ResultState>({ kind: "idle" });

  const inputId = useId();
  const resultId = useId();
  const errorId = useId();

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = zip.trim();
    if (!isValidZip(trimmed)) {
      setResult({ kind: "error", message: "Please enter a 5-digit ZIP." });
      return;
    }
    const zone = getShippingZone(trimmed);
    const tier = getShippingTier(weightLbs, zone, palletized);
    const { min, max } = getEstDays(zone);
    setResult({ kind: "ok", zip: trimmed, tier, window: `${min}-${max} business days` });
  };

  // aria-describedby points at whichever message is currently live (status or
  // alert), so screen readers announce the result/error tied to the input.
  const describedBy =
    result.kind === "ok" ? resultId : result.kind === "error" ? errorId : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2"
      data-slot="pdp-shipping-estimate"
    >
      <label htmlFor={inputId} className="block text-sm font-medium text-cf-espresso">
        ZIP code
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          aria-describedby={describedBy}
          className="w-32 rounded-md border border-cf-sand px-3 py-2 text-sm"
          placeholder="28801"
        />
        <button
          type="submit"
          className="rounded-md bg-cf-espresso px-4 py-2 text-sm font-medium text-white hover:bg-cf-espresso/90"
        >
          Estimate
        </button>
      </div>
      {result.kind === "ok" && (
        // role=status so the SR announces the delivery window as a live
        // region without moving focus. Mirrors the PdpStockBadge contract.
        <p
          id={resultId}
          role="status"
          className="text-sm text-cf-espresso"
          data-testid="pdp-shipping-result"
        >
          {TIER_COPY[result.tier]} — delivers in {result.window} to {result.zip}.
        </p>
      )}
      {result.kind === "error" && (
        <p id={errorId} role="alert" className="text-sm text-cf-error">
          {result.message}
        </p>
      )}
    </form>
  );
}
