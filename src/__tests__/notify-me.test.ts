// cfw-hd8t: contract tests for submitNotifyMe's logger migration.
// Pins the three logError sites: config (WIX_VELO_SITE_URL unset),
// veloResponse (HTTP non-ok), fetch (throws). Each ships as a distinct
// `op` so Sentry groups them separately for alerting.

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { NotifyMeState } from "@/app/actions/notify-me";

const mockLogError = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

function makeForm(email: string, productId: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("productId", productId);
  return fd;
}

const idle = { status: "idle" } as NotifyMeState;

beforeEach(() => {
  mockLogError.mockReset();
  vi.unstubAllGlobals();
  process.env.WIX_VELO_SITE_URL = "https://velo.example.com";
});

describe("submitNotifyMe — logger migration (cfw-hd8t)", () => {
  it("misconfig (no WIX_VELO_SITE_URL): logError op=config, returns generic error", async () => {
    delete process.env.WIX_VELO_SITE_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { submitNotifyMe } = await import("@/app/actions/notify-me");
    const result = await submitNotifyMe(idle, makeForm("a@b.com", "p1"));

    expect(result.status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith(
      "notify-me",
      "config",
      expect.any(Error),
    );
  });

  it("Velo HTTP non-ok (5xx): logError op=veloResponse with httpStatus in extras", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const { submitNotifyMe } = await import("@/app/actions/notify-me");
    const result = await submitNotifyMe(idle, makeForm("a@b.com", "p1"));

    expect(result.status).toBe("error");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mockLogError).toHaveBeenCalledWith(
      "notify-me",
      "veloResponse",
      expect.any(Error),
      expect.objectContaining({ httpStatus: 503 }),
    );
  });

  it("fetch throws (network / timeout): logError op=fetch with raw err", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("AbortError"));
    vi.stubGlobal("fetch", fetchMock);

    const { submitNotifyMe } = await import("@/app/actions/notify-me");
    const result = await submitNotifyMe(idle, makeForm("a@b.com", "p1"));

    expect(result.status).toBe("error");
    expect(mockLogError).toHaveBeenCalledWith(
      "notify-me",
      "fetch",
      expect.any(Error),
    );
  });
});
