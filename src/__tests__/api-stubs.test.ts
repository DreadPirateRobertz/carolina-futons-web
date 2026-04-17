import { describe, it, expect } from "vitest";

describe("not-implemented API stubs", () => {
  it("POST /api/contact returns 501", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST();
    expect(res.status).toBe(501);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("not-implemented");
  });

  it("POST /api/newsletter returns 501", async () => {
    const { POST } = await import("@/app/api/newsletter/route");
    const res = await POST();
    expect(res.status).toBe(501);
  });

  it("GET /api/delivery-zone returns 501", async () => {
    const { GET } = await import("@/app/api/delivery-zone/route");
    const res = await GET();
    expect(res.status).toBe(501);
  });
});
