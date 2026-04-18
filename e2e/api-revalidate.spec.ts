import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";

// E2E pins the webhook contract that unit tests cover at the handler level:
//   1. missing signature → 401
//   2. bad signature    → 401
//   3. valid signature  → 200 with derived tags echoed back
//
// The unit suite (src/__tests__/revalidate.test.ts) exercises the same branches
// in isolation. This spec confirms the wiring end-to-end: middleware chain,
// content-type negotiation, status propagation. It intentionally does NOT try
// to observe Next's internal revalidateTag side-effect — that's the unit
// test's job, and observing it from a spawned dev server is flaky.
//
// Requires WIX_WEBHOOK_SECRET to be set in the Playwright environment.

const SECRET = process.env.WIX_WEBHOOK_SECRET ?? "";

function sign(body: string): string {
  return "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
}

test.describe("POST /api/revalidate", () => {
  test.skip(
    !SECRET,
    "WIX_WEBHOOK_SECRET not set — skipping e2e until CI env is configured",
  );

  test("rejects requests with no signature", async ({ request }) => {
    const res = await request.post("/api/revalidate", {
      data: { collectionId: "Promotions" },
    });
    expect(res.status()).toBe(401);
  });

  test("rejects requests with a bad signature", async ({ request }) => {
    const res = await request.post("/api/revalidate", {
      data: { collectionId: "Promotions" },
      headers: { "x-wix-signature": "sha256=deadbeef" },
    });
    expect(res.status()).toBe(401);
  });

  test("returns 200 + echoes derived tags when signature is valid", async ({
    request,
  }) => {
    const body = JSON.stringify({
      collectionId: "Promotions",
      itemId: "abc123",
      eventType: "ItemUpdated",
    });
    const res = await request.post("/api/revalidate", {
      data: body,
      headers: {
        "x-wix-signature": sign(body),
        "content-type": "application/json",
      },
    });
    expect(res.status()).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      revalidated: string[];
      eventType: string | null;
    };
    expect(json.ok).toBe(true);
    expect(json.revalidated).toEqual(
      expect.arrayContaining([
        "wix:collection:Promotions",
        "wix:item:abc123",
      ]),
    );
    expect(json.eventType).toBe("ItemUpdated");
  });

  test("rejects malformed JSON with 400", async ({ request }) => {
    const raw = "{not-json";
    const res = await request.post("/api/revalidate", {
      data: raw,
      headers: {
        "x-wix-signature": sign(raw),
        "content-type": "application/json",
      },
    });
    expect(res.status()).toBe(400);
  });
});
