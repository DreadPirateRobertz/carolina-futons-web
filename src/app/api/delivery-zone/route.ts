// /api/delivery-zone — ZIP → service-tier classification.
//
// Wire contract (DeliveryZoneOk | DeliveryZoneError, single `ok` discriminant):
//   200 {ok:true, zip, zone, eligible, service, tier, estDays:{min,max}, label}
//   400 {ok:false, error: "missing-zip" | "invalid-zip" | "invalid-json"}
//
// Optional params (GET query string or POST body):
//   weight     — product shipping weight in lbs (number); omit → ltl default
//   palletized — boolean; true → freight regardless of weight
//
// Error code semantics (matters: client switches on `error` to pick UI copy):
//   "missing-zip"  — zip field absent / empty / non-string
//   "invalid-zip"  — zip present but fails 5-digit check
//   "invalid-json" — POST body could not be parsed as JSON (POST only)
//
// Classification logic lives in src/lib/product/shipping-estimate.ts so the
// PdpShippingEstimate widget and this route share one source of truth.

import { NextResponse } from "next/server";

import {
  getEstDays,
  getServiceTier,
  getShippingTier,
  getShippingZone,
  isEligible,
  isValidZip,
  type ShippingTier,
} from "@/lib/product/shipping-estimate";
import type {
  DeliveryZoneError,
  DeliveryZoneOk,
} from "@/lib/shipping/delivery-zone-types";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<ShippingTier, string> = {
  parcel: "Ships UPS Ground",
  ltl: "LTL freight delivery",
  freight: "Full pallet freight",
  "white-glove": "Free white-glove delivery",
  unsupported: "Outside our delivery area",
};

type LookupParams = {
  zip: unknown;
  weightLbs?: number;
  palletized?: boolean;
};

function lookup({ zip, weightLbs = 0, palletized = false }: LookupParams): DeliveryZoneOk | DeliveryZoneError {
  if (typeof zip !== "string" || zip.length === 0) {
    return { ok: false, error: "missing-zip" };
  }
  const trimmed = zip.trim();
  if (!isValidZip(trimmed)) {
    return { ok: false, error: "invalid-zip" };
  }
  const zone = getShippingZone(trimmed);
  const service = getServiceTier(zone);
  const tier = getShippingTier(weightLbs, zone, palletized);
  return {
    ok: true,
    zip: trimmed,
    zone,
    eligible: isEligible(zone),
    service,
    tier,
    estDays: getEstDays(zone),
    label: TIER_LABEL[tier],
  };
}

function parseWeight(raw: string | null): number {
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parsePalletized(raw: string | null): boolean {
  return raw === "true" || raw === "1";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = lookup({
    zip: url.searchParams.get("zip"),
    weightLbs: parseWeight(url.searchParams.get("weight")),
    palletized: parsePalletized(url.searchParams.get("palletized")),
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Distinct from "missing-zip" so a misconfigured integrator gets a
    // diagnostic error string instead of being told to add a zip field.
    return NextResponse.json(
      { ok: false, error: "invalid-json" } satisfies DeliveryZoneError,
      { status: 400 },
    );
  }
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawWeight = typeof obj.weight === "number" ? obj.weight : 0;
  const weightLbs = Number.isFinite(rawWeight) && rawWeight >= 0 ? rawWeight : 0;
  const result = lookup({
    zip: obj.zip,
    weightLbs,
    palletized: obj.palletized === true,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
