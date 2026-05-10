import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// cf-edw3: pin the woodpecker medallion peck animation contract so a
// future revert to the 6-keyframe non-alternate shape (which Stilgar
// reported as "broken — woodpecker hover stutters while the others
// tilt smoothly") trips this test instead of silently regressing.
//
// The fix shape: medallion-peck must use `alternate` direction on the
// .group:hover .anim-peck rule so it oscillates smoothly like
// medallion-tilt instead of jump-cutting back to a peck position at
// the start of each cycle. Both rules now share an identical mechanic
// (from→to alternate, or 0/100→50% alternate), differing only in the
// transform values that give peck its forward-and-down character.

const CSS = readFileSync(
  resolve(__dirname, "../app/globals.css"),
  "utf8",
);

describe("HomeCategoryGridV9 medallion animations (cf-edw3)", () => {
  it("medallion-peck and medallion-tilt keyframes both ship", () => {
    expect(CSS).toMatch(/@keyframes medallion-peck/);
    expect(CSS).toMatch(/@keyframes medallion-tilt/);
  });

  it("anim-peck hover rule uses `alternate` direction (matches tilt)", () => {
    // Find the .group:hover .anim-peck rule body.
    const block = CSS.match(/\.group:hover \.anim-peck\s*\{([^}]+)\}/);
    expect(block, ".group:hover .anim-peck rule must exist").not.toBeNull();
    expect(block![1]).toMatch(/medallion-peck/);
    // The bug was a non-alternate animation. Pin alternate so a revert
    // to the original 6-key non-alternate shape fails this test.
    expect(block![1]).toMatch(/\balternate\b/);
  });

  it("anim-tilt hover rule still uses `alternate` (no regression)", () => {
    const block = CSS.match(/\.group:hover \.anim-tilt\s*\{([^}]+)\}/);
    expect(block, ".group:hover .anim-tilt rule must exist").not.toBeNull();
    expect(block![1]).toMatch(/medallion-tilt/);
    expect(block![1]).toMatch(/\balternate\b/);
  });

  it("peck keyframes are the smooth 2-stop shape (not the 6-stop jitter)", () => {
    // The fix collapsed 0/18/36/54/72/88/100 → from/to (or 0/100 → with
    // `alternate` doing the back-and-forth). Source-grep that the old
    // 6-stop shape is gone.
    const block = CSS.match(/@keyframes medallion-peck\s*\{([\s\S]*?)\}/);
    expect(block).not.toBeNull();
    const body = block![1];
    // Old shape had 18%, 36%, 54%, 72%, 88% percentage stops. New shape
    // doesn't. If any of those reappear, the test trips.
    expect(body).not.toMatch(/18\s*%/);
    expect(body).not.toMatch(/36\s*%/);
    expect(body).not.toMatch(/54\s*%/);
    expect(body).not.toMatch(/72\s*%/);
    expect(body).not.toMatch(/88\s*%/);
  });
});
