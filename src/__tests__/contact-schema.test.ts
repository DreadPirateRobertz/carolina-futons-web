import { describe, it, expect } from "vitest";
import {
  coerceContactRequest,
  hasContactErrors,
  validateContactRequest,
  type BedSize,
} from "@/lib/contact/contact-schema";

describe("coerceContactRequest", () => {
  it("trims whitespace on all fields", () => {
    const r = coerceContactRequest({
      name: "  Ada  ",
      email: "  ada@example.com ",
      phone: " 828-555-0100 ",
      subject: "  Warranty question ",
      message: "  Hello there friend  ",
    });
    expect(r.name).toBe("Ada");
    expect(r.email).toBe("ada@example.com");
    expect(r.phone).toBe("828-555-0100");
    expect(r.subject).toBe("Warranty question");
    expect(r.message).toBe("Hello there friend");
  });

  it("defaults missing fields to empty strings (phone stays undefined)", () => {
    const r = coerceContactRequest({});
    expect(r.name).toBe("");
    expect(r.email).toBe("");
    expect(r.subject).toBe("");
    expect(r.message).toBe("");
    expect(r.phone).toBeUndefined();
  });

  it("survives non-object input (null, array, primitives)", () => {
    expect(coerceContactRequest(null).name).toBe("");
    expect(coerceContactRequest(undefined).email).toBe("");
    expect(coerceContactRequest("string").subject).toBe("");
    expect(coerceContactRequest(42).message).toBe("");
  });

  it("drops non-string phone to undefined rather than stringifying", () => {
    expect(coerceContactRequest({ phone: 1234567890 }).phone).toBeUndefined();
  });

  it("accepts valid bed sizes and normalises to lowercase", () => {
    for (const size of ["twin", "full", "queen", "king"] as BedSize[]) {
      expect(coerceContactRequest({ sizeOfInterest: size }).sizeOfInterest).toBe(size);
      expect(
        coerceContactRequest({ sizeOfInterest: size.toUpperCase() }).sizeOfInterest,
      ).toBe(size);
    }
  });

  it("drops unknown sizeOfInterest values to undefined", () => {
    expect(
      coerceContactRequest({ sizeOfInterest: "california-king" }).sizeOfInterest,
    ).toBeUndefined();
    expect(
      coerceContactRequest({ sizeOfInterest: "" }).sizeOfInterest,
    ).toBeUndefined();
    expect(
      coerceContactRequest({ sizeOfInterest: 99 }).sizeOfInterest,
    ).toBeUndefined();
  });

  it("omits sizeOfInterest when not provided", () => {
    const r = coerceContactRequest({ name: "X", email: "x@x.com" });
    expect(r.sizeOfInterest).toBeUndefined();
  });
});

describe("validateContactRequest", () => {
  const valid = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    subject: "Kingston frame question",
    message: "Is the Kingston frame still in stock this month?",
  };

  it("returns no errors on a fully valid request", () => {
    expect(validateContactRequest(valid)).toEqual({});
  });

  it("flags empty required fields", () => {
    const errors = validateContactRequest({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.subject).toBeTruthy();
    expect(errors.message).toBeTruthy();
  });

  it("flags malformed emails", () => {
    const errors = validateContactRequest({ ...valid, email: "not-an-email" });
    expect(errors.email).toMatch(/email/i);
  });

  it("accepts emails with plus-addressing and subdomains", () => {
    const errors = validateContactRequest({
      ...valid,
      email: "ada+shop@mail.example.co",
    });
    expect(errors.email).toBeUndefined();
  });

  it("rejects a message that is too short (< 10 chars)", () => {
    const errors = validateContactRequest({ ...valid, message: "hi" });
    expect(errors.message).toMatch(/at least/i);
  });

  it("rejects a message over 2000 chars", () => {
    const errors = validateContactRequest({
      ...valid,
      message: "x".repeat(2001),
    });
    expect(errors.message).toMatch(/under 2000/i);
  });

  it("rejects a subject over 120 chars", () => {
    const errors = validateContactRequest({
      ...valid,
      subject: "x".repeat(121),
    });
    expect(errors.subject).toMatch(/too long/i);
  });

  it("rejects a name over 80 chars", () => {
    const errors = validateContactRequest({ ...valid, name: "x".repeat(81) });
    expect(errors.name).toMatch(/too long/i);
  });

  it("treats phone as optional — no error when empty", () => {
    const errors = validateContactRequest({ ...valid, phone: undefined });
    expect(errors).toEqual({});
  });
});

describe("hasContactErrors", () => {
  it("returns false for an empty errors map", () => {
    expect(hasContactErrors({})).toBe(false);
  });

  it("returns true when any error field is set", () => {
    expect(hasContactErrors({ email: "bad" })).toBe(true);
  });
});
