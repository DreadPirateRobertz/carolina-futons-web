// cfw-hxu: structural invariants for src/lib/business/contact-info.ts.
// Pure data, no functions — the failure mode is a typo or domain drift
// that ships the wrong tel:/mailto: href because BUSINESS.phone changed
// without BUSINESS.phoneHref (or vice versa), or a SOCIALS entry that
// silently routes to a parked username after a rebrand.

import { describe, it, expect } from "vitest";

import { BUSINESS, SOCIALS } from "@/lib/business/contact-info";

describe("BUSINESS — single source of truth for business data", () => {
  it("pins the documented shape (cf-3qt.8.B regression guard)", () => {
    expect(BUSINESS.name).toBe("Carolina Futons");
    expect(BUSINESS.state).toBe("NC");
    expect(BUSINESS.foundedYear).toBe(1991);
    expect(BUSINESS.warrantyYears).toBe(15);
  });

  it("zip is a 5-digit US ZIP", () => {
    expect(BUSINESS.zip).toMatch(/^\d{5}$/);
  });

  it("street + city + state + zip are all non-empty", () => {
    expect(BUSINESS.street.trim().length).toBeGreaterThan(0);
    expect(BUSINESS.city.trim().length).toBeGreaterThan(0);
    expect(BUSINESS.state.trim().length).toBe(2);
    expect(BUSINESS.zip.trim().length).toBeGreaterThan(0);
  });

  it("phoneHref starts with tel:+1 (E.164 US prefix)", () => {
    expect(BUSINESS.phoneHref).toMatch(/^tel:\+1/);
  });

  it("phoneHref digits match BUSINESS.phone digits (no drift between display and dial)", () => {
    const phoneDigits = BUSINESS.phone.replace(/\D/g, "");
    const hrefDigits = BUSINESS.phoneHref.replace(/\D/g, "");
    // hrefDigits has the leading 1 from the country code; phoneDigits
    // doesn't — strip it before compare so a digit-by-digit drift surfaces.
    expect(hrefDigits.replace(/^1/, "")).toBe(phoneDigits);
  });

  it("emailHref starts with mailto: and exactly contains BUSINESS.email", () => {
    expect(BUSINESS.emailHref).toMatch(/^mailto:/);
    expect(BUSINESS.emailHref).toBe(`mailto:${BUSINESS.email}`);
  });

  it("email looks like a real address (single @, has TLD)", () => {
    expect(BUSINESS.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("foundedYear is in the past, before now", () => {
    expect(BUSINESS.foundedYear).toBeLessThanOrEqual(new Date().getFullYear());
  });
});

describe("SOCIALS — canonical platform handles", () => {
  it("is non-empty", () => {
    expect(SOCIALS.length).toBeGreaterThan(0);
  });

  it.each(SOCIALS)(
    "every entry has a non-empty name + valid HTTPS href — $name",
    (s) => {
      expect(s.name.trim().length).toBeGreaterThan(0);
      expect(s.href).toMatch(/^https:\/\//);
    },
  );

  it("every href routes to the carolinafutons handle (rebrand drift guard)", () => {
    // The file says "Handles default to @carolinafutons on every platform."
    // Pin the runtime invariant — a rename to a parked username on any one
    // platform would silently land in the Footer + Organization JSON-LD.
    for (const s of SOCIALS) {
      expect(s.href).toContain("carolinafutons");
    }
  });

  it("platform names are unique (no duplicate Facebook etc.)", () => {
    const names = SOCIALS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("hrefs are unique (no duplicate row pointing at the same URL)", () => {
    const hrefs = SOCIALS.map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
