import { describe, it, expect } from "vitest";

import {
  getShippingTier,
  getShippingZone,
  getDeliveryWindow,
  isValidZip,
  PARCEL_MAX_LBS,
  FREIGHT_MIN_LBS,
  type ShippingTier,
  type ShippingZone,
} from "@/lib/product/shipping-estimate";

describe("isValidZip", () => {
  it("accepts 5-digit strings", () => {
    expect(isValidZip("28801")).toBe(true);
    expect(isValidZip("00000")).toBe(true);
    expect(isValidZip("99999")).toBe(true);
  });

  it("rejects non-5-digit strings", () => {
    expect(isValidZip("1234")).toBe(false);
    expect(isValidZip("123456")).toBe(false);
    expect(isValidZip("")).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(isValidZip("abcde")).toBe(false);
    expect(isValidZip("12 34")).toBe(false);
    expect(isValidZip("1234a")).toBe(false);
  });

  it("rejects null/undefined-ish inputs", () => {
    expect(isValidZip("  28801  ")).toBe(false);
  });
});

describe("getShippingZone", () => {
  it("returns 'nc' for NC ZIPs (270-289 range)", () => {
    expect(getShippingZone("28801")).toBe<ShippingZone>("nc");
    expect(getShippingZone("27601")).toBe<ShippingZone>("nc");
    expect(getShippingZone("28601")).toBe<ShippingZone>("nc");
  });

  it("returns 'se' for SE region ZIPs (300-399 range, excluding NC)", () => {
    expect(getShippingZone("30301")).toBe<ShippingZone>("se"); // GA
    expect(getShippingZone("32801")).toBe<ShippingZone>("se"); // FL
    expect(getShippingZone("37201")).toBe<ShippingZone>("se"); // TN
  });

  it("returns 'mid' for Mid-Atlantic/Midwest ZIPs (200-269, 400-599 range)", () => {
    expect(getShippingZone("20001")).toBe<ShippingZone>("mid"); // DC
    expect(getShippingZone("45202")).toBe<ShippingZone>("mid"); // OH
    expect(getShippingZone("55101")).toBe<ShippingZone>("mid"); // MN
  });

  it("returns 'west' for West/Mountain ZIPs (800-899, 900-961 range)", () => {
    expect(getShippingZone("80202")).toBe<ShippingZone>("west"); // CO
    expect(getShippingZone("90210")).toBe<ShippingZone>("west"); // CA
    expect(getShippingZone("85001")).toBe<ShippingZone>("west"); // AZ
  });

  it("returns 'akhi' for AK/HI ZIPs (967-969, 995-999)", () => {
    expect(getShippingZone("99501")).toBe<ShippingZone>("akhi"); // AK
    expect(getShippingZone("96801")).toBe<ShippingZone>("akhi"); // HI
  });

  it("returns 'other' for ZIPs outside mapped tiers (edge 00000)", () => {
    expect(getShippingZone("00000")).toBe<ShippingZone>("other");
  });
});

describe("getShippingTier", () => {
  it("returns white-glove for NC regardless of weight", () => {
    expect(getShippingTier(0, "nc")).toBe<ShippingTier>("white-glove");
    expect(getShippingTier(20, "nc")).toBe<ShippingTier>("white-glove");
    expect(getShippingTier(600, "nc")).toBe<ShippingTier>("white-glove");
  });

  it("returns unsupported for AK/HI and territories", () => {
    expect(getShippingTier(20, "akhi")).toBe<ShippingTier>("unsupported");
    expect(getShippingTier(20, "territory")).toBe<ShippingTier>("unsupported");
  });

  it(`returns parcel for weight 1–${PARCEL_MAX_LBS - 1} lbs (CONUS)`, () => {
    expect(getShippingTier(1, "se")).toBe<ShippingTier>("parcel");
    expect(getShippingTier(20, "west")).toBe<ShippingTier>("parcel");
    expect(getShippingTier(PARCEL_MAX_LBS - 1, "mid")).toBe<ShippingTier>("parcel");
  });

  it(`returns ltl for weight ${PARCEL_MAX_LBS}–${FREIGHT_MIN_LBS - 1} lbs (CONUS)`, () => {
    expect(getShippingTier(PARCEL_MAX_LBS, "se")).toBe<ShippingTier>("ltl");
    expect(getShippingTier(150, "west")).toBe<ShippingTier>("ltl");
    expect(getShippingTier(FREIGHT_MIN_LBS - 1, "mid")).toBe<ShippingTier>("ltl");
  });

  it(`returns freight for weight >= ${FREIGHT_MIN_LBS} lbs (CONUS)`, () => {
    expect(getShippingTier(FREIGHT_MIN_LBS, "se")).toBe<ShippingTier>("freight");
    expect(getShippingTier(600, "west")).toBe<ShippingTier>("freight");
  });

  it("returns freight when palletized regardless of weight", () => {
    expect(getShippingTier(20, "se", true)).toBe<ShippingTier>("freight");
    expect(getShippingTier(0, "west", true)).toBe<ShippingTier>("freight");
  });

  it("returns ltl for weight=0 (unknown weight — safe default)", () => {
    expect(getShippingTier(0, "se")).toBe<ShippingTier>("ltl");
    expect(getShippingTier(0, "west")).toBe<ShippingTier>("ltl");
  });
});

describe("getDeliveryWindow", () => {
  it("returns '1-2 business days' for NC zone", () => {
    expect(getDeliveryWindow("nc")).toMatch(/1.2 business days/i);
  });

  it("returns '2-3 business days' for SE zone", () => {
    expect(getDeliveryWindow("se")).toMatch(/2.3 business days/i);
  });

  it("returns '3-5 business days' for Mid zone", () => {
    expect(getDeliveryWindow("mid")).toMatch(/3.5 business days/i);
  });

  it("returns '5-7 business days' for West zone", () => {
    expect(getDeliveryWindow("west")).toMatch(/5.7 business days/i);
  });

  it("returns '7-10 business days' for AK/HI zone", () => {
    expect(getDeliveryWindow("akhi")).toMatch(/7.10 business days/i);
  });

  it("returns a fallback range for 'other' zone", () => {
    // 'other' claims a conservative upper-bound range so we never undersell
    // (better to overestimate than stand a customer up on Friday).
    expect(getDeliveryWindow("other")).toMatch(/business days/i);
  });
});
