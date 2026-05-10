import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// cfw-62b: when /admin/audit's "Target" link navigates to an /admin/
// site-content row anchor, the row gets a brief CSS highlight via :target.
// The styling is in globals.css — vitest's jsdom doesn't resolve external
// stylesheets, so the assertion here is "the rules exist in the source"
// rather than "the computed style applied." This still catches the
// regression we care about: someone deletes the rule by accident.

const CSS_PATH = resolve(__dirname, "..", "app", "globals.css");
const CSS = readFileSync(CSS_PATH, "utf8");

describe("globals.css — /admin/site-content row :target highlight (cfw-62b)", () => {
  it("declares the cf-row-highlight keyframe animation", () => {
    expect(CSS).toMatch(/@keyframes\s+cf-row-highlight\b/);
  });

  it("targets [data-slot='admin-site-content-row']:target with the animation", () => {
    expect(CSS).toMatch(
      /\[data-slot="admin-site-content-row"\]:target\s*\{[\s\S]*?animation:\s*cf-row-highlight\b/,
    );
  });

  it("has a reduced-motion fallback that uses a static background instead of an animation", () => {
    // The fallback rule lives inside the existing prefers-reduced-motion
    // @media block. We assert the selector + a static background-color
    // override are present so reduce-motion users still see WHICH row was
    // linked to — the global animation-duration:0.01ms override would
    // otherwise make the flash invisible.
    expect(CSS).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*\[data-slot="admin-site-content-row"\]:target[\s\S]*background-color/,
    );
  });
});
