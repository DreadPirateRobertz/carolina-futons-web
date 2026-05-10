// cfw-yp4: structural invariants for src/app/manifest.ts. PWA install
// manifest. A wrong start_url ships a broken installed-app launch.
// Missing icon sizes break iOS home-screen install (192 + 512 are the
// documented Web App Manifest minimum). Theme/background colors drift
// from the brand palette make the splash screen look broken.

import { describe, it, expect } from "vitest";

import manifest from "@/app/manifest";

describe("PWA manifest", () => {
  const m = manifest();

  it("uses the documented brand name + short_name", () => {
    expect(m.name).toBe("Carolina Futons");
    expect(m.short_name).toBe("CF");
  });

  it("description is non-empty", () => {
    expect((m.description ?? "").trim().length).toBeGreaterThan(0);
  });

  it("start_url AND scope are both '/'", () => {
    // start_url drives the installed-app launch URL. scope='/' matches
    // so deep links inside the app stay in the PWA shell rather than
    // bouncing to the browser.
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
  });

  it("display='standalone' AND orientation='portrait'", () => {
    expect(m.display).toBe("standalone");
    expect(m.orientation).toBe("portrait");
  });

  it.each([
    ["background_color", m.background_color],
    ["theme_color", m.theme_color],
  ])("%s is a #RRGGBB hex", (_label, color) => {
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("icons array is non-empty", () => {
    expect((m.icons ?? []).length).toBeGreaterThan(0);
  });

  it("includes at least one 192x192 AND one 512x512 icon (Web App Manifest minimum)", () => {
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it.each(manifest().icons ?? [])(
    "icon $sizes has /brand/-prefixed src + non-empty type",
    (icon) => {
      expect(icon.src).toMatch(/^\/brand\//);
      expect(icon.type).toBeTruthy();
      expect(icon.type?.length ?? 0).toBeGreaterThan(0);
    },
  );

  it.each(manifest().icons ?? [])(
    "icon $sizes purpose is one of the documented values",
    (icon) => {
      // "any" / "maskable" / "monochrome" — the three values defined by
      // the Web App Manifest spec. Pin so a typo'd 'aaany' doesn't ship.
      const allowed = new Set(["any", "maskable", "monochrome"]);
      const actual = (icon.purpose ?? "any").split(/\s+/);
      for (const p of actual) {
        expect(allowed).toContain(p);
      }
    },
  );
});
