// cfw-n9y: coverage for src/lib/swatch-request/swatch-request-schema.ts.
// The four pure validators back the swatch request flow — Server Action
// + client form share these rules so field names and error copy stay in
// sync. Pinning the contract here so any drift fails CI.

import { describe, it, expect } from "vitest";

import {
  coerceSwatchContactInfo,
  hasSwatchContactErrors,
  US_STATES,
  validateSwatchContactInfo,
  validateSwatchIds,
  type SwatchContactInfo,
} from "@/lib/swatch-request/swatch-request-schema";

const VALID: SwatchContactInfo = {
  firstName: "Brenda",
  lastName: "Smith",
  email: "brenda@example.com",
  address1: "123 Main St",
  city: "Hendersonville",
  state: "NC",
  zip: "28792",
};

describe("coerceSwatchContactInfo", () => {
  it("trims whitespace and lowercases the email", () => {
    const out = coerceSwatchContactInfo({
      email: "  Brenda@Example.COM  ",
    });
    expect(out.email).toBe("brenda@example.com");
  });

  it("trims names without lowercasing them", () => {
    const out = coerceSwatchContactInfo({
      firstName: "  Brenda  ",
      lastName: "  Smith  ",
    });
    expect(out.firstName).toBe("Brenda");
    expect(out.lastName).toBe("Smith");
  });

  it("converts empty phone string to undefined", () => {
    expect(coerceSwatchContactInfo({ phone: "   " }).phone).toBeUndefined();
  });

  it("preserves a real phone string trimmed", () => {
    expect(coerceSwatchContactInfo({ phone: "  828-555-0101  " }).phone).toBe(
      "828-555-0101",
    );
  });

  it("converts empty address2 to undefined", () => {
    expect(coerceSwatchContactInfo({ address2: "" }).address2).toBeUndefined();
  });

  it("preserves a real address2 trimmed", () => {
    expect(coerceSwatchContactInfo({ address2: "  Apt 4B  " }).address2).toBe(
      "Apt 4B",
    );
  });

  it("accepts a state in US_STATES", () => {
    expect(coerceSwatchContactInfo({ state: "NC" }).state).toBe("NC");
  });

  it("rejects an unknown state with empty string", () => {
    // 'XX' isn't a US state — coerce drops it to "" so validate can flag it.
    expect(coerceSwatchContactInfo({ state: "XX" }).state).toBe("");
  });

  it("rejects a lowercase state code (US_STATES are uppercase only)", () => {
    expect(coerceSwatchContactInfo({ state: "nc" }).state).toBe("");
  });

  it("returns empty strings on completely empty input (no throw)", () => {
    const out = coerceSwatchContactInfo({});
    expect(out).toEqual({
      firstName: "",
      lastName: "",
      email: "",
      phone: undefined,
      address1: "",
      address2: undefined,
      city: "",
      state: "",
      zip: "",
    });
  });

  it("ignores non-string field values without throwing (number, object, array)", () => {
    const out = coerceSwatchContactInfo({
      firstName: 42,
      lastName: { x: 1 },
      email: ["a", "b"],
      city: true,
    });
    expect(out.firstName).toBe("");
    expect(out.lastName).toBe("");
    expect(out.email).toBe("");
    expect(out.city).toBe("");
  });
});

describe("validateSwatchContactInfo — required fields", () => {
  it.each([
    ["firstName", "First name is required."],
    ["lastName", "Last name is required."],
    ["email", "Email address is required."],
    ["address1", "Street address is required."],
    ["city", "City is required."],
    ["state", "State is required."],
    ["zip", "ZIP code is required."],
  ])("flags missing %s with the documented message", (field, expectedMsg) => {
    const cleared = { ...VALID, [field]: "" } as SwatchContactInfo;
    const errors = validateSwatchContactInfo(cleared);
    expect(errors[field as keyof typeof errors]).toBe(expectedMsg);
  });

  it("returns no errors for a fully-filled valid contact", () => {
    expect(validateSwatchContactInfo(VALID)).toEqual({});
  });

  it("does NOT flag phone or address2 (both optional)", () => {
    const noOptionals: SwatchContactInfo = { ...VALID };
    delete noOptionals.phone;
    delete noOptionals.address2;
    expect(validateSwatchContactInfo(noOptionals)).toEqual({});
  });
});

describe("validateSwatchContactInfo — format-specific errors", () => {
  it.each([
    ["no @", "brendaexample.com"],
    ["no dot", "brenda@example"],
    ["whitespace inside", "br enda@example.com"],
    ["just text", "hello"],
  ])("flags malformed email — %s", (_label, bad) => {
    const errors = validateSwatchContactInfo({ ...VALID, email: bad });
    expect(errors.email).toBe("That email doesn't look right.");
  });

  it.each([
    ["alpha", "ABCDE"],
    ["too short", "1234"],
    ["too long", "123456"],
    ["dashes", "12-45"],
    ["mixed", "12A45"],
  ])("flags malformed ZIP — %s", (_label, bad) => {
    const errors = validateSwatchContactInfo({ ...VALID, zip: bad });
    expect(errors.zip).toBe("ZIP code must be 5 digits.");
  });

  it("error precedence on email: missing wins over malformed", () => {
    const errors = validateSwatchContactInfo({ ...VALID, email: "" });
    expect(errors.email).toBe("Email address is required.");
    // The malformed-email branch must NOT also fire.
    expect(errors.email).not.toMatch(/look right/);
  });

  it("error precedence on zip: missing wins over malformed", () => {
    const errors = validateSwatchContactInfo({ ...VALID, zip: "" });
    expect(errors.zip).toBe("ZIP code is required.");
  });

  it("accepts a 5-digit ZIP with leading zeros", () => {
    expect(validateSwatchContactInfo({ ...VALID, zip: "01234" })).toEqual({});
  });
});

describe("validateSwatchIds", () => {
  it("returns null on a valid 1-item array", () => {
    expect(validateSwatchIds(["s1"])).toBeNull();
  });

  it("returns null at exactly the MAX (5)", () => {
    expect(validateSwatchIds(["s1", "s2", "s3", "s4", "s5"])).toBeNull();
  });

  it("rejects an empty array with the 'select at least one' message", () => {
    expect(validateSwatchIds([])).toBe("Please select at least one swatch.");
  });

  it("rejects 6 ids with the 'up to 5' message", () => {
    expect(validateSwatchIds(["s1", "s2", "s3", "s4", "s5", "s6"])).toBe(
      "You may request up to 5 swatches at once.",
    );
  });

  it("rejects non-array (defensive — the call site type-allows but runtime might not)", () => {
    expect(
      validateSwatchIds(undefined as unknown as string[]),
    ).toBe("Please select at least one swatch.");
    expect(
      validateSwatchIds(null as unknown as string[]),
    ).toBe("Please select at least one swatch.");
    expect(
      validateSwatchIds("not an array" as unknown as string[]),
    ).toBe("Please select at least one swatch.");
  });
});

describe("hasSwatchContactErrors", () => {
  it("returns false for an empty errors object", () => {
    expect(hasSwatchContactErrors({})).toBe(false);
  });

  it("returns true when any error key is present", () => {
    expect(hasSwatchContactErrors({ email: "x" })).toBe(true);
    expect(hasSwatchContactErrors({ firstName: "x", lastName: "y" })).toBe(true);
  });
});

describe("US_STATES constant", () => {
  it("contains exactly 50 entries", () => {
    expect(US_STATES).toHaveLength(50);
  });

  it("is uppercase 2-letter codes only", () => {
    for (const s of US_STATES) {
      expect(s).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("includes NC (the showroom's state — regression guard if someone reorders)", () => {
    expect(US_STATES).toContain("NC");
  });

  it("has no duplicates", () => {
    const set = new Set(US_STATES);
    expect(set.size).toBe(US_STATES.length);
  });
});
