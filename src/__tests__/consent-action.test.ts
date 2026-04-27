import { describe, it, expect, vi, beforeEach } from "vitest";

const cookieMock = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(cookieMock),
}));

beforeEach(() => {
  cookieMock.set.mockReset();
  cookieMock.get.mockReset();
});

describe("setConsentMap", () => {
  it("stores the map as JSON in cf_consent", async () => {
    const { setConsentMap } = await import("@/app/actions/consent");
    const map = {
      analytics_storage: "granted" as const,
      ad_storage: "denied" as const,
      ad_user_data: "denied" as const,
      ad_personalization: "granted" as const,
    };
    const result = await setConsentMap(map);
    expect(result).toEqual({ ok: true });
    expect(cookieMock.set).toHaveBeenCalledWith(
      "cf_consent",
      JSON.stringify(map),
      expect.objectContaining({ httpOnly: false, path: "/" }),
    );
  });

  it("returns ok:false for an invalid map shape", async () => {
    const { setConsentMap } = await import("@/app/actions/consent");
    // @ts-expect-error — intentionally malformed
    const result = await setConsentMap({ analytics_storage: "yes" });
    expect(result).toEqual({ ok: false });
    expect(cookieMock.set).not.toHaveBeenCalled();
  });

  it("returns ok:false when a signal value is missing", async () => {
    const { setConsentMap } = await import("@/app/actions/consent");
    // @ts-expect-error — intentionally malformed
    const result = await setConsentMap({
      analytics_storage: "granted",
      ad_storage: "denied",
      // ad_user_data missing
      ad_personalization: "granted",
    });
    expect(result).toEqual({ ok: false });
  });
});

describe("setConsentChoice (unchanged)", () => {
  it("stores the binary string for 'granted'", async () => {
    const { setConsentChoice } = await import("@/app/actions/consent");
    const result = await setConsentChoice("granted");
    expect(result).toEqual({ ok: true });
    expect(cookieMock.set).toHaveBeenCalledWith(
      "cf_consent",
      "granted",
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it("stores the binary string for 'denied'", async () => {
    const { setConsentChoice } = await import("@/app/actions/consent");
    const result = await setConsentChoice("denied");
    expect(result).toEqual({ ok: true });
    expect(cookieMock.set).toHaveBeenCalledWith("cf_consent", "denied", expect.any(Object));
  });

  it("returns ok:false for 'unknown'", async () => {
    const { setConsentChoice } = await import("@/app/actions/consent");
    const result = await setConsentChoice("unknown");
    expect(result).toEqual({ ok: false });
    expect(cookieMock.set).not.toHaveBeenCalled();
  });
});
