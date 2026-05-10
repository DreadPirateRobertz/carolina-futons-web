// cfw-fan: structural invariants for src/lib/nav/mega-menu-data.ts.
// MEGA_MENU_DATA is keyed by primary-nav href, so silent regressions
// happen when (a) an external (non-relative) link sneaks into a
// subLink, (b) an image stops pointing at the Wix CDN (CORS / cache
// issues from a third-party host), or (c) hot-path keys disappear and
// the mega-menu stops rendering for `/shop/futon-frames`.

import { describe, it, expect } from "vitest";

import { MEGA_MENU_DATA } from "@/lib/nav/mega-menu-data";

describe("MEGA_MENU_DATA — overall shape", () => {
  it("is non-empty", () => {
    expect(Object.keys(MEGA_MENU_DATA).length).toBeGreaterThan(0);
  });

  it("includes hot-path nav keys (regression guard)", () => {
    const keys = Object.keys(MEGA_MENU_DATA);
    expect(keys).toContain("/shop/futon-frames");
    expect(keys).toContain("/shop/mattresses");
  });

  it("every key starts with '/' (no relative or full-URL panel keys)", () => {
    for (const key of Object.keys(MEGA_MENU_DATA)) {
      expect(key.startsWith("/")).toBe(true);
    }
  });
});

describe("MEGA_MENU_DATA — per-panel invariants", () => {
  const entries = Object.entries(MEGA_MENU_DATA);

  it.each(entries)("%s — panel has non-empty image, imageAlt, and >=1 subLink", (key, panel) => {
    expect(panel.image.trim().length).toBeGreaterThan(0);
    expect(panel.imageAlt.trim().length).toBeGreaterThan(0);
    expect(panel.subLinks.length).toBeGreaterThan(0);
  });

  it.each(entries)("%s — image is HTTPS-only", (_key, panel) => {
    expect(panel.image).toMatch(/^https:\/\//);
  });

  it.each(entries)("%s — image points at static.wixstatic.com (CDN regression guard)", (_key, panel) => {
    // The whole site's images flow through Wix's CDN — a panel image on
    // a third-party host introduces CORS / cache uncertainty into the
    // mega-menu. Pin to fail CI if a copy-paste from a different source
    // lands.
    expect(panel.image).toContain("static.wixstatic.com");
  });

  it.each(entries)(
    "%s — every subLink has non-empty label + relative href starting with '/'",
    (_key, panel) => {
      for (const sub of panel.subLinks) {
        expect(sub.label.trim().length).toBeGreaterThan(0);
        // Mega-menu sub-links should never escape the storefront — every
        // href must be relative ('/'-prefixed). External links (mailto:,
        // https://, etc.) sneak into the nav and break SPA routing.
        expect(sub.href.startsWith("/"), `${sub.href} is not relative`).toBe(true);
      }
    },
  );

  it.each(entries)(
    "%s — subLink labels are unique within a panel",
    (_key, panel) => {
      const labels = panel.subLinks.map((s) => s.label);
      expect(new Set(labels).size).toBe(labels.length);
    },
  );
});
