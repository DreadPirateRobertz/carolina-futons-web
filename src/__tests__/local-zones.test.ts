import { describe, expect, it } from "vitest";

import {
  inferStateFromZip,
  isValidZip,
  matchLocalZone,
  LOCAL_ZONES,
} from "@/lib/delivery/local-zones";

// cf-3qt.4.4 AC: Hendersonville → zone1, Asheville → zone2, Charlotte → zone3.
// All three known fixtures exercise a different branch of the matcher:
//   - 28792 (Hendersonville) hits the exact-zip list in zone1
//   - 28801 (Asheville)      hits zip3=288 + state=NC against zone2
//   - 28202 (Charlotte)      hits zip3=282 + state=NC against zone3

describe("isValidZip", () => {
  it("accepts a 5-digit numeric string", () => {
    expect(isValidZip("28792")).toBe(true);
  });
  it("rejects shorter or longer or non-numeric input", () => {
    expect(isValidZip("2879")).toBe(false);
    expect(isValidZip("287920")).toBe(false);
    expect(isValidZip("ABCDE")).toBe(false);
    expect(isValidZip(" 28792 ")).toBe(false);
    expect(isValidZip("")).toBe(false);
  });
});

describe("inferStateFromZip", () => {
  it.each([
    ["28792", "NC"],
    ["28801", "NC"],
    ["29401", "SC"],
    ["30303", "GA"],
    ["37201", "TN"],
    ["22030", "VA"],
  ])("infers %s → %s", (zip, expected) => {
    expect(inferStateFromZip(zip)).toBe(expected);
  });
  it("returns null for ZIPs outside the SE coverage range", () => {
    expect(inferStateFromZip("90210")).toBeNull(); // CA
    expect(inferStateFromZip("02108")).toBeNull(); // MA
  });
  it("returns null for invalid ZIPs", () => {
    expect(inferStateFromZip("not-a-zip")).toBeNull();
  });
});

describe("matchLocalZone — three known AC fixtures", () => {
  it("Hendersonville (28792) → zone1 Store Local", () => {
    const zone = matchLocalZone("28792", "NC");
    expect(zone?.code).toBe("zone1");
    expect(zone?.name).toMatch(/Store Local/);
  });

  it("Asheville (28801) → zone2 WNC Extended (zip3 prefix + NC)", () => {
    const zone = matchLocalZone("28801", "NC");
    expect(zone?.code).toBe("zone2");
    expect(zone?.name).toMatch(/WNC Extended/);
  });

  it("Charlotte (28202) → zone3 Southeast Regional", () => {
    const zone = matchLocalZone("28202", "NC");
    expect(zone?.code).toBe("zone3");
    expect(zone?.name).toMatch(/Southeast/);
  });
});

describe("matchLocalZone — fall-through behavior", () => {
  it("returns null when ZIP is invalid", () => {
    expect(matchLocalZone("ABC", "NC")).toBeNull();
    expect(matchLocalZone("123", "NC")).toBeNull();
  });

  it("returns null for a valid ZIP outside coverage (CA 90210)", () => {
    expect(matchLocalZone("90210", "CA")).toBeNull();
  });

  it("zone1 exact-zip wins regardless of supplied state", () => {
    // 28792 is in zone1.zips. Even if a caller passes a wrong state, the
    // exact-zip branch fires first.
    expect(matchLocalZone("28792", "VA")?.code).toBe("zone1");
  });

  it("requires state for zone2-4 since they match by zip3 prefix", () => {
    // Without state, 28801 won't match zone2 — the prefix branch needs state.
    expect(matchLocalZone("28801")).toBeNull();
  });

  it("normalizes state to uppercase + trim", () => {
    expect(matchLocalZone("28801", "  nc  ")?.code).toBe("zone2");
  });

  it("Greenville SC (29601) → zone2 via SC + 296 prefix", () => {
    expect(matchLocalZone("29601", "SC")?.code).toBe("zone2");
  });

  it("Atlanta (30303) → zone3 via GA + 303 prefix", () => {
    expect(matchLocalZone("30303", "GA")?.code).toBe("zone3");
  });

  it("Nashville (37201) → zone4 via TN + 372 prefix", () => {
    expect(matchLocalZone("37201", "TN")?.code).toBe("zone4");
  });
});

describe("LOCAL_ZONES data", () => {
  it("emits exactly four zones in declared order", () => {
    expect(LOCAL_ZONES).toHaveLength(4);
    expect(LOCAL_ZONES.map((z) => z.code)).toEqual([
      "zone1",
      "zone2",
      "zone3",
      "zone4",
    ]);
  });

  it("every zone carries the fields the UI renders", () => {
    for (const zone of LOCAL_ZONES) {
      expect(zone.name.length).toBeGreaterThan(0);
      expect(zone.description.length).toBeGreaterThan(0);
      expect(zone.delivery).toBeGreaterThan(0);
      expect(zone.whiteGlove).toBeGreaterThan(zone.delivery);
      expect(zone.deliveryDays.length).toBeGreaterThan(0);
    }
  });
});
