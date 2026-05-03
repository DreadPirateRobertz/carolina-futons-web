import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/delivery-zone/route";

// cf-w2my: behavioral tests for /api/delivery-zone. Classification logic is
// covered helper-side in shipping-estimate.test.ts + local-zones.test.ts;
// these tests pin down the wire contract — request parsing, response shape,
// status codes, error vocabulary — at the route boundary.

function makeGet(zip?: string | null, params?: { weight?: number; palletized?: boolean }) {
  const url = new URL(
    zip == null
      ? "https://carolinafutons.com/api/delivery-zone"
      : `https://carolinafutons.com/api/delivery-zone?zip=${encodeURIComponent(zip)}`,
  );
  if (params?.weight !== undefined) url.searchParams.set("weight", String(params.weight));
  if (params?.palletized) url.searchParams.set("palletized", "true");
  return new Request(url.toString());
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

  it("returns LTL tier for a non-NC CONUS ZIP (Atlanta 30303) with no weight", async () => {
    const res = await GET(makeGet("30303"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      zone: "se",
      service: "ltl",
      tier: "ltl",
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
      tier: "ltl",
      eligible: true,
      estDays: { min: 3, max: 5 },
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
      tier: "ltl",
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
      tier: "unsupported",
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
      tier: "unsupported",
      eligible: false,
    });
  });

  it("trims surrounding whitespace before validating", async () => {
    const res = await GET(makeGet("  28739  "));
    expect(res.status).toBe(200);
    expect((await res.json()).zip).toBe("28739");
  });

  // Weight-based tier routing
  it("?zip=90210&weight=20 → parcel (light item, CONUS)", async () => {
    const res = await GET(makeGet("90210", { weight: 20 }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("parcel");
  });

  it("?zip=90210&weight=150 → ltl (medium item)", async () => {
    const res = await GET(makeGet("90210", { weight: 150 }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("ltl");
  });

  it("?zip=90210&weight=600 → freight (heavy item)", async () => {
    const res = await GET(makeGet("90210", { weight: 600 }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("freight");
  });

  it("?zip=28801&weight=20 → white-glove (NC always overrides weight)", async () => {
    const res = await GET(makeGet("28801", { weight: 20 }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("white-glove");
  });

  it("?zip=90210&palletized=true → freight (pallet flag overrides weight)", async () => {
    const res = await GET(makeGet("90210", { weight: 50, palletized: true }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("freight");
  });

  it("invalid weight param is ignored (falls back to ltl default)", async () => {
    const url = new URL("https://carolinafutons.com/api/delivery-zone?zip=90210&weight=abc");
    const res = await GET(new Request(url.toString()));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("ltl");
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
      tier: "ltl",
      eligible: true,
      estDays: { min: 7, max: 10 },
    });
  });

  // Weight-based tier routing via POST body
  it("{ zip, weight:20 } → parcel for CONUS non-NC ZIP", async () => {
    const res = await POST(makePost({ zip: "90210", weight: 20 }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("parcel");
  });

  it("{ zip, weight:150 } → ltl", async () => {
    const res = await POST(makePost({ zip: "90210", weight: 150 }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("ltl");
  });

  it("{ zip, weight:600 } → freight", async () => {
    const res = await POST(makePost({ zip: "90210", weight: 600 }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("freight");
  });

  it("{ zip, palletized:true } → freight regardless of weight", async () => {
    const res = await POST(makePost({ zip: "90210", weight: 30, palletized: true }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("freight");
  });

  it("negative weight is coerced to 0 (ltl default)", async () => {
    const res = await POST(makePost({ zip: "90210", weight: -10 }));
    expect(res.status).toBe(200);
    expect((await res.json()).tier).toBe("ltl");
  });
});
