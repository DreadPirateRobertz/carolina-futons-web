import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// cfw-a6g: pin the analytics pixels to `lazyOnload` so the perf trade-off
// (~150-200ms TBT and ~400 KiB script transfer deferred to idle) doesn't
// silently revert to `afterInteractive` on a future edit. Each pixel ships
// the inline init snippet via next/script; that snippet installs the call
// queue, so trackers continue to work — they just queue while the vendor
// script load is deferred. The pageview event delays by at most an idle-
// callback window, which is acceptable for a furniture retail site (low
// bounce-before-idle rate).

const PIXEL_FILES = [
  "../components/analytics/MetaPixel.tsx",
  "../components/analytics/GA4Tag.tsx",
  "../components/analytics/TikTokPixel.tsx",
  "../components/analytics/PinterestTag.tsx",
] as const;

function read(rel: string): string {
  return readFileSync(resolve(__dirname, rel), "utf8");
}

describe("analytics pixels — lazy-onload strategy (cfw-a6g)", () => {
  it.each(PIXEL_FILES)("%s pins next/script strategy to lazyOnload", (path) => {
    const src = read(path);
    expect(src).toMatch(/strategy="lazyOnload"/);
    // No afterInteractive remnants — would silently re-eagerize the load.
    expect(src).not.toMatch(/strategy="afterInteractive"/);
  });
});
