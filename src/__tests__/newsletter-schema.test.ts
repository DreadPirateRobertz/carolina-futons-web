// cfw-e3q: coverage for src/lib/newsletter/newsletter-schema.ts. The
// three pure validators gate every newsletter signup (Server Action +
// any future API route + the client form share these rules). Pinning
// the contract here so a regex tweak, length cap change, or
// trim/lowercase regression fails CI rather than user devices.

import { describe, it, expect } from "vitest";

import {
  coerceNewsletterRequest,
  hasNewsletterErrors,
  validateNewsletterRequest,
} from "@/lib/newsletter/newsletter-schema";

describe("coerceNewsletterRequest", () => {
  it("trims whitespace and lowercases the email", () => {
    expect(coerceNewsletterRequest({ email: "  Brenda@Example.COM  " })).toEqual({
      email: "brenda@example.com",
    });
  });

  it("returns empty email on undefined input (no throw)", () => {
    expect(coerceNewsletterRequest(undefined)).toEqual({ email: "" });
  });

  it("returns empty email on null input (no throw)", () => {
    expect(coerceNewsletterRequest(null)).toEqual({ email: "" });
  });

  it("returns empty email when email field is missing entirely", () => {
    expect(coerceNewsletterRequest({})).toEqual({ email: "" });
  });

  it("returns empty email when email field is non-string (number, object, array)", () => {
    expect(coerceNewsletterRequest({ email: 42 })).toEqual({ email: "" });
    expect(coerceNewsletterRequest({ email: { x: 1 } })).toEqual({ email: "" });
    expect(coerceNewsletterRequest({ email: ["a", "b"] })).toEqual({ email: "" });
  });

  it("ignores extra fields on the input object", () => {
    expect(
      coerceNewsletterRequest({ email: "x@y.z", honeypot: "BOT", subscribe: true }),
    ).toEqual({ email: "x@y.z" });
  });
});

describe("validateNewsletterRequest", () => {
  it("returns no errors for a normal email", () => {
    expect(validateNewsletterRequest({ email: "brenda@example.com" })).toEqual({});
  });

  it("flags missing email with 'Please enter your email.'", () => {
    expect(validateNewsletterRequest({ email: "" })).toEqual({
      email: "Please enter your email.",
    });
  });

  it("flags an email longer than 254 chars with the too-long message", () => {
    const tooLong = "a".repeat(245) + "@x.com"; // 251 chars total
    expect(validateNewsletterRequest({ email: tooLong })).toEqual({});

    const overCap = "a".repeat(250) + "@x.com"; // 256 chars — over the cap
    expect(validateNewsletterRequest({ email: overCap })).toEqual({
      email: "That email is too long.",
    });
  });

  it.each([
    ["no @", "brendaexample.com"],
    ["no dot in domain", "brenda@example"],
    ["whitespace inside", "br enda@example.com"],
    ["@ only", "@"],
    ["just text", "hello"],
  ])("flags malformed email — %s", (_label, bad) => {
    expect(validateNewsletterRequest({ email: bad })).toEqual({
      email: "That email doesn't look right.",
    });
  });

  it("error precedence: missing wins over too-long wins over malformed", () => {
    // Missing email should NOT also surface a 'too long' or 'malformed' error.
    const empty = validateNewsletterRequest({ email: "" });
    expect(empty).toEqual({ email: "Please enter your email." });

    // Too-long but otherwise malformed (no @): the too-long branch fires first.
    const longBad = validateNewsletterRequest({ email: "a".repeat(300) });
    expect(longBad).toEqual({ email: "That email is too long." });
  });
});

describe("hasNewsletterErrors", () => {
  it("returns false on an empty errors object", () => {
    expect(hasNewsletterErrors({})).toBe(false);
  });

  it("returns true when any error key is present", () => {
    expect(hasNewsletterErrors({ email: "x" })).toBe(true);
  });
});
