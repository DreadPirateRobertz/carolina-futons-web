import { describe, it, expect } from "vitest";
import { getPhase } from "@/lib/hooks/useTimeOfDay";

describe("getPhase — boundary conditions", () => {
  it("h=0 → night", () => expect(getPhase(0)).toBe("night"));
  it("h=4 → night", () => expect(getPhase(4)).toBe("night"));
  it("h=5 → dawn", () => expect(getPhase(5)).toBe("dawn"));
  it("h=6 → dawn", () => expect(getPhase(6)).toBe("dawn"));
  it("h=7 → day", () => expect(getPhase(7)).toBe("day"));
  it("h=16 → day", () => expect(getPhase(16)).toBe("day"));
  it("h=17 → dusk", () => expect(getPhase(17)).toBe("dusk"));
  it("h=19 → dusk", () => expect(getPhase(19)).toBe("dusk"));
  it("h=20 → night", () => expect(getPhase(20)).toBe("night"));
  it("h=23 → night", () => expect(getPhase(23)).toBe("night"));
});
