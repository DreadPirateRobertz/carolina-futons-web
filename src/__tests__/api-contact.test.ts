import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/contact/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://test.local/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Kingston frame question",
  message: "Is the Kingston frame still in stock this month?",
};

describe("POST /api/contact", () => {
  it("returns 200 + { ok: true } on a valid submission", async () => {
    const res = await POST(jsonRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("returns 400 + field errors when required fields are missing", async () => {
    const res = await POST(
      jsonRequest({ name: "", email: "", subject: "", message: "" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("validation");
    expect(body.errors.name).toBeTruthy();
    expect(body.errors.email).toBeTruthy();
    expect(body.errors.subject).toBeTruthy();
    expect(body.errors.message).toBeTruthy();
  });

  it("returns 400 validation when email is malformed", async () => {
    const res = await POST(jsonRequest({ ...validBody, email: "nope" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errors.email).toMatch(/email/i);
    expect(body.errors.name).toBeUndefined();
  });

  it("returns 400 invalid-json when the body is not valid JSON", async () => {
    const req = new Request("http://test.local/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid-json");
  });

  it("ignores unknown fields rather than 500-ing", async () => {
    const res = await POST(
      jsonRequest({ ...validBody, robotField: "<script>", __proto__: { poison: 1 } }),
    );
    expect(res.status).toBe(200);
  });
});
