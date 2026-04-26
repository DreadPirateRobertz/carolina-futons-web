import { describe, it, expect } from "vitest";

import {
  consentMapFor,
  isConsentChoice,
  isConsentGrantMap,
  parseConsentCookie,
  parseConsentCookieAsMap,
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

describe("isConsentGrantMap", () => {
  it("accepts a fully valid map", () => {
    expect(isConsentGrantMap({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "granted",
      ad_personalization: "denied",
    })).toBe(true);
  });

  it("rejects when any key is missing", () => {
    expect(isConsentGrantMap({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "granted",
      // ad_personalization missing
    })).toBe(false);
  });

  it("rejects when any value is not 'granted'|'denied'", () => {
    expect(isConsentGrantMap({
      analytics_storage: "yes",
      ad_storage: "denied",
      ad_user_data: "granted",
      ad_personalization: "denied",
    })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isConsentGrantMap(null)).toBe(false);
    expect(isConsentGrantMap("granted")).toBe(false);
    expect(isConsentGrantMap(42)).toBe(false);
  });
});

describe("parseConsentCookie (legacy binary)", () => {
  it("returns 'unknown' for missing cookie", () => {
    expect(parseConsentCookie(undefined)).toBe("unknown");
    expect(parseConsentCookie("")).toBe("unknown");
  });

  it("passes through valid binary choices", () => {
    expect(parseConsentCookie("granted")).toBe("granted");
    expect(parseConsentCookie("denied")).toBe("denied");
  });

  it("returns 'granted' for a valid granular JSON cookie (user already chose)", () => {
    const json = JSON.stringify({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(parseConsentCookie(json)).toBe("granted");
  });

  it("falls back to 'unknown' on a tampered/invalid cookie value", () => {
    expect(parseConsentCookie("yes")).toBe("unknown");
    expect(parseConsentCookie("granted; alert(1)")).toBe("unknown");
    expect(parseConsentCookie("{invalid}")).toBe("unknown");
  });
});

describe("parseConsentCookieAsMap", () => {
  const ALL_DENIED = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };
  const ALL_GRANTED = {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  };

  it("returns all-denied for missing cookie", () => {
    expect(parseConsentCookieAsMap(undefined)).toEqual(ALL_DENIED);
    expect(parseConsentCookieAsMap("")).toEqual(ALL_DENIED);
  });

  it("expands legacy 'granted' string to all-granted map", () => {
    expect(parseConsentCookieAsMap("granted")).toEqual(ALL_GRANTED);
  });

  it("expands legacy 'denied' string to all-denied map", () => {
    expect(parseConsentCookieAsMap("denied")).toEqual(ALL_DENIED);
  });

  it("expands legacy 'unknown' string to all-denied map", () => {
    expect(parseConsentCookieAsMap("unknown")).toEqual(ALL_DENIED);
  });

  it("parses a valid granular JSON map", () => {
    const mixed = {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "granted",
    };
    expect(parseConsentCookieAsMap(JSON.stringify(mixed))).toEqual(mixed);
  });

  it("falls back to all-denied for malformed JSON", () => {
    expect(parseConsentCookieAsMap("{invalid}")).toEqual(ALL_DENIED);
    expect(parseConsentCookieAsMap("null")).toEqual(ALL_DENIED);
  });

  it("falls back to all-denied for JSON with wrong shape", () => {
    expect(parseConsentCookieAsMap(JSON.stringify({ analytics_storage: "yes" }))).toEqual(ALL_DENIED);
  });

  it("strips extra keys from a tampered cookie so they never reach the inline script", () => {
    const tampered = JSON.stringify({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      // Attacker-injected extra key.
      x: '</script><script>alert(1)</script>',
    });
    const result = parseConsentCookieAsMap(tampered);
    expect(result).toEqual({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect("x" in result).toBe(false);
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
