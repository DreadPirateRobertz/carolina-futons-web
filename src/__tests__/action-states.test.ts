// cfw-hdf: invariants for the four *-state.ts modules split out of
// their actions.ts files. The contact-state.ts file's own comment
// documents the failure mode: when these constants lived inside the
// `"use server"` module, useActionState received an RPC reference
// instead of a plain object, breaking the form on first hydration.
//
// Pin the initial-state contract so a regression that ships a form
// pre-loaded in 'error' or 'success' state surfaces in CI rather than
// in production. Plus SPIN_PRIZES static data invariants.

import { describe, it, expect } from "vitest";

import {
  SPIN_PRIZES,
  initialSpinActionState,
} from "@/app/spin/spin-state";
import { initialSwatchRequestState } from "@/app/swatch-request/swatch-request-state";
import { initialContactActionState } from "@/app/contact/contact-state";
import { initialAppointmentActionState } from "@/app/contact/appointment-state";

describe("initialXxxActionState — every form mounts in 'idle'", () => {
  it.each([
    ["spin", initialSpinActionState],
    ["swatch-request", initialSwatchRequestState],
    ["contact", initialContactActionState],
    ["appointment", initialAppointmentActionState],
  ])("%s — initial state status === 'idle'", (_label, state) => {
    expect(state.status).toBe("idle");
  });

  it.each([
    ["spin", initialSpinActionState],
    ["swatch-request", initialSwatchRequestState],
    ["contact", initialContactActionState],
    ["appointment", initialAppointmentActionState],
  ])("%s — narrows to idle variant (no errors / values fields)", (_label, state) => {
    // The discriminated union has 'errors' / 'values' / 'prize' / etc.
    // ONLY on the error/success branches. The idle branch has just
    // { status }. A regression that adds a stale field to the constant
    // would surface as extra keys here.
    expect(Object.keys(state)).toEqual(["status"]);
  });
});

describe("SPIN_PRIZES — prize wheel data", () => {
  it("has the documented 6 prizes", () => {
    expect(SPIN_PRIZES).toHaveLength(6);
  });

  it("includes the 'nomatch' (try-again) entry — wheel must always have a no-prize segment", () => {
    // Without nomatch the wheel can't land safely on a no-prize result;
    // every spin would award something. Pin so a future "let's only
    // ship real prizes" change fails CI.
    const ids = SPIN_PRIZES.map((p) => p.id);
    expect(ids).toContain("nomatch");
  });

  it("all ids are unique (no duplicate prize-segment behaviour)", () => {
    const ids = SPIN_PRIZES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SPIN_PRIZES)("$id — label, description, color are all non-empty", (p) => {
    expect(p.label.trim().length).toBeGreaterThan(0);
    expect(p.description.trim().length).toBeGreaterThan(0);
    expect(p.color.trim().length).toBeGreaterThan(0);
  });

  it.each(SPIN_PRIZES)("$id — color is a #RRGGBB hex", (p) => {
    expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("ids match the documented kebab/concat-style identifier shape", () => {
    // Existing ids are short tokens: '5off', '10off', 'freeswap',
    // 'fship', 'bdeal', 'nomatch'. Pin the alphanumeric-only constraint
    // so analytics dashboards keyed on these strings never hit a
    // surprise '-' or whitespace.
    for (const p of SPIN_PRIZES) {
      expect(p.id).toMatch(/^[a-z0-9]+$/);
    }
  });
});
