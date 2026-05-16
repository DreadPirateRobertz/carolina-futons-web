/**
 * cf-0oj5 — PDP cache-routing contract. Pins that
 * src/app/products/[slug]/page.tsx uses ISR (revalidate=N), NOT
 * force-dynamic. Pre-cf-0oj5, the page exported
 * `dynamic = "force-dynamic"` which forced a full SSR + Wix SDK
 * round-trip on every request — TTFB dominated LCP (Lighthouse 68 /
 * LCP 7.3s on kingston-futon-frame, cf-sd80 baseline 2026-05-16).
 *
 * Strategy: source-level assertion on the page module exports. This
 * pins the cache contract at a structural level; behavioral verification
 * lives in Vercel's preview Lighthouse run (the bead's acceptance
 * criteria — perf ≥ 80, LCP ≤ 3.5s).
 *
 * Why source-level and not import-and-check: the page is an async server
 * component that imports the Wix SDK transitively; importing it under
 * vitest pulls in the whole server-side fetch stack. Source-level scan
 * gives us the same regression guard without the dependency chain.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(
  path.resolve(TEST_DIR, "../app/products/[slug]/page.tsx"),
  "utf-8",
);

describe("cf-0oj5 — PDP /products/[slug] caching contract", () => {
  it("uses ISR (revalidate) — not force-dynamic", () => {
    // Post-fix: revalidate must be exported with a positive integer.
    expect(SRC).toMatch(/export\s+const\s+revalidate\s*=\s*\d+/);
  });

  it("does NOT export dynamic = 'force-dynamic' (LCP regression cause)", () => {
    // Regression guard against re-introduction. If a future PR adds
    // force-dynamic back, this fails loud.
    expect(SRC).not.toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("revalidate window is at least 60s (sane lower bound)", () => {
    // Sub-minute revalidation defeats the ISR purpose — every request
    // refreshes the cache. Cap at >= 60s. Current value 3600 (1 hour)
    // matches cf-3qt.7 facet/cache plan; future PRs can adjust upward
    // once tag-based invalidation lands but should never drop below 60.
    const m = SRC.match(/export\s+const\s+revalidate\s*=\s*(\d+)/);
    expect(m).not.toBeNull();
    const seconds = Number(m![1]);
    expect(seconds).toBeGreaterThanOrEqual(60);
  });

  it("comment references cf-0oj5 + cf-sd80 lineage", () => {
    // Anchor the WHY for future readers — they should find the bead +
    // baseline measurement without git archaeology.
    expect(SRC).toMatch(/cf-0oj5/);
    expect(SRC).toMatch(/cf-sd80/);
  });
});
