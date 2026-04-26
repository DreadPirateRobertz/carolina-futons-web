// /api/delivery-zone — ZIP → service-tier classification.
//
// Wire contract (DeliveryZoneOk | DeliveryZoneError, single `ok` discriminant):
//   200 {ok:true, zip, zone, eligible, service, estDays:{min,max}, label}
//   400 {ok:false, error: "missing-zip" | "invalid-zip" | "invalid-json"}
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
  getShippingZone,
  isEligible,
  isValidZip,
  type EstDays,
  type ShippingService,
  type ShippingZone,
} from "@/lib/product/shipping-estimate";

export const dynamic = "force-dynamic";

type DeliveryZoneOk = {
  ok: true;
  zip: string;
  zone: ShippingZone;
  eligible: boolean;
  service: ShippingService;
  estDays: EstDays;
  label: string;
};

type DeliveryZoneError = {
  ok: false;
  error: "missing-zip" | "invalid-zip" | "invalid-json";
};

const SERVICE_LABEL: Record<ShippingService, string> = {
  "white-glove": "Free white-glove delivery",
  ltl: "LTL freight delivery",
  unsupported: "Outside our delivery area",
};

function lookup(zip: unknown): DeliveryZoneOk | DeliveryZoneError {
  if (typeof zip !== "string" || zip.length === 0) {
    return { ok: false, error: "missing-zip" };
  }
  const trimmed = zip.trim();
  if (!isValidZip(trimmed)) {
    return { ok: false, error: "invalid-zip" };
  }
  const zone = getShippingZone(trimmed);
  const service = getServiceTier(zone);
  return {
    ok: true,
    zip: trimmed,
    zone,
    eligible: isEligible(zone),
    service,
    estDays: getEstDays(zone),
    label: SERVICE_LABEL[service],
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = lookup(url.searchParams.get("zip"));
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
  const zip =
    body && typeof body === "object" && "zip" in body
      ? (body as { zip?: unknown }).zip
      : undefined;
  const result = lookup(zip);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
