import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/delivery-zone/route";

// cf-w2my: behavioral tests for /api/delivery-zone. Classification logic is
// covered helper-side in shipping-estimate.test.ts + local-zones.test.ts;
// these tests pin down the wire contract — request parsing, response shape,
// status codes, error vocabulary — at the route boundary.

function makeGet(zip?: string | null) {
  const url = zip == null
    ? "https://carolinafutons.com/api/delivery-zone"
    : `https://carolinafutons.com/api/delivery-zone?zip=${encodeURIComponent(zip)}`;
  return new Request(url);
}

function makePost(body: unknown, { rawBody }: { rawBody?: string } = {}) {
  return new Request("https://carolinafutons.com/api/delivery-zone", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rawBody ?? JSON.stringify(body),
  });
}

describe("GET /api/delivery-zone", () => {
  it("returns 400 missing-zip when ?zip is absent", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "missing-zip" });
  });

  it("returns 400 invalid-zip for non-5-digit input", async () => {
    const res = await GET(makeGet("28A39"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid-zip" });
  });

  it("returns NC white-glove tier for an in-state ZIP", async () => {
    const res = await GET(makeGet("28739"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      zip: "28739",
      zone: "nc",
      eligible: true,
      service: "white-glove",
      tier: "white-glove",
      estDays: { min: 1, max: 2 },
      label: "Free white-glove delivery",
    });
  });

  it("returns LTL tier for a non-NC CONUS ZIP (Atlanta 30303)", async () => {
    const res = await GET(makeGet("30303"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      zone: "se",
      service: "ltl",
      eligible: true,
      estDays: { min: 2, max: 3 },
    });
  });

  it("classifies a Mid-Atlantic ZIP (DC 20001) as 'mid' LTL", async () => {
    const res = await GET(makeGet("20001"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      zone: "mid",
      service: "ltl",
      eligible: true,
      estDays: { min: 3, max: 5 },
      label: "LTL freight delivery",
    });
  });

  it("classifies a West Coast ZIP (Beverly Hills 90210) as 'west' LTL", async () => {
    const res = await GET(makeGet("90210"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      zone: "west",
      service: "ltl",
      eligible: true,
      estDays: { min: 5, max: 7 },
    });
  });

  it("marks AK/HI as ineligible (unsupported service)", async () => {
    const res = await GET(makeGet("99701"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      zone: "akhi",
      service: "unsupported",
      eligible: false,
    });
  });

  it.each([
    ["00601", "Puerto Rico"],
    ["00801", "USVI"],
    ["09001", "APO Europe"],
    ["96201", "APO Pacific"],
    ["34001", "APO Americas"],
  ])("marks territory ZIP %s (%s) as ineligible", async (zip) => {
    const res = await GET(makeGet(zip));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      zone: "territory",
      service: "unsupported",
      eligible: false,
      label: "Outside our delivery area",
    });
  });

  it("trims surrounding whitespace before validating", async () => {
    const res = await GET(makeGet("  28739  "));
    expect(res.status).toBe(200);
    expect((await res.json()).zip).toBe("28739");
  });
});

describe("POST /api/delivery-zone", () => {
  it("returns 400 missing-zip when body has no zip field", async () => {
    const res = await POST(makePost({ unrelated: true }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "missing-zip" });
  });

  it("returns 400 missing-zip for an empty-string zip", async () => {
    const res = await POST(makePost({ zip: "" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "missing-zip" });
  });

  it("returns 400 invalid-zip for malformed input", async () => {
    const res = await POST(makePost({ zip: "0000" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid-zip" });
  });

  it("returns 400 missing-zip for a non-string zip", async () => {
    const res = await POST(makePost({ zip: 28739 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "missing-zip" });
  });

  it("returns 400 invalid-json for malformed body — distinct from missing-zip", async () => {
    const res = await POST(makePost(undefined, { rawBody: "{ not json" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid-json" });
  });

  it("returns NC white-glove tier for valid in-state ZIP", async () => {
    const res = await POST(makePost({ zip: "28739" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      zip: "28739",
      zone: "nc",
      eligible: true,
      service: "white-glove",
      tier: "white-glove",
      estDays: { min: 1, max: 2 },
      label: "Free white-glove delivery",
    });
  });

  it("returns 'other' fallback (LTL, conservative window) for unmapped CONUS ZIP", async () => {
    const res = await POST(makePost({ zip: "00000" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      zone: "other",
      service: "ltl",
      eligible: true,
      estDays: { min: 7, max: 10 },
    });
  });
});
