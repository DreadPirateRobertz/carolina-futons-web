import { describe, it, expect, beforeEach, vi } from "vitest";

import { SPIN_PRIZES, initialSpinActionState } from "@/app/spin/spin-state";

// Cookie store shared across mock and tests
const cookieStore = new Map<string, { value: string; maxAge?: number }>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string, opts?: { maxAge?: number }) => {
      cookieStore.set(name, { value, maxAge: opts?.maxAge });
    },
    delete: (name: string) => { cookieStore.delete(name); },
  }),
}));

// Prevent actual fetch calls to Wix backend
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

import { spinWheel } from "@/app/actions/spin";

beforeEach(() => {
  cookieStore.clear();
  vi.spyOn(Date, "now").mockReturnValue(1_000_000_000_000);
});

describe("spinWheel — first spin", () => {
  it("returns success with a prize on the first spin", async () => {
    const result = await spinWheel(initialSpinActionState);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(SPIN_PRIZES.some((p) => p.id === result.prize.id)).toBe(true);
      expect(result.cooldownHours).toBe(24);
    }
  });

  it("sets the cf_spin_last cookie after a spin", async () => {
    await spinWheel(initialSpinActionState);
    expect(cookieStore.has("cf_spin_last")).toBe(true);
    expect(cookieStore.get("cf_spin_last")?.value).toBe("1000000000000");
  });
});

describe("spinWheel — cooldown enforcement", () => {
  it("returns error when spun within 24-hour cooldown", async () => {
    // Simulate a spin 1 hour ago
    const oneHourAgo = 1_000_000_000_000 - 60 * 60 * 1000;
    cookieStore.set("cf_spin_last", { value: String(oneHourAgo) });

    const result = await spinWheel(initialSpinActionState);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error).toMatch(/come back in/i);
      expect(result.error).toMatch(/23 hour/);
    }
  });

  it("allows a new spin after the 24-hour cooldown expires", async () => {
    // Simulate a spin 25 hours ago
    const twentyFiveHoursAgo = 1_000_000_000_000 - 25 * 60 * 60 * 1000;
    cookieStore.set("cf_spin_last", { value: String(twentyFiveHoursAgo) });

    const result = await spinWheel(initialSpinActionState);
    expect(result.status).toBe("success");
  });
});
