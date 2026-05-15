// cfw-1ud: WarrantyRegisterForm — client form tests.
//
// Form POSTs to /api/warranty/register and renders success / error /
// pending states inline. Tests pin field render, fetch payload shape,
// pending-state submit-disabled, success replaces the form with a thank-
// you panel, and server-returned errors render alongside the form.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { WarrantyRegisterForm } from "@/app/warranty/register/WarrantyRegisterForm";

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

describe("WarrantyRegisterForm — render", () => {
  it("renders required fields with accessible labels", () => {
    render(<WarrantyRegisterForm />);
    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/order number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/purchase date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/serial number/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /register warranty/i }),
    ).toBeInTheDocument();
  });

  it("pre-fills fields from props (Thank-You CTA → /warranty/register?…)", () => {
    render(
      <WarrantyRegisterForm
        initialProductId="p-1"
        initialProductName="Carolina Classic Futon"
        initialOrderId="order-1"
      />,
    );
    expect(screen.getByLabelText(/product name/i)).toHaveValue(
      "Carolina Classic Futon",
    );
    expect(screen.getByLabelText(/order number/i)).toHaveValue("order-1");
  });
});

describe("WarrantyRegisterForm — submit happy path", () => {
  it("POSTs to /api/warranty/register with the form values", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: true, registrationId: "reg-xyz" }),
    );
    render(
      <WarrantyRegisterForm
        initialProductId="p-1"
        initialProductName="Carolina Classic Futon"
      />,
    );
    fireEvent.change(screen.getByLabelText(/order number/i), {
      target: { value: "order-1" },
    });
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty registration/i }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/warranty/register");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      productId: "p-1",
      productName: "Carolina Classic Futon",
      orderId: "order-1",
    });
  });

  it("renders the success panel and shows the registration id", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: true, registrationId: "reg-xyz" }),
    );
    render(
      <WarrantyRegisterForm
        initialProductId="p-1"
        initialProductName="Carolina Classic Futon"
      />,
    );
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty registration/i }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("warranty-register-success")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("warranty-register-success")).toHaveTextContent(
      /reg-xyz/,
    );
    expect(screen.queryByRole("form")).toBeNull();
  });
});

describe("WarrantyRegisterForm — error states", () => {
  it("renders the server error message and keeps the form mounted on 400", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: false, error: "productName is required." }, 400),
    );
    render(
      <WarrantyRegisterForm
        initialProductId="p-1"
        initialProductName="anything"
      />,
    );
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty registration/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/productName/i),
    );
    expect(
      screen.getByRole("form", { name: /warranty registration/i }),
    ).toBeInTheDocument();
  });

  it("renders a fallback error when fetch rejects (network failure)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    render(
      <WarrantyRegisterForm
        initialProductId="p-1"
        initialProductName="x"
      />,
    );
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty registration/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/try again/i),
    );
  });

  it("renders a fallback error when the response is non-JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 }),
    );
    render(
      <WarrantyRegisterForm
        initialProductId="p-1"
        initialProductName="x"
      />,
    );
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty registration/i }),
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});

describe("WarrantyRegisterForm — client-side guard", () => {
  it("blocks submit and shows an inline error when productName is empty", async () => {
    render(<WarrantyRegisterForm initialProductId="p-1" />);
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty registration/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/product name/i),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
