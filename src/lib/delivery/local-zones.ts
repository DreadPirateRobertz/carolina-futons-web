// cf-3qt.4.4: port of the Velo localZones system from
// crew/rennala/src/public/sharedTokens.js (shippingConfig.localZones) and the
// matchLocalZone helper from crew/rennala/src/backend/utils/shippingZones.js.
//
// The Velo source is the source of truth for in-house truck-delivery zones
// — UPS/FedEx tier mapping lives separately in src/lib/product/shipping-
// estimate.ts and serves the PDP shipping widget. This module powers the
// /getting-it-home page where customers check whether CF delivers to them.
//
// Match logic (per zone, evaluated in order; first match wins):
//   1. exact ZIP in zone.zips → match
//   2. zip3 prefix in zone.zip3Prefixes AND state in zone.states → match
//   3. fall through to next zone
//
// State is optional (a stand-alone ZIP look-up still works for zone1 since
// zone1 uses exact-zip matching). When the caller supplies a state, the
// zip3-prefix branch becomes available for zones 2-4.

export type LocalZoneCode = "zone1" | "zone2" | "zone3" | "zone4";

export type LocalZone = {
  code: LocalZoneCode;
  name: string;
  description: string;
  zips: ReadonlyArray<string>;
  zip3Prefixes: ReadonlyArray<number>;
  states: ReadonlyArray<string>;
  delivery: number;
  whiteGlove: number;
  deliveryDays: string;
};

export const LOCAL_ZONES: ReadonlyArray<LocalZone> = [
  {
    code: "zone1",
    name: "Store Local",
    description: "Hendersonville & immediate WNC (~0–30 mi)",
    zips: [
      "28792", "28791", // Hendersonville core
      "28739", "28742", // Flat Rock, Horse Shoe
      "28731", "28756", // Edneyville, Saluda
      "28732", "28726", "28759", // Fletcher, Mills River
      "28712", "28766", // Brevard, Pisgah Forest
      "28748", // Leicester (near Asheville)
    ],
    zip3Prefixes: [],
    states: ["NC"],
    delivery: 39,
    whiteGlove: 99,
    deliveryDays: "2–4",
  },
  {
    code: "zone2",
    name: "WNC Extended",
    description: "Asheville metro, WNC mountains, Upstate SC (~30–100 mi)",
    zips: [],
    zip3Prefixes: [287, 288, 289, 293, 294, 296, 297],
    states: ["NC", "SC"],
    delivery: 69,
    whiteGlove: 149,
    deliveryDays: "3–5",
  },
  {
    code: "zone3",
    name: "Southeast Regional",
    description: "Charlotte, Raleigh, Columbia, Atlanta, Knoxville (~100–250 mi)",
    zips: [],
    zip3Prefixes: [
      270, 271, 272, 273, 274, 275, 276, 277, 278, 279,
      280, 281, 282, 283, 284, 285, 286,
      290, 291, 292, 295, 298, 299,
      300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310,
      376, 377, 378, 379,
    ],
    states: ["NC", "SC", "GA", "TN"],
    delivery: 99,
    whiteGlove: 199,
    deliveryDays: "5–7",
  },
  {
    code: "zone4",
    name: "Extended Southeast",
    description: "Deep GA, Nashville, Richmond, Roanoke (~250+ mi)",
    zips: [],
    zip3Prefixes: [
      311, 312, 313, 314, 315, 316, 317, 318, 319,
      370, 371, 372, 373, 374, 375, 380, 381, 382, 383, 384, 385,
      220, 221, 222, 223, 224, 225, 226, 227, 228, 229,
      230, 231, 232, 233, 234, 235, 236, 237, 238, 239,
      240, 241, 242, 243, 244, 245, 246,
    ],
    states: ["GA", "TN", "VA"],
    delivery: 149,
    whiteGlove: 249,
    deliveryDays: "7–10",
  },
];

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

export function matchLocalZone(
  zip: string,
  state?: string,
): LocalZone | null {
  if (!isValidZip(zip)) return null;
  const zip3 = Number.parseInt(zip.slice(0, 3), 10);
  const stateUpper = state?.toUpperCase().trim();
  for (const zone of LOCAL_ZONES) {
    if (zone.zips.includes(zip)) return zone;
    if (
      stateUpper &&
      zone.zip3Prefixes.includes(zip3) &&
      zone.states.includes(stateUpper)
    ) {
      return zone;
    }
  }
  return null;
}

// Lightweight ZIP→state inference for the Server Action: when the customer
// only types a ZIP, we still want to surface "Asheville is in zone 2" without
// requiring them to also type "NC". The mapping is a coarse SCF-band lookup
// — sufficient for the AC three test cases and a friendly default. A
// production zone-resolver would call a USPS or Wix Maps API; that lives in
// /api/delivery-zone (godfrey owns it).
export function inferStateFromZip(zip: string): string | null {
  if (!isValidZip(zip)) return null;
  const zip3 = Number.parseInt(zip.slice(0, 3), 10);
  // North Carolina: 270-289
  if (zip3 >= 270 && zip3 <= 289) return "NC";
  // South Carolina: 290-299
  if (zip3 >= 290 && zip3 <= 299) return "SC";
  // Georgia: 300-319, 398-399
  if ((zip3 >= 300 && zip3 <= 319) || zip3 === 398 || zip3 === 399) return "GA";
  // Tennessee: 370-385
  if (zip3 >= 370 && zip3 <= 385) return "TN";
  // Virginia: 220-246
  if (zip3 >= 220 && zip3 <= 246) return "VA";
  return null;
}
