import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// cf-3qt.4.6: Server Action now hands off to /_functions/contactSubmissions
// instead of nodemailer. The action keeps validation (shared with the
// client) and translates Velo HTTP responses into the ContactActionState
// shape that `useActionState` renders from.

const ENDPOINT =
  "https://www.carolinafutons.com/_functions/contactSubmissions";

let fetchMock: ReturnType<typeof vi.fn>;

function fd(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  return data;
}

const VALID = {
  name: "Jane Customer",
  email: "jane@example.com",
  subject: "Question about the Monterey",
  message: "Hi — do you ship to Asheville? Thanks.",
};

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  // The default WIX_VELO_SITE_URL in src/lib/env.ts is the prod URL; tests
  // do not override it so they exercise the same string a deploy would.
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendContactForm — validation (no network)", () => {
  it("returns field errors when required fields are missing", async () => {
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(
      null,
      fd({ name: "", email: "", subject: "", message: "" }),
    );
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.subject).toBeTruthy();
    expect(result.errors.message).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns email-shape error for malformed email", async () => {
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(
      null,
      fd({ ...VALID, email: "not-an-email" }),
    );
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.email).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns message-length error for too-short messages", async () => {
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd({ ...VALID, message: "hi" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.message).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sendContactForm — Velo handoff", () => {
  it("POSTs the validated request to /_functions/contactSubmissions", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(ENDPOINT);
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as { body: string }).body);
    expect(body.name).toBe(VALID.name);
    expect(body.email).toBe(VALID.email);
    expect(body.subject).toBe(VALID.subject);
    expect(body.message).toBe(VALID.message);
  });

  it("forwards optional phone field when provided", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const { sendContactForm } = await import("@/app/contact/actions");
    await sendContactForm(null, fd({ ...VALID, phone: "828-555-0100" }));
    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as { body: string }).body,
    );
    expect(body.phone).toBe("828-555-0100");
  });

  it("returns generic transportError when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
    expect(result.values.email).toBe(VALID.email);
  });

  it("returns rate-limit copy when Velo responds 429", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: "Too many requests…" }),
        { status: 429 },
      ),
    );
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toMatch(/few minutes/i);
  });

  it("surfaces Velo-supplied error message on 400", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400 },
      ),
    );
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBe("Invalid email format");
  });

  it("falls back to generic copy when Velo body is unparseable", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("{ broken", { status: 500 }),
    );
    const { sendContactForm } = await import("@/app/contact/actions");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
  });
});
