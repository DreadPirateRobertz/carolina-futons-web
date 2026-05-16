/**
 * cf-0klm.t1 — Tests for ConsentMode AFTER the static-default refactor.
 *
 * STUB FILE — bodies fill in once mayor approves cf-0klm architecture.
 * See docs/design/cf-0klm-consent-isr-design.md for the full design.
 *
 * Contract pinned by these stubs:
 *   1. Renders inline <script> with static "all denied" default
 *      (no per-request variation from cookie state)
 *   2. Does NOT call cookies() — verifiable via static-string source scan
 *      (the test asserts no `await cookies()` in the source file)
 *   3. Snippet is byte-identical between renders (idempotent for ISR)
 *   4. Forward-slash escape preserved (`\/` in JSON to prevent </script>
 *      injection — kept from current implementation)
 *   5. gtag default fires BEFORE any analytics pixel script tag (DOM
 *      ordering invariant — script is in <head>, pixels follow)
 *   6. The data-testid="cf-consent-default-script" anchor is preserved
 *      so existing E2E tests don't break
 */
import { describe, it } from "vitest";

describe.skip("ConsentMode static-default — cf-0klm.t1 (DESIGN STUB)", () => {
  it("renders inline script with static 'all denied' consent default");

  it("does NOT import cookies from next/headers (static source scan)");

  it("snippet is byte-identical between renders");

  it("preserves the forward-slash JSON escape (XSS guard)");

  it("script element renders before any analytics pixel components");

  it("preserves data-testid='cf-consent-default-script' anchor");
});
