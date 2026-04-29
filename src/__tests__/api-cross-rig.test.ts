import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Auth constant — mirrors the route's env var name
const TEST_SECRET = "test-cross-rig-secret";

function makeRequest(
  body: unknown,
  opts: { secret?: string | null; method?: string } = {},
): NextRequest {
  const { secret = TEST_SECRET, method = "POST" } = opts;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret !== null) headers["x-cross-rig-secret"] = secret;
  return new NextRequest("http://localhost/api/cross-rig", {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

const VALID_BASE = {
  memberId: "member-abc123",
  sourceRig: "cfutons_mobile",
  payload: {},
};

beforeEach(() => {
  vi.stubEnv("CROSS_RIG_SECRET", TEST_SECRET);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// Lazy import after env is stubbed
async function route() {
  const mod = await import("@/app/api/cross-rig/route");
  return mod.POST;
}

describe("POST /api/cross-rig — auth", () => {
  it("returns 401 when secret header is missing", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BASE, event: "badge_earned" }, { secret: null }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when secret header is wrong", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BASE, event: "badge_earned" }, { secret: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("accepts request with correct secret", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BASE, event: "badge_earned", payload: { badgeId: "b1" } }));
    expect(res.status).toBe(200);
  });

  it("skips auth check when CROSS_RIG_SECRET env is not set", async () => {
    vi.unstubAllEnvs();
    const { POST } = await import("@/app/api/cross-rig/route");
    const res = await POST(makeRequest({ ...VALID_BASE, event: "badge_earned" }, { secret: null }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/cross-rig — schema validation", () => {
  it("returns 400 when memberId is missing", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ event: "badge_earned", sourceRig: "cfutons_mobile", payload: {} }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/memberId/i);
  });

  it("returns 400 when sourceRig is unknown", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BASE, event: "badge_earned", sourceRig: "unknown_rig" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/sourceRig/i);
  });

  it("returns 400 when event is missing", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BASE }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/event/i);
  });

  it("returns 400 when event is unsupported", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BASE, event: "streak_extended" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unsupported event/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const POST = await route();
    const req = new NextRequest("http://localhost/api/cross-rig", {
      method: "POST",
      headers: { "content-type": "application/json", "x-cross-rig-secret": TEST_SECRET },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/cross-rig — quiz_completed", () => {
  it("returns 200 for valid quiz_completed", async () => {
    const POST = await route();
    const res = await POST(makeRequest({
      ...VALID_BASE,
      event: "quiz_completed",
      payload: { quizId: "q1", resultSlug: "cozy-futon", score: 8, total: 10 },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 when quiz_completed payload lacks quizId", async () => {
    const POST = await route();
    const res = await POST(makeRequest({
      ...VALID_BASE,
      event: "quiz_completed",
      payload: { resultSlug: "cozy-futon" },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/quizId/i);
  });

  it("returns 400 when quiz_completed payload lacks resultSlug", async () => {
    const POST = await route();
    const res = await POST(makeRequest({
      ...VALID_BASE,
      event: "quiz_completed",
      payload: { quizId: "q1" },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/resultSlug/i);
  });
});

describe("POST /api/cross-rig — ar_discovery_completed", () => {
  it("returns 200 for valid ar_discovery_completed", async () => {
    const POST = await route();
    const res = await POST(makeRequest({
      ...VALID_BASE,
      event: "ar_discovery_completed",
      payload: { productId: "prod-1", score: 75, platform: "ios" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 for ar_discovery_completed with empty payload", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BASE, event: "ar_discovery_completed", payload: {} }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/cross-rig — social_share_completed", () => {
  it("returns 200 for valid social_share_completed", async () => {
    const POST = await route();
    const res = await POST(makeRequest({
      ...VALID_BASE,
      event: "social_share_completed",
      payload: { productId: "prod-1", platform: "instagram" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("POST /api/cross-rig — badge_earned", () => {
  it("returns 200 for valid badge_earned", async () => {
    const POST = await route();
    const res = await POST(makeRequest({
      ...VALID_BASE,
      event: "badge_earned",
      payload: { badgeId: "badge-pioneer" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("logs badge_earned event with memberId and badgeId", async () => {
    const POST = await route();
    await POST(makeRequest({
      ...VALID_BASE,
      event: "badge_earned",
      payload: { badgeId: "badge-pioneer" },
    }));
    expect(console.log).toHaveBeenCalledWith(
      "[cross-rig]",
      expect.stringContaining("badge_earned"),
    );
  });
});

describe("POST /api/cross-rig — tier_changed", () => {
  it("returns 200 for valid tier_changed", async () => {
    const POST = await route();
    const res = await POST(makeRequest({
      ...VALID_BASE,
      event: "tier_changed",
      payload: { newTier: "gold" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 when tier_changed payload lacks newTier", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BASE, event: "tier_changed", payload: {} }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/newTier/i);
  });
});

describe("POST /api/cross-rig — response shape", () => {
  it("successful response includes event and memberId echo", async () => {
    const POST = await route();
    const res = await POST(makeRequest({
      ...VALID_BASE,
      event: "badge_earned",
      payload: { badgeId: "b1" },
    }));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.event).toBe("badge_earned");
    expect(body.memberId).toBe("member-abc123");
  });

  it("error response body always has success:false and error string", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BASE, event: "unknown_event" }));
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });
});
