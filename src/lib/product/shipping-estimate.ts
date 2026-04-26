export type ShippingZone = "nc" | "se" | "mid" | "west" | "akhi" | "other";

/**
 * 5-digit US ZIP — strict numeric, no leading/trailing whitespace.
 * Per bead scope: no validation beyond 5-digit format (state/city lookup is
 * out of scope for this slice).
 */
export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/**
 * Map a 5-digit ZIP to a delivery-zone tier.
 *
 * Tiers (keyed off first-3-digit prefix ranges, US carrier SCF bands):
 * - `nc`    : NC-resident (270-289)                         — 1-2 business days
 * - `se`    : SE region ex-NC (300-399)                     — 2-3 business days
 * - `mid`   : Mid-Atlantic + Midwest (200-269, 400-599)     — 3-5 business days
 * - `west`  : West/Mountain (800-899, 900-961)              — 5-7 business days
 * - `akhi`  : AK (995-999) and HI (967-969)                 — 7-10 business days
 * - `other` : outside mapped ranges                         — conservative upper bound
 *
 * Invalid ZIPs should be rejected by `isValidZip` before reaching this
 * function. Returns `"other"` as a safe fallback for unmapped but valid ZIPs
 * (e.g., 00000) rather than throwing — the caller already surfaced the widget
 * and a conservative window is friendlier than a "no data" dead end.
 */
export function getShippingZone(zip: string): ShippingZone {
  const prefix = Number(zip.slice(0, 3));
  if (prefix >= 270 && prefix <= 289) return "nc";
  if (prefix >= 300 && prefix <= 399) return "se";
  if ((prefix >= 200 && prefix <= 269) || (prefix >= 400 && prefix <= 599)) {
    return "mid";
  }
  if ((prefix >= 800 && prefix <= 899) || (prefix >= 900 && prefix <= 961)) {
    return "west";
  }
  if (prefix >= 995 && prefix <= 999) return "akhi";
  if (prefix >= 967 && prefix <= 969) return "akhi";
  return "other";
}

// Service tier mapping. White-glove is in-house WNC delivery (NC zone only);
// the rest of CONUS goes via LTL freight; AK/HI/territories are unsupported
// for large freight items.
export type ShippingService = "white-glove" | "ltl" | "unsupported";

const ZONE_TO_SERVICE: Record<ShippingZone, ShippingService> = {
  nc: "white-glove",
  se: "ltl",
  mid: "ltl",
  west: "ltl",
  akhi: "unsupported",
  // Unmapped-but-valid ZIPs default to LTL — overestimate the upper bound
  // window rather than refuse service.
  other: "ltl",
};

export type EstDays = { min: number; max: number };

const ZONE_EST_DAYS: Record<ShippingZone, EstDays> = {
  nc: { min: 1, max: 2 },
  se: { min: 2, max: 3 },
  mid: { min: 3, max: 5 },
  west: { min: 5, max: 7 },
  akhi: { min: 7, max: 10 },
  // Conservative upper bound — better to overestimate than stand a customer
  // up on Friday. 'other' includes unmapped-but-valid ZIPs (e.g., 00000).
  other: { min: 7, max: 10 },
};

export function getServiceTier(zone: ShippingZone): ShippingService {
  return ZONE_TO_SERVICE[zone];
}

export function getEstDays(zone: ShippingZone): EstDays {
  return ZONE_EST_DAYS[zone];
}

export function isEligible(zone: ShippingZone): boolean {
  return ZONE_TO_SERVICE[zone] !== "unsupported";
}

export function getDeliveryWindow(zone: ShippingZone): string {
  const { min, max } = ZONE_EST_DAYS[zone];
  return `${min}-${max} business days`;
}
