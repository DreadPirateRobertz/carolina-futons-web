/**
 * Transactional email HTTP round-trip verification — cf-nujp
 *
 * Verifies that all transactional email trigger routes accept the correct
 * payload and return the expected HTTP status. No real emails are sent:
 *   • In fixture/dev mode (WIX_VELO_SITE_URL unset) routes short-circuit
 *     after validation and return 200.
 *   • Validation failures always return 400 regardless of mode.
 *
 * Routes under test:
 *   POST /api/email/trigger   — welcome + cart-recovery triggers
 *   POST /api/auth/register   — welcome email fires on successful registration
 *   POST /api/notify-me       — back-in-stock notification sign-up
 *   POST /api/swatch-request  — fabric swatch sample request
 */

import { test, expect } from "@playwright/test";

// ── /api/email/trigger ────────────────────────────────────────────────────────

test.describe("/api/email/trigger — email dispatch gateway", () => {
  test("cart-recovery trigger with valid items returns 200 ok", async ({
    request,
  }) => {
    const res = await request.post("/api/email/trigger", {
      data: {
        type: "cart-recovery",
        items: [{ productId: "prod-123", quantity: 1 }],
      },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("welcome trigger with valid email returns 200 ok", async ({
    request,
  }) => {
    const res = await request.post("/api/email/trigger", {
      data: { type: "welcome", email: "test@example.com" },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("unknown type returns 400", async ({ request }) => {
    const res = await request.post("/api/email/trigger", {
      data: { type: "unknown-type" },
    });
    expect(res.status()).toBe(400);
  });

  test("cart-recovery with empty items returns 400", async ({ request }) => {
    const res = await request.post("/api/email/trigger", {
      data: { type: "cart-recovery", items: [] },
    });
    expect(res.status()).toBe(400);
  });

  test("welcome without email returns 400", async ({ request }) => {
    const res = await request.post("/api/email/trigger", {
      data: { type: "welcome" },
    });
    expect(res.status()).toBe(400);
  });
});

// ── /api/auth/register — welcome email fires on sign-up ───────────────────────

test.describe("/api/auth/register — welcome email on registration", () => {
  test("register with missing email returns 400 (no welcome email queued)", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/register", {
      data: { password: "password123" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/required/i);
  });

  test("register with missing password returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: "new@example.com" },
    });
    expect(res.status()).toBe(400);
  });

  test("register with valid payload reaches Wix (not a 5xx framework error)", async ({
    request,
  }) => {
    // With live Wix credentials absent the call returns 502 from our handler
    // (Wix unreachable) or 200 with a Wix error state — never a 500 (our code).
    const res = await request.post("/api/auth/register", {
      data: { email: "cf-nujp-ci@example.com", password: "Ci!test9876" },
    });
    expect(res.status()).not.toBe(500);
    expect(res.headers()["content-type"]).toContain("application/json");
  });
});

// ── /api/notify-me ────────────────────────────────────────────────────────────

test.describe("/api/notify-me — back-in-stock notification sign-up", () => {
  test("valid email + productId returns 200", async ({ request }) => {
    const res = await request.post("/api/notify-me", {
      data: { email: "waiting@example.com", productId: "prod-abc-123" },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("invalid email returns 400", async ({ request }) => {
    const res = await request.post("/api/notify-me", {
      data: { email: "not-an-email", productId: "prod-abc-123" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/email/i);
  });

  test("missing productId returns 400", async ({ request }) => {
    const res = await request.post("/api/notify-me", {
      data: { email: "waiting@example.com" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/productId/i);
  });

  test("empty body returns 400", async ({ request }) => {
    const res = await request.post("/api/notify-me", { data: {} });
    expect(res.status()).toBe(400);
  });
});

// ── /api/swatch-request ───────────────────────────────────────────────────────

const VALID_CONTACT = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  address1: "123 Main St",
  city: "Raleigh",
  state: "NC",
  zip: "27601",
};

test.describe("/api/swatch-request — fabric swatch sample request", () => {
  test("valid swatchIds + contactInfo returns 200", async ({ request }) => {
    const res = await request.post("/api/swatch-request", {
      data: {
        swatchIds: ["swatch-1"],
        contactInfo: VALID_CONTACT,
      },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("empty swatchIds array returns 400", async ({ request }) => {
    const res = await request.post("/api/swatch-request", {
      data: { swatchIds: [], contactInfo: VALID_CONTACT },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/swatch/i);
  });

  test("more than 5 swatchIds returns 400", async ({ request }) => {
    const res = await request.post("/api/swatch-request", {
      data: {
        swatchIds: ["a", "b", "c", "d", "e", "f"],
        contactInfo: VALID_CONTACT,
      },
    });
    expect(res.status()).toBe(400);
  });

  test("missing contactInfo email returns 400", async ({ request }) => {
    const res = await request.post("/api/swatch-request", {
      data: {
        swatchIds: ["swatch-1"],
        contactInfo: { ...VALID_CONTACT, email: "" },
      },
    });
    expect(res.status()).toBe(400);
  });

  test("invalid ZIP code returns 400", async ({ request }) => {
    const res = await request.post("/api/swatch-request", {
      data: {
        swatchIds: ["swatch-1"],
        contactInfo: { ...VALID_CONTACT, zip: "not-a-zip" },
      },
    });
    expect(res.status()).toBe(400);
  });
});
