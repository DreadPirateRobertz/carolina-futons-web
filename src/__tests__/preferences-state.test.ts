// cfw-dve: structural invariants for src/app/actions/preferences-state.ts.
// Split out of actions/preferences.ts because Next.js refuses to compile
// non-async exports from a 'use server' module. PREFERENCE_CATEGORIES
// (the literal-type source) and DEFAULT_PREFERENCES (the Record) MUST
// have the same set of keys — drift means a new category renders no
// toggle in /dashboard/preferences, or an old category leaks a stale
// default. TS catches the type narrowing but not silent set drift.

import { describe, it, expect } from "vitest";

import {
  DEFAULT_PREFERENCES,
  PREFERENCE_CATEGORIES,
} from "@/app/actions/preferences-state";

describe("PREFERENCE_CATEGORIES", () => {
  it("contains the documented 5 categories", () => {
    expect([...PREFERENCE_CATEGORIES].sort()).toEqual(
      ["badges", "challenges", "marketing", "streak", "tier"].sort(),
    );
  });

  it("has no duplicates", () => {
    const set = new Set(PREFERENCE_CATEGORIES);
    expect(set.size).toBe(PREFERENCE_CATEGORIES.length);
  });

  it("every category is a non-empty lowercase string", () => {
    for (const c of PREFERENCE_CATEGORIES) {
      expect(c).toMatch(/^[a-z]+$/);
    }
  });
});

describe("DEFAULT_PREFERENCES", () => {
  it("key set matches PREFERENCE_CATEGORIES exactly (no missing or extra entries)", () => {
    const defKeys = Object.keys(DEFAULT_PREFERENCES).sort();
    const catKeys = [...PREFERENCE_CATEGORIES].sort();
    expect(defKeys).toEqual(catKeys);
  });

  it("every default value is a boolean", () => {
    for (const value of Object.values(DEFAULT_PREFERENCES)) {
      expect(typeof value).toBe("boolean");
    }
  });

  it("every default is true (documented opt-out posture, NOT opt-in)", () => {
    // Members get notifications by default; toggle to OFF to opt out.
    // Flipping any of these to false ships a silent opt-in regression
    // for new accounts.
    for (const c of PREFERENCE_CATEGORIES) {
      expect(
        DEFAULT_PREFERENCES[c],
        `category ${c} default flipped to opt-in`,
      ).toBe(true);
    }
  });

  it("is frozen — cannot be mutated at runtime", () => {
    expect(Object.isFrozen(DEFAULT_PREFERENCES)).toBe(true);
  });

  it("attempted mutation throws in strict mode (vitest runs strict)", () => {
    // strict mode is the default for ES modules and vitest test files;
    // assigning to a frozen object throws TypeError. Pin so a future
    // refactor that swaps Object.freeze for a plain object surfaces
    // here.
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (DEFAULT_PREFERENCES as any).challenges = false;
    }).toThrow();
    // Original value preserved.
    expect(DEFAULT_PREFERENCES.challenges).toBe(true);
  });
});
