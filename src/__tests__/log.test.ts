import { describe, it, expect, beforeEach, vi } from "vitest";

import { logError } from "@/lib/observability/log";

// Cover the three behaviours that matter for the first migration target
// (PdpWishlistButton: sign-in init failure with a caught error). Stops
// short of testing the Sentry forwarder — that requires mocking
// @sentry/nextjs and asserting on captureException, which the next
// migration PR can add when there's a second call site to coordinate.

describe("logError — console emission shape", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("emits `[scope] message` then the caught value when err is provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const caught = new Error("boom");
    logError("PdpWishlistButton", "sign-in init failed", caught);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      "[PdpWishlistButton] sign-in init failed",
      caught,
    );
  });

  it("omits the err argument when none is provided (single-arg console.error)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError("PdpWishlistButton", "popover refused to open");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("[PdpWishlistButton] popover refused to open");
  });

  it("forwards non-Error throws as-is to console.error (Wix SDK rejects with strings)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError("Wix", "items.query failed", "401 Unauthorized");

    expect(spy).toHaveBeenCalledWith("[Wix] items.query failed", "401 Unauthorized");
  });
});
