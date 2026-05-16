/**
 * cf-0klm.t1 — Tests for ConsentClientBoot (NEW component).
 *
 * STUB FILE — bodies will be filled in once mayor approves the architecture.
 * Shipping the stub now to lock in the contract; see
 * docs/design/cf-0klm-consent-isr-design.md for the full design.
 *
 * Contract pinned by these stubs:
 *   1. No-op when cf_consent cookie is absent (first-time visitor — banner handles)
 *   2. Emits gtag('consent', 'update', granted-map) when cookie is "granted"
 *   3. Emits gtag('consent', 'update', denied-map) when cookie is "denied"
 *   4. Handles granular JSON cookie format (cf-yt6r ConsentGrantMap)
 *   5. Tolerates window.gtag being undefined (graceful no-op, no throw)
 */
import { describe, it } from "vitest";

describe.skip("ConsentClientBoot — cf-0klm.t1 (DESIGN STUB)", () => {
  it("no-op when cf_consent cookie absent");

  it("emits gtag('consent', 'update', { ...granted }) when cookie is 'granted'");

  it("emits gtag('consent', 'update', { ...denied }) when cookie is 'denied'");

  it("handles granular JSON cookie (cf-yt6r ConsentGrantMap)");

  it("tolerates window.gtag undefined — graceful no-op");
});
