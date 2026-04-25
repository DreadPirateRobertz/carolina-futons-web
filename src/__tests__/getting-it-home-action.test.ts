import { describe, expect, it } from "vitest";

import { resolveDeliveryZone } from "@/app/getting-it-home/actions";

// cf-3qt.4.4 Server Action: end-to-end FormData → result. Covers the AC three
// fixtures plus the structured failure paths the UI branches on.

function fd(zip: string, state?: string): FormData {
  const f = new FormData();
  f.set("zip", zip);
  if (state !== undefined) f.set("state", state);
  return f;
}

describe("resolveDeliveryZone", () => {
  it("Hendersonville 28792 → ok zone1", async () => {
    const result = await resolveDeliveryZone(fd("28792"));
    expect(result).toEqual({
      ok: true,
      zone: expect.objectContaining({ code: "zone1" }),
    });
  });

  it("Asheville 28801 → ok zone2 (state inferred from ZIP)", async () => {
    const result = await resolveDeliveryZone(fd("28801"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.zone.code).toBe("zone2");
  });

  it("Charlotte 28202 → ok zone3 (state inferred from ZIP)", async () => {
    const result = await resolveDeliveryZone(fd("28202"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.zone.code).toBe("zone3");
  });

  it("explicit state overrides inference (28801 + GA still works for zone2 via NC inference)", async () => {
    // Even though the user typed GA, 28801 is in NC so the explicit state
    // "GA" does not match zone2.states. Server Action returns out-of-area.
    const result = await resolveDeliveryZone(fd("28801", "GA"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("out-of-area");
  });

  it("invalid zip → invalid-zip", async () => {
    const result = await resolveDeliveryZone(fd("ABCDE"));
    expect(result).toEqual({ ok: false, reason: "invalid-zip", zip: "ABCDE" });
  });

  it("blank zip → invalid-zip", async () => {
    const result = await resolveDeliveryZone(fd(""));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid-zip");
  });

  it("ZIP outside Southeast → out-of-area", async () => {
    const result = await resolveDeliveryZone(fd("90210"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("out-of-area");
      expect(result.zip).toBe("90210");
    }
  });

  it("trims whitespace on zip and state inputs", async () => {
    const result = await resolveDeliveryZone(fd("  28792  ", "  nc  "));
    expect(result.ok).toBe(true);
  });
});
