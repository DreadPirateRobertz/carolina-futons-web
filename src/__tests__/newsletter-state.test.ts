// cfw-0ne: completes the *-state.ts coverage that started in cfw-hdf
// (4 of the 5 modules covered there; this one slipped). Same pattern:
// pin that the form mounts in 'idle' status so a regression that ships
// the constant pre-loaded with errors/values surfaces here.

import { describe, it, expect } from "vitest";

import { initialNewsletterActionState } from "@/app/newsletter/newsletter-state";

describe("initialNewsletterActionState", () => {
  it("mounts with status === 'idle'", () => {
    expect(initialNewsletterActionState.status).toBe("idle");
  });

  it("narrows to the idle variant — no stale errors/storeError/alreadySubscribed fields", () => {
    expect(Object.keys(initialNewsletterActionState)).toEqual(["status"]);
  });

  it("exact value pin (regression guard against silent rename)", () => {
    expect(initialNewsletterActionState).toEqual({ status: "idle" });
  });
});
