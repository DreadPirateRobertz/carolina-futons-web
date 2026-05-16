// cfw-80n1: WarrantyClaimForm — client form tests.
//
// POSTs to /api/warranty/claim. Tests pin: field render with issue-type
// dropdown populated from ISSUE_TYPE_LABELS, pre-fill from props,
// payload shape, success panel rendering claim number, server-400
// inline alert, network-failure fallback, and client-side empty-field
// guards.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { WarrantyClaimForm } from "@/app/warranty/claim/WarrantyClaimForm";

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

describe("WarrantyClaimForm — render", () => {
  it("renders required fields with accessible labels", () => {
    render(<WarrantyClaimForm />);
    expect(screen.getByLabelText(/issue type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/describe what's happening/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /file claim/i }),
    ).toBeInTheDocument();
  });

  it("renders every issue type from VALID_ISSUE_TYPES as <option>", () => {
    render(<WarrantyClaimForm />);
    const select = screen.getByLabelText(/issue type/i) as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toContain("structural");
    expect(optionValues).toContain("fabric");
    expect(optionValues).toContain("mechanism");
    expect(optionValues).toContain("accidental");
    expect(optionValues).toContain("stain");
    expect(optionValues).toContain("other");
  });

  it("pre-fills warrantyId + productName context when provided", () => {
    render(
      <WarrantyClaimForm
        initialWarrantyId="warranty-1"
        initialProductName="Carolina Classic Futon"
      />,
    );
    // productName surfaces visibly so the user knows which product the
    // claim is being filed against; warrantyId is the hidden ref the
    // backend uses to link the claim to a registration.
    expect(
      screen.getByText(/carolina classic futon/i),
    ).toBeInTheDocument();
  });
});

describe("WarrantyClaimForm — submit happy path", () => {
  function fillRequired() {
    fireEvent.change(screen.getByLabelText(/issue type/i), {
      target: { value: "structural" },
    });
    fireEvent.change(screen.getByLabelText(/describe what's happening/i), {
      target: { value: "Latch broke after three months of normal use." },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "buyer@example.com" },
    });
  }

  it("POSTs to /api/warranty/claim with the form payload", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        claimNumber: "CLM-20260515-0042",
        claimId: "claim-1",
      }),
    );
    render(<WarrantyClaimForm initialWarrantyId="warranty-1" />);
    fillRequired();
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "555-1234" },
    });
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty claim/i }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/warranty/claim");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      issueType: "structural",
      description: "Latch broke after three months of normal use.",
      contactEmail: "buyer@example.com",
      contactPhone: "555-1234",
      warrantyId: "warranty-1",
    });
  });

  it("renders the success panel with the claim number", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        claimNumber: "CLM-20260515-0042",
        claimId: "claim-1",
      }),
    );
    render(<WarrantyClaimForm />);
    fillRequired();
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty claim/i }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("warranty-claim-success")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("warranty-claim-success")).toHaveTextContent(
      /CLM-20260515-0042/,
    );
    expect(screen.queryByRole("form")).toBeNull();
  });
});

describe("WarrantyClaimForm — error surfaces", () => {
  function fillRequired() {
    fireEvent.change(screen.getByLabelText(/issue type/i), {
      target: { value: "fabric" },
    });
    fireEvent.change(screen.getByLabelText(/describe what's happening/i), {
      target: { value: "Discoloration on one cushion side." },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "buyer@example.com" },
    });
  }

  it("renders the server error message and keeps the form mounted on 400", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: false, error: "description must be at least 10 characters." }, 400),
    );
    render(<WarrantyClaimForm />);
    fillRequired();
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty claim/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/description/i),
    );
    expect(
      screen.getByRole("form", { name: /warranty claim/i }),
    ).toBeInTheDocument();
  });

  it("renders a fallback error when fetch rejects (network failure)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    render(<WarrantyClaimForm />);
    fillRequired();
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty claim/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/try again/i),
    );
  });
});

describe("WarrantyClaimForm — client-side guards", () => {
  it("blocks submit when issue type isn't picked (placeholder remains)", async () => {
    render(<WarrantyClaimForm />);
    fireEvent.change(screen.getByLabelText(/describe what's happening/i), {
      target: { value: "Latch broke after three months of normal use." },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "buyer@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty claim/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/issue type/i),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks submit when description is too short", async () => {
    render(<WarrantyClaimForm />);
    fireEvent.change(screen.getByLabelText(/issue type/i), {
      target: { value: "structural" },
    });
    fireEvent.change(screen.getByLabelText(/describe what's happening/i), {
      target: { value: "broke" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "buyer@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("form", { name: /warranty claim/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/description/i),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
