import { describe, it, expect } from "vitest";
import {
  AUTH_INPUT_ERROR_MESSAGES,
  classifyAuthInputError,
} from "@/lib/auth/sdk-error";

describe("classifyAuthInputError (cfw-ipr)", () => {
  it("classifies a thrown invalidEmail as 'invalidEmail'", () => {
    const err = Object.assign(new Error("bad email"), { code: "invalidEmail" });
    expect(classifyAuthInputError(err)).toBe("invalidEmail");
  });

  it("classifies a thrown invalidPassword as 'invalidPassword'", () => {
    const err = Object.assign(new Error("bad password"), {
      code: "invalidPassword",
    });
    expect(classifyAuthInputError(err)).toBe("invalidPassword");
  });

  it("falls back to details.applicationError.code when top-level code is absent", () => {
    const err = {
      message: "x",
      details: { applicationError: { code: "invalidEmail" } },
    };
    expect(classifyAuthInputError(err)).toBe("invalidEmail");
  });

  it("classifies a generic 400 from Wix without a known code as 'invalidInput'", () => {
    expect(classifyAuthInputError({ response: { status: 400 } })).toBe(
      "invalidInput",
    );
  });

  it("returns null for non-Wix errors (plain Error)", () => {
    expect(classifyAuthInputError(new Error("network error"))).toBe(null);
  });

  it("returns null for upstream 5xx errors (Wix-shaped but not validation)", () => {
    expect(classifyAuthInputError({ response: { status: 502 } })).toBe(null);
  });

  it("returns null for non-validation Wix codes (e.g. RATE_LIMIT)", () => {
    const err = Object.assign(new Error("rate limited"), {
      code: "RATE_LIMIT",
    });
    expect(classifyAuthInputError(err)).toBe(null);
  });

  it("returns null for null / undefined / primitives", () => {
    expect(classifyAuthInputError(null)).toBe(null);
    expect(classifyAuthInputError(undefined)).toBe(null);
    expect(classifyAuthInputError("string")).toBe(null);
    expect(classifyAuthInputError(42)).toBe(null);
  });

  it("exposes user-facing copy for each kind", () => {
    expect(AUTH_INPUT_ERROR_MESSAGES.invalidEmail).toMatch(/email/i);
    expect(AUTH_INPUT_ERROR_MESSAGES.invalidPassword).toMatch(/password/i);
    expect(AUTH_INPUT_ERROR_MESSAGES.invalidInput).toMatch(/email|password/i);
  });
});
