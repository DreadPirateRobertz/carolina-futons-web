import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockListCollectionItems = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) =>
    mockListCollectionItems(...args),
}));

vi.mock("@/lib/env", () => ({
  optionalEnv: () => "https://www.carolinafutons.com",
  env: (k: string) => k,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ── Schema tests ──────────────────────────────────────────────────────────

import {
  validateSwatchIds,
  validateSwatchContactInfo,
  coerceSwatchContactInfo,
  hasSwatchContactErrors,
} from "@/lib/swatch-request/swatch-request-schema";

describe("validateSwatchIds", () => {
  it("rejects empty array", () => {
    expect(validateSwatchIds([])).toMatch(/at least one/i);
  });

  it("accepts 1 id", () => {
    expect(validateSwatchIds(["id1"])).toBeNull();
  });

  it("accepts 5 ids", () => {
    expect(
      validateSwatchIds(["a", "b", "c", "d", "e"]),
    ).toBeNull();
  });

  it("rejects more than 5 ids", () => {
    expect(
      validateSwatchIds(["a", "b", "c", "d", "e", "f"]),
    ).toMatch(/5/);
  });
});

describe("validateSwatchContactInfo", () => {
  const valid = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    address1: "123 Main St",
    city: "Hendersonville",
    state: "NC",
    zip: "28739",
  };

  it("passes valid contact", () => {
    const errors = validateSwatchContactInfo(valid);
    expect(hasSwatchContactErrors(errors)).toBe(false);
  });

  it("requires firstName", () => {
    const e = validateSwatchContactInfo({ ...valid, firstName: "" });
    expect(e.firstName).toBeTruthy();
  });

  it("requires lastName", () => {
    const e = validateSwatchContactInfo({ ...valid, lastName: "" });
    expect(e.lastName).toBeTruthy();
  });

  it("requires valid email", () => {
    const e = validateSwatchContactInfo({ ...valid, email: "not-an-email" });
    expect(e.email).toBeTruthy();
  });

  it("requires address1", () => {
    const e = validateSwatchContactInfo({ ...valid, address1: "" });
    expect(e.address1).toBeTruthy();
  });

  it("requires city", () => {
    const e = validateSwatchContactInfo({ ...valid, city: "" });
    expect(e.city).toBeTruthy();
  });

  it("requires state", () => {
    const e = validateSwatchContactInfo({ ...valid, state: "" });
    expect(e.state).toBeTruthy();
  });

  it("requires 5-digit zip", () => {
    const e1 = validateSwatchContactInfo({ ...valid, zip: "" });
    expect(e1.zip).toBeTruthy();
    const e2 = validateSwatchContactInfo({ ...valid, zip: "1234" });
    expect(e2.zip).toBeTruthy();
    const e3 = validateSwatchContactInfo({ ...valid, zip: "12345" });
    expect(e3.zip).toBeUndefined();
  });
});

describe("coerceSwatchContactInfo", () => {
  it("trims all string fields", () => {
    const result = coerceSwatchContactInfo({
      firstName: "  Jane  ",
      lastName: "  Doe  ",
      email: "  JANE@EXAMPLE.COM  ",
      address1: "  123 Main St  ",
      city: "  Charlotte  ",
      state: "  NC  ",
      zip: "  28202  ",
    });
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.email).toBe("jane@example.com");
    expect(result.zip).toBe("28202");
  });

  it("coerces missing optional phone/address2 to undefined", () => {
    const result = coerceSwatchContactInfo({ phone: "", address2: "" });
    expect(result.phone).toBeUndefined();
    expect(result.address2).toBeUndefined();
  });

  it("preserves phone and address2 when provided", () => {
    const result = coerceSwatchContactInfo({
      phone: "555-1234",
      address2: "Apt 2B",
    });
    expect(result.phone).toBe("555-1234");
    expect(result.address2).toBe("Apt 2B");
  });
});

// ── listSwatchesAction ────────────────────────────────────────────────────

describe("listSwatchesAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns sorted swatches from CMS", async () => {
    mockListCollectionItems.mockResolvedValueOnce([
      {
        _id: "s2",
        swatchName: "Navy",
        colorFamily: "Blue",
        colorHex: "#001f5b",
        sortOrder: 2,
      },
      {
        _id: "s1",
        swatchName: "Cream",
        colorFamily: "Neutral",
        colorHex: "#f5f0e8",
        sortOrder: 1,
      },
    ]);
    const { listSwatchesAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await listSwatchesAction();
    expect(result.error).toBeUndefined();
    expect(result.items[0].swatchName).toBe("Cream");
    expect(result.items[1].swatchName).toBe("Navy");
    expect(mockListCollectionItems).toHaveBeenCalledWith("FabricSwatches", 100);
  });

  it("calls Sentry.captureException on CMS failure", async () => {
    const { captureException } = await import("@sentry/nextjs");
    const captureSpy = vi.mocked(captureException);
    mockListCollectionItems.mockRejectedValueOnce(new Error("wix down"));
    const { listSwatchesAction } = await import("@/app/actions/swatch-request");
    await listSwatchesAction();
    expect(captureSpy).toHaveBeenCalledOnce();
    const [, opts] = captureSpy.mock.calls[0];
    expect((opts as { extra: { errorId: string } }).extra.errorId).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  it("returns error:true on CMS failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockListCollectionItems.mockRejectedValueOnce(new Error("wix down"));
    const { listSwatchesAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await listSwatchesAction();
    expect(result.items).toEqual([]);
    expect(result.error).toBe(true);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("sorts items without sortOrder using 0 as default", async () => {
    mockListCollectionItems.mockResolvedValueOnce([
      { _id: "s1", swatchName: "A" },
      { _id: "s2", swatchName: "B", sortOrder: 1 },
    ]);
    const { listSwatchesAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await listSwatchesAction();
    // Both without sortOrder (0) and with sortOrder (1) — A comes first
    expect(result.items[0].swatchName).toBe("A");
  });
});

// ── submitSwatchRequestAction ─────────────────────────────────────────────

const VALID_FORM_DATA = {
  swatchIds: ["s1", "s2"],
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  address1: "123 Main St",
  city: "Hendersonville",
  state: "NC",
  zip: "28739",
};

function makeFormData(
  overrides: Partial<typeof VALID_FORM_DATA & { "cf-turnstile-response"?: string }> = {},
): FormData {
  const fd = new FormData();
  const data = { ...VALID_FORM_DATA, ...overrides };
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      for (const item of v) fd.append(k, item);
    } else if (v !== undefined) {
      fd.set(k, String(v));
    }
  }
  return fd;
}

describe("submitSwatchRequestAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns validation error when no swatches selected", async () => {
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const fd = makeFormData({ swatchIds: [] });
    const result = await submitSwatchRequestAction(null, fd);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errors.swatchIds).toMatch(/at least one/i);
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns validation error when too many swatches selected", async () => {
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const fd = makeFormData({ swatchIds: ["a", "b", "c", "d", "e", "f"] });
    const result = await submitSwatchRequestAction(null, fd);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errors.swatchIds).toMatch(/5/);
    }
  });

  it("returns contact validation errors with missing required fields", async () => {
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const fd = makeFormData({ email: "" });
    const result = await submitSwatchRequestAction(null, fd);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errors.contact?.email).toBeTruthy();
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("echoes back submitted values on validation error", async () => {
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const fd = makeFormData({ email: "" });
    const result = await submitSwatchRequestAction(null, fd);
    if (result.status === "error") {
      expect(result.values.firstName).toBe("Jane");
      expect(result.selectedIds).toEqual(["s1", "s2"]);
    }
  });

  it("returns success on 200 from Velo", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, makeFormData());
    expect(result.status).toBe("success");
  });

  it("posts correct shape to Velo endpoint", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    await submitSwatchRequestAction(null, makeFormData());
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/_functions/sampleRequests");
    const body = JSON.parse(init.body as string);
    expect(body.swatchIds).toEqual(["s1", "s2"]);
    expect(body.contactInfo.email).toBe("jane@example.com");
    expect(body.contactInfo.firstName).toBe("Jane");
  });

  it("returns rate-limit error on 429", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, makeFormData());
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.transportError).toMatch(/try again/i);
    }
  });

  it("returns generic transport error on 500", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: "Internal server error" }),
    } as Response);
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, makeFormData());
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.transportError).toBeTruthy();
    }
  });

  it("returns generic error on fetch throw", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, makeFormData());
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.transportError).toBeTruthy();
    }
  });

  it("returns generic error on 400 (Velo error not echoed to user)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: "At least one swatch must be selected.",
      }),
    } as Response);
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, makeFormData());
    if (result.status === "error") {
      // Raw Velo error strings are never echoed — always show generic copy
      expect(result.transportError).toMatch(/couldn't submit/i);
      expect(result.transportError).not.toContain("swatch must");
    }
  });

  it("blocks submission when secret key set but token missing", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-key";
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, makeFormData());
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.transportError).toMatch(/captcha/i);
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("blocks submission when token present but Cloudflare rejects it", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-key";
    // First fetch is Turnstile verify (returns failure), Velo fetch should never fire
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: false }),
    } as Response);
    const fd = makeFormData();
    fd.set("cf-turnstile-response", "bad-token");
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, fd);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.transportError).toMatch(/captcha/i);
    }
    // Velo fetch should NOT have been called
    const veloCalls = mockFetch.mock.calls.filter((args: unknown[]) =>
      String(args[0]).includes("sampleRequests"),
    );
    expect(veloCalls).toHaveLength(0);
  });

  it("returns network-error copy when Turnstile verify fetch throws", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-key";
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    const fd = makeFormData();
    fd.set("cf-turnstile-response", "some-token");
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, fd);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.transportError).toMatch(/couldn't verify/i);
    }
  });

  it("hard-fails in production when TURNSTILE_SECRET_KEY is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, makeFormData());
    expect(result.status).toBe("error");
    expect(mockFetch).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("skips Turnstile when secret key not configured outside production", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    // NODE_ENV is "test" by default — no secret, no production guard
    const result = await submitSwatchRequestAction(null, makeFormData());
    expect(result.status).toBe("success");
  });

  it("returns both swatch and contact errors simultaneously", async () => {
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const fd = makeFormData({ swatchIds: [], email: "" });
    const result = await submitSwatchRequestAction(null, fd);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errors.swatchIds).toBeTruthy();
      expect(result.errors.contact?.email).toBeTruthy();
    }
  });

  it("treats whitespace-only required fields as empty", async () => {
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const fd = makeFormData({ firstName: "   " });
    const result = await submitSwatchRequestAction(null, fd);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errors.contact?.firstName).toBeTruthy();
    }
  });

  it("falls back to generic error when Velo error body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error("not json"); },
    } as unknown as Response);
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    const result = await submitSwatchRequestAction(null, makeFormData());
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.transportError).toMatch(/couldn't submit/i);
    }
  });

  it("includes productSlug in payload when provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const fd = makeFormData();
    fd.set("productSlug", "bamboo-cotton-twist");
    const { submitSwatchRequestAction } = await import(
      "@/app/actions/swatch-request"
    );
    await submitSwatchRequestAction(null, fd);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.productSlug).toBe("bamboo-cotton-twist");
  });
});
