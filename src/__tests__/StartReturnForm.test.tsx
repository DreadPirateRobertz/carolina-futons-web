// cfw-9to: StartReturnForm — client form tests.
//
// POSTs to /api/returns/submit. Tests pin field render with reason
// dropdown populated from REASON_LABELS, pre-fill from props, payload
// shape, pending state, success panel rendering the RMA, and error
// surfaces (server 400, network fail, non-JSON response, client-side
// empty-field guards).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { StartReturnForm } from "@/app/returns/start/StartReturnForm";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("StartReturnForm — render", () => {
  it("renders the required fields with accessible labels", () => {
    render(<StartReturnForm />);
    expect(screen.getByLabelText(/order number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/details/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start return/i }),
    ).toBeInTheDocument();
  });

  it("renders every reason from REASON_LABELS as an <option>", () => {
    render(<StartReturnForm />);
    const select = screen.getByLabelText(/reason/i) as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toContain("wrong_size");
    expect(optionValues).toContain("defective");
    expect(optionValues).toContain("damaged_in_shipping");
    expect(optionValues).toContain("not_as_described");
    expect(optionValues).toContain("changed_mind");
    expect(optionValues).toContain("other");
  });

  it("pre-fills orderNumber + email from props (order-confirmation CTA → ?…)", () => {
    render(
      <StartReturnForm
        initialOrderNumber="10042"
        initialEmail="buyer@example.com"
      />,
    );
    expect(screen.getByLabelText(/order number/i)).toHaveValue("10042");
    expect(screen.getByLabelText(/email/i)).toHaveValue("buyer@example.com");
  });

  it("offers a 'return' / 'exchange' choice that defaults to return", () => {
    render(<StartReturnForm />);
    const returnRadio = screen.getByLabelText(/^return$/i) as HTMLInputElement;
    const exchangeRadio = screen.getByLabelText(/exchange/i) as HTMLInputElement;
    expect(returnRadio.checked).toBe(true);
    expect(exchangeRadio.checked).toBe(false);
  });
});

describe("StartReturnForm — submit happy path", () => {
  function fillRequired() {
    fireEvent.change(screen.getByLabelText(/order number/i), {
      target: { value: "10042" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "buyer@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "defective" },
    });
  }

  it("POSTs to /api/returns/submit with the form payload", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        rmaNumber: "RMA-20260515-0042",
        returnId: "ret-1",
      }),
    );
    render(<StartReturnForm />);
    fillRequired();
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: "Latch broke after a week." },
    });
    fireEvent.submit(
      screen.getByRole("form", { name: /start a return/i }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/returns/submit");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      orderNumber: "10042",
      email: "buyer@example.com",
      reason: "defective",
      details: "Latch broke after a week.",
      type: "return",
    });
  });

  it("renders the success panel with the RMA number after submit", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        rmaNumber: "RMA-20260515-0042",
        returnId: "ret-1",
      }),
    );
    render(<StartReturnForm />);
    fillRequired();
    fireEvent.submit(
      screen.getByRole("form", { name: /start a return/i }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("returns-submit-success")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("returns-submit-success")).toHaveTextContent(
      /RMA-20260515-0042/,
    );
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("submits with type=exchange when the user picks the exchange radio", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        rmaNumber: "RMA-20260515-0100",
        returnId: "ret-2",
      }),
    );
    render(<StartReturnForm />);
    fillRequired();
    fireEvent.click(screen.getByLabelText(/exchange/i));
    fireEvent.submit(
      screen.getByRole("form", { name: /start a return/i }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.type).toBe("exchange");
  });
});

describe("StartReturnForm — error surfaces", () => {
  function fillRequired() {
    fireEvent.change(screen.getByLabelText(/order number/i), {
      target: { value: "10042" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "buyer@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "defective" },
    });
  }

  it("renders the server error message and keeps the form mounted on 400", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: false, error: "orderNumber is required." }, 400),
    );
    render(<StartReturnForm />);
    fillRequired();
    fireEvent.submit(
      screen.getByRole("form", { name: /start a return/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/orderNumber/i),
    );
    expect(
      screen.getByRole("form", { name: /start a return/i }),
    ).toBeInTheDocument();
  });

  it("renders a fallback error when fetch rejects (network failure)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    render(<StartReturnForm />);
    fillRequired();
    fireEvent.submit(
      screen.getByRole("form", { name: /start a return/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/try again/i),
    );
  });

  it("renders a fallback error when the response is non-JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 }),
    );
    render(<StartReturnForm />);
    fillRequired();
    fireEvent.submit(
      screen.getByRole("form", { name: /start a return/i }),
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});

describe("StartReturnForm — client-side guards", () => {
  it("blocks submit when orderNumber is empty", async () => {
    render(<StartReturnForm />);
    // Skip orderNumber, fill the others.
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "buyer@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "defective" },
    });
    fireEvent.submit(
      screen.getByRole("form", { name: /start a return/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/order number/i),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks submit when email is empty", async () => {
    render(<StartReturnForm />);
    fireEvent.change(screen.getByLabelText(/order number/i), {
      target: { value: "10042" },
    });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "defective" },
    });
    fireEvent.submit(
      screen.getByRole("form", { name: /start a return/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/email/i),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks submit when no reason selected (default placeholder)", async () => {
    render(<StartReturnForm />);
    fireEvent.change(screen.getByLabelText(/order number/i), {
      target: { value: "10042" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "buyer@example.com" },
    });
    // reason intentionally left at default placeholder
    fireEvent.submit(
      screen.getByRole("form", { name: /start a return/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/reason/i),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
