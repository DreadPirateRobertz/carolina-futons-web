import { describe, it, expect } from "vitest";

import {
  consentMapFor,
  isConsentChoice,
  parseConsentCookie,
} from "@/lib/consent/consent-state";

describe("isConsentChoice", () => {
  it.each([
    ["unknown", true],
    ["granted", true],
    ["denied", true],
    ["yes", false],
    ["", false],
    [null, false],
    [undefined, false],
    [42, false],
  ])("treats %s as %s", (input, expected) => {
    expect(isConsentChoice(input)).toBe(expected);
  });
});

describe("parseConsentCookie", () => {
  it("returns 'unknown' for missing cookie", () => {
    expect(parseConsentCookie(undefined)).toBe("unknown");
    expect(parseConsentCookie("")).toBe("unknown");
  });

  it("passes through valid choices", () => {
    expect(parseConsentCookie("granted")).toBe("granted");
    expect(parseConsentCookie("denied")).toBe("denied");
  });

  it("falls back to 'unknown' on a tampered/invalid cookie value", () => {
    expect(parseConsentCookie("yes")).toBe("unknown");
    expect(parseConsentCookie("granted; alert(1)")).toBe("unknown");
  });
});

describe("consentMapFor", () => {
  it("emits all-granted for 'granted'", () => {
    expect(consentMapFor("granted")).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  });

  it("emits all-denied for 'denied'", () => {
    expect(consentMapFor("denied")).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  it("emits all-denied for 'unknown' (conservative posture)", () => {
    // Per Consent Mode v2 best practice and EEA/UK opt-in regimes, the
    // pre-banner posture must be denied — only an explicit Accept flips it.
    expect(consentMapFor("unknown")).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });
});
