export type ShippingZone =
  | "nc"
  | "se"
  | "mid"
  | "west"
  | "akhi"
  | "territory"
  | "other";

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
 * Tiers (keyed off first-3-digit USPS prefix ranges; product-defined, not
 * literal SCF bands):
 * - `nc`        : statewide NC (270-289)                          — 1-2 days
 * - `se`        : SE region ex-NC (300-399)                       — 2-3 days
 * - `mid`       : Mid-Atlantic + Midwest (200-269, 400-599)       — 3-5 days
 * - `west`      : West/Mountain (800-899, 900-961)                — 5-7 days
 * - `akhi`      : AK (995-999) + HI (967-969)                     — unsupported
 * - `territory` : PR (006-009), USVI (008), APO/FPO (090-098,     — unsupported
 *                 340, 962-966), GU/AS/MP (969 outside HI subset)
 * - `other`     : outside mapped ranges                           — conservative upper bound
 *
 * Invalid ZIPs should be rejected by `isValidZip` before reaching this
 * function. Returns `"other"` as a safe fallback for unmapped CONUS-shaped
 * ZIPs (e.g., 00000 typos) — refusing service silently would dead-end the
 * caller; classifying as `other` keeps the widget responsive and lets
 * downstream branch on the explicit zone string if it grows real fulfillment
 * meaning.
 */
export function getShippingZone(zip: string): ShippingZone {
  const prefix = Number(zip.slice(0, 3));
  // US territories + APO/FPO/DPO must be checked BEFORE the generic
  // CONUS bands — these prefixes overlap our `mid`/`west`/`other` ranges
  // (e.g. 340 sits inside the 300-399 SE band) but freight cannot reach
  // them. Misclassifying as eligible:true would ship a delivery promise
  // we can't keep.
  if (prefix >= 6 && prefix <= 9) return "territory";       // PR / USVI
  if (prefix >= 90 && prefix <= 98) return "territory";     // APO/FPO Europe + Pacific
  if (prefix === 340) return "territory";                   // APO Americas + USVI subset
  if (prefix >= 962 && prefix <= 966) return "territory";   // APO/FPO Pacific (excl. HI 967-969)
  if (prefix >= 270 && prefix <= 289) return "nc";
  if (prefix >= 300 && prefix <= 399) return "se";
  if ((prefix >= 200 && prefix <= 269) || (prefix >= 400 && prefix <= 599)) {
    return "mid";
  }
  if ((prefix >= 800 && prefix <= 899) || (prefix >= 900 && prefix <= 961)) {
    return "west";
  }
  if ((prefix >= 995 && prefix <= 999) || (prefix >= 967 && prefix <= 969)) {
    return "akhi";
  }
  return "other";
}

// Service tier mapping. `white-glove` is in-house statewide-NC delivery;
// CONUS outside NC goes via LTL freight; AK/HI/territories are unsupported
// for large freight items.
export type ShippingService = "white-glove" | "ltl" | "unsupported";

const ZONE_TO_SERVICE: Record<ShippingZone, ShippingService> = {
  nc: "white-glove",
  se: "ltl",
  mid: "ltl",
  west: "ltl",
  akhi: "unsupported",
  territory: "unsupported",
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
  // Unsupported zones still expose a window to keep the response shape
  // uniform across consumers; callers should branch on `eligible` /
  // `service === 'unsupported'` rather than displaying these as a promise.
  akhi: { min: 7, max: 10 },
  territory: { min: 7, max: 10 },
  // Conservative upper bound — better to overestimate than stand a customer
  // up on Friday. 'other' includes unmapped-but-valid ZIPs (e.g., 00000).
  other: { min: 7, max: 10 },
};

export function getServiceTier(zone: ShippingZone): ShippingService {
  return ZONE_TO_SERVICE[zone];
}

// Returned object is a fresh shallow copy so callers can't mutate the
// module-level table. Cheap — two-key object — and avoids a class of
// hard-to-trace bugs if a UI consumer ever does `est.max += 1` for padding.
export function getEstDays(zone: ShippingZone): EstDays {
  return { ...ZONE_EST_DAYS[zone] };
}

// Convenience derivation kept on the wire payload alongside `service`:
// cart + banner + PDP all gate display copy on "can we ship at all", and
// `eligible` is fewer characters and more obvious than `service !==
// 'unsupported'` at every consumer.
export function isEligible(zone: ShippingZone): boolean {
  return ZONE_TO_SERVICE[zone] !== "unsupported";
}

export function getDeliveryWindow(zone: ShippingZone): string {
  const { min, max } = ZONE_EST_DAYS[zone];
  return `${min}-${max} business days`;
}
