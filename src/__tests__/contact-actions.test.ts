import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { sendContactForm } from "@/app/contact/actions";

// Endpoint mirrors the WIX_VELO_SITE_URL default in src/lib/env.ts; if that
// default ever changes, this constant must move with it.
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
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendContactForm — validation (no network)", () => {
  it("returns field errors when required fields are missing", async () => {
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
    const result = await sendContactForm(null, fd({ ...VALID, message: "hi" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.message).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sendContactForm — Velo handoff", () => {
  function ok(body: object = { success: true }) {
    return new Response(JSON.stringify(body), { status: 200 });
  }

  it("POSTs the validated request as JSON with no-store + content-type", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect((init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
    expect(init.signal).toBeDefined();
    const body = JSON.parse(init.body as string);
    // coerceContactRequest drops empty phone; only the populated fields ship
    expect(body).toEqual({
      name: VALID.name,
      email: VALID.email,
      subject: VALID.subject,
      message: VALID.message,
    });
  });

  it("forwards optional phone field when provided", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    await sendContactForm(null, fd({ ...VALID, phone: "828-555-0100" }));
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.phone).toBe("828-555-0100");
  });

  it("returns success with no body parse on a 204 No Content", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("success");
  });

  it("returns generic transportError + echoes values when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
    expect(result.values.email).toBe(VALID.email);
    expect(result.values.message).toBe(VALID.message);
  });

  it("returns generic transportError when fetch times out (AbortError)", async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error("The operation was aborted."), {
        name: "AbortError",
      }),
    );
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
  });

  it("returns rate-limit copy + echoes values when Velo responds 429", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: "Too many requests…" }),
        { status: 429 },
      ),
    );
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toMatch(/few minutes/i);
    expect(result.values.email).toBe(VALID.email);
  });

  it("surfaces Velo-supplied error message + echoes values on 400", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400 },
      ),
    );
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBe("Invalid email format");
    expect(result.values.email).toBe(VALID.email);
  });

  it("surfaces Velo error on 500 (non-rate-limit infra failure)", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: "Internal server error" }),
        { status: 500 },
      ),
    );
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBe("Internal server error");
    expect(result.values.email).toBe(VALID.email);
  });

  it("falls back to generic copy + echoes values when Velo body is unparseable", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("{ broken", { status: 502 }),
    );
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
    expect(result.transportError).not.toMatch(/broken/i);
    expect(result.values.email).toBe(VALID.email);
  });

  it("truncates pathologically-long Velo error strings", async () => {
    const longError = "A".repeat(2000);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: longError }), {
        status: 400,
      }),
    );
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError!.length).toBeLessThanOrEqual(200);
  });

  it("forwards sizeOfInterest in Velo POST body when provided", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    await sendContactForm(null, fd({ ...VALID, sizeOfInterest: "queen" }));
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.sizeOfInterest).toBe("queen");
  });

  it("omits sizeOfInterest from Velo POST body when not provided", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    await sendContactForm(null, fd(VALID));
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.sizeOfInterest).toBeUndefined();
  });
});

describe("sendContactForm — Turnstile CAPTCHA", () => {
  function ok(body: object = { success: true }) {
    return new Response(JSON.stringify(body), { status: 200 });
  }

  function turnstileOk() {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bypasses CAPTCHA in dev/test when TURNSTILE_SECRET_KEY is absent", async () => {
    // No secret set — test env is not production, so fetch proceeds normally
    fetchMock.mockResolvedValueOnce(ok());
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("success");
    // Only one fetch call (Velo), no Turnstile verify call
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      (fetchMock.mock.calls[0]! as [string])[0],
    ).toContain("contactSubmissions");
  });

  it("hard-fails in production when TURNSTILE_SECRET_KEY is absent", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks submission when token is missing and secret is set", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
    const result = await sendContactForm(null, fd(VALID));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toMatch(/captcha/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks submission when Turnstile token is rejected", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    const result = await sendContactForm(
      null,
      fd({ ...VALID, "cf-turnstile-response": "bad-token" }),
    );
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toMatch(/captcha/i);
    // Velo fetch should not be called after CAPTCHA failure
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      (fetchMock.mock.calls[0]! as [string])[0],
    ).toContain("turnstile");
  });

  it("returns network-error copy when Turnstile verify throws", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await sendContactForm(
      null,
      fd({ ...VALID, "cf-turnstile-response": "some-token" }),
    );
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.transportError).toMatch(/verify your request/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("proceeds to Velo after valid Turnstile token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
    fetchMock
      .mockResolvedValueOnce(turnstileOk())
      .mockResolvedValueOnce(ok());
    const result = await sendContactForm(
      null,
      fd({ ...VALID, "cf-turnstile-response": "valid-token" }),
    );
    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      (fetchMock.mock.calls[0]! as [string])[0],
    ).toContain("turnstile");
    expect(
      (fetchMock.mock.calls[1]! as [string])[0],
    ).toContain("contactSubmissions");
  });
});
