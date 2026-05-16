/**
 * cf-h345.4 (cf-0oj5.fu1 Track 4) — PDP ISR cache-hit smoke STUB.
 *
 * test.skip pattern matches godfrey's cf-0klm design stubs (PR #705):
 * the contract lands now so any future ISR refactor can flip .skip
 * without re-discovering what was meant. Bodies fill in when cf-0klm
 * (PR #705 → cf-0klm.t1 impl) restores ISR by extracting the
 * root-layout cookies() call.
 *
 * ## Why this test exists
 *
 * Lighthouse synthetic baselines (cf-sd80 / Vercel preview) tell us
 * whether a SINGLE PDP request hits a perf budget. They don't tell us
 * whether subsequent requests benefit from the ISR cache. Without a
 * cache-hit assertion in CI, a future regression that silently flips
 * a PDP route back to force-dynamic (e.g. accidentally re-adding a
 * server cookies() call) passes Lighthouse + slips past the
 * cache-headers smoke (which only verifies headers, not behavior).
 *
 * ## Contract (TTFB-delta-based, less brittle than absolute timings)
 *
 *   1. Visit /products/kingston-futon-frame in a fresh tab → record TTFB
 *   2. Visit the same URL again within 30s → record TTFB
 *   3. Assert: 2nd TTFB ≤ (1st TTFB × 0.5)
 *      AND   x-vercel-cache header on 2nd request is HIT | STALE | PRERENDER
 *
 * The 0.5 ratio is generous: ISR-cached responses typically drop TTFB
 * from ~400-600ms (full Wix-fetch render) to <50ms (cached edge). 50%
 * is the floor that excludes coincidental render-time variability
 * without requiring tight thresholds that flake on slow CI runners.
 *
 * ## Why .skip TODAY (2026-05-16)
 *
 * Per cf-0klm investigation (godfrey, PR #705): the root layout
 * reads cookies() to populate consent state, which opts the entire
 * route tree out of static/ISR. Every cfw route currently returns
 * cache-control: private, no-cache, no-store. Running this test today
 * asserts a TTFB drop that physically can't happen — so it would
 * always fail.
 *
 * Flip .skip → test (drop the skip+rationale block) when:
 *   - cf-0klm.t1 implementation PR has merged (Stilgar/mayor approval)
 *   - AND a Vercel preview shows x-vercel-cache: HIT on /products/...
 *
 * Until then, this file ships as a contract pin. Removing the file is
 * also acceptable if cf-0klm strategy lands on Option 3 (accept ISR
 * unreachable indefinitely) — but the test scaffolding is cheap enough
 * to keep as a TODO.
 */

import { test } from "@playwright/test";

const PDP = "/products/kingston-futon-frame";
const isFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

test.describe("PDP ISR cache-hit (cf-h345.4 — STUB pending cf-0klm)", () => {
  // Double-gate: fixture-mode (real Wix render path needed; fixture
  // bypasses the Wix fetch that ISR caches) AND the cf-0klm marker.
  // The fixture skip stays even after cf-0klm lands — this test only
  // makes sense against the real Wix-backed render.
  test.skip(isFixtureMode, "ISR cache-hit test requires real Wix render path");
  test.skip(true, "cf-0klm gate: ISR unreachable while layout cookies() opts route tree out");

  test("kingston PDP: 2nd request TTFB ≤ 50% of 1st AND x-vercel-cache: HIT|STALE|PRERENDER", async () => {
    // TODO(cf-h345.4): fill in when cf-0klm.t1 ships.
    // Outline:
    //   const url = `${baseURL}${PDP}`;
    //   const t1 = await measureTTFB(url);
    //   const r2 = await fetch(url, { cache: "no-cache" });
    //   const t2 = await measureTTFB(url);
    //   const cacheHeader = r2.headers.get("x-vercel-cache");
    //   expect(t2).toBeLessThanOrEqual(t1 * 0.5);
    //   expect(["HIT", "STALE", "PRERENDER"]).toContain(cacheHeader);
    // measureTTFB helper: use Playwright request context + response.timing()
    // OR the Performance API on a navigated page (response.serverAddr()).
    void PDP;
  });
});
