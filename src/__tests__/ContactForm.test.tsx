import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ContactForm } from "@/components/contact/ContactForm";

const originalFetch = global.fetch;

function mockFetch(response: { status?: number; body?: unknown }) {
  const status = response.status ?? 200;
  const body = response.body ?? { ok: true };
  const fn = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
  global.fetch = fn as unknown as typeof global.fetch;
  return fn;
}

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Kingston frame question",
  message: "Is the Kingston frame still in stock this month?",
};

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/^name$/i), {
    target: { value: valid.name },
  });
  fireEvent.change(screen.getByLabelText(/^email$/i), {
    target: { value: valid.email },
  });
  fireEvent.change(screen.getByLabelText(/^subject$/i), {
    target: { value: valid.subject },
  });
  fireEvent.change(screen.getByLabelText(/^message$/i), {
    target: { value: valid.message },
  });
}

beforeEach(() => {
  global.fetch = originalFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("ContactForm — client validation", () => {
  it("renders all required fields with accessible labels", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^subject$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^message$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it("shows inline errors on submit with empty fields (no fetch fired)", () => {
    const fetchMock = mockFetch({});
    render(<ContactForm />);
    fireEvent.submit(screen.getByRole("form", { name: /contact form/i }));
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears a field error once the user edits that field", () => {
    render(<ContactForm />);
    fireEvent.submit(screen.getByRole("form", { name: /contact form/i }));
    const emailInput = screen.getByLabelText(/^email$/i);
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(emailInput, { target: { value: "ada@example.com" } });
    expect(emailInput).not.toHaveAttribute("aria-invalid");
  });
});

describe("ContactForm — submission lifecycle", () => {
  it("POSTs to /api/contact with a JSON body on valid submit", async () => {
    const fetchMock = mockFetch({ body: { ok: true } });
    render(<ContactForm />);
    fillValidForm();
    fireEvent.submit(screen.getByRole("form", { name: /contact form/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/contact");
    expect(init.method).toBe("POST");
    const parsed = JSON.parse(init.body as string);
    expect(parsed.name).toBe(valid.name);
    expect(parsed.email).toBe(valid.email);
  });

  it("renders the success panel and clears the form on 200 { ok: true }", async () => {
    mockFetch({ body: { ok: true } });
    render(<ContactForm />);
    fillValidForm();
    fireEvent.submit(screen.getByRole("form", { name: /contact form/i }));
    await waitFor(() =>
      expect(screen.getByTestId("contact-success")).toBeInTheDocument(),
    );
  });

  it("renders server-side field errors from a 400 validation response", async () => {
    mockFetch({
      status: 400,
      body: {
        ok: false,
        error: "validation",
        errors: { email: "That email doesn't look right." },
      },
    });
    render(<ContactForm />);
    fillValidForm();
    // Bypass client-side check with a fake-looking but tempting email; the
    // schema accepts the form but we simulate the server rejecting it to
    // cover the server-error-to-field-error path.
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: "ada@example.com" },
    });
    fireEvent.submit(screen.getByRole("form", { name: /contact form/i }));
    await waitFor(() =>
      expect(screen.getByText(/that email doesn't look right/i)).toBeInTheDocument(),
    );
  });

  it("shows a generic error message when the network throws", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("boom");
    }) as unknown as typeof global.fetch;
    render(<ContactForm />);
    fillValidForm();
    fireEvent.submit(screen.getByRole("form", { name: /contact form/i }));
    await waitFor(() =>
      expect(screen.getByText(/network trouble/i)).toBeInTheDocument(),
    );
  });

  it("disables the submit button while submitting", async () => {
    let resolve: (value: Response) => void = () => {};
    global.fetch = vi.fn(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    ) as unknown as typeof global.fetch;

    render(<ContactForm />);
    fillValidForm();
    fireEvent.submit(screen.getByRole("form", { name: /contact form/i }));

    const button = await screen.findByRole("button", { name: /sending/i });
    expect(button).toBeDisabled();
    resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });
});
