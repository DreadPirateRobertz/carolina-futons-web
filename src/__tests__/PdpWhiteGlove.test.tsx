import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PdpWhiteGlove } from "@/components/product/PdpWhiteGlove";

// cf-w2my follow-up: PdpWhiteGlove now wires its eligibility messaging to
// /api/delivery-zone. Below threshold → renders nothing (unchanged from
// cf-3r9v). At/above threshold → renders the prompt + ZIP form, then
// branches on the API service tier on submit.

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function okResponse(
  service: "white-glove" | "ltl" | "unsupported",
  zip = "28739",
  estDays = { min: 1, max: 2 },
) {
  return new Response(
    JSON.stringify({
      ok: true,
      zip,
      zone: service === "white-glove" ? "nc" : service === "ltl" ? "se" : "akhi",
      eligible: service !== "unsupported",
      service,
      estDays,
      label: "",
    }),
    { status: 200 },
  );
}

describe("PdpWhiteGlove (zone-aware)", () => {
  it("renders the prompt + ZIP form at the $1,500 threshold", () => {
    render(<PdpWhiteGlove unitPriceCents={150_000} />);
    const region = screen.getByRole("region", {
      name: /free white-glove delivery/i,
    });
    expect(region).toBeInTheDocument();
    expect(region.textContent).toMatch(/enter your zip to confirm/i);
    expect(screen.getByRole("textbox", { name: /zip/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^check$/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders for the audited Ranchero $2,978 SKU", () => {
    render(<PdpWhiteGlove unitPriceCents={297_800} />);
    expect(
      screen.getByRole("region", { name: /free white-glove delivery/i }),
    ).toBeInTheDocument();
  });

  it("renders nothing just below the threshold", () => {
    const { container } = render(
      <PdpWhiteGlove unitPriceCents={149_999} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a sub-$1,500 SKU", () => {
    const { container } = render(<PdpWhiteGlove unitPriceCents={49_900} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when price is non-finite (defensive guard)", () => {
    const { container } = render(<PdpWhiteGlove unitPriceCents={NaN} />);
    expect(container.firstChild).toBeNull();
  });

  it("rejects malformed ZIP without hitting the API", async () => {
    const user = userEvent.setup();
    render(<PdpWhiteGlove unitPriceCents={297_800} />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "28A");
    await user.click(screen.getByRole("button", { name: /^check$/i }));
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/5-digit zip/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders qualified copy when the API returns a white-glove zone", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("white-glove", "28739"));
    const user = userEvent.setup();
    render(<PdpWhiteGlove unitPriceCents={297_800} />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "28739");
    await user.click(screen.getByRole("button", { name: /^check$/i }));
    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/free white-glove delivery to 28739/i);
    expect(status.textContent).toMatch(/1-2 business days/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "/api/delivery-zone?zip=28739",
    );
  });

  it("renders LTL downgrade copy when the API returns an LTL zone", async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse("ltl", "30303", { min: 2, max: 3 }),
    );
    const user = userEvent.setup();
    render(<PdpWhiteGlove unitPriceCents={297_800} />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "30303");
    await user.click(screen.getByRole("button", { name: /^check$/i }));
    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/white-glove isn.t available at 30303/i);
    expect(status.textContent).toMatch(/2-3 business days/);
  });

  it("renders unsupported copy when the API returns an unsupported zone", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("unsupported", "99701"));
    const user = userEvent.setup();
    render(<PdpWhiteGlove unitPriceCents={297_800} />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "99701");
    await user.click(screen.getByRole("button", { name: /^check$/i }));
    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/don.t ship items this size to 99701/i);
  });

  it("surfaces a friendly error when the API returns invalid-zip", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: "invalid-zip" }), {
        status: 400,
      }),
    );
    const user = userEvent.setup();
    render(<PdpWhiteGlove unitPriceCents={297_800} />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "00000");
    await user.click(screen.getByRole("button", { name: /^check$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /that zip doesn.t look right/i,
    );
  });

  it("surfaces a generic error when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    const user = userEvent.setup();
    render(<PdpWhiteGlove unitPriceCents={297_800} />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "28739");
    await user.click(screen.getByRole("button", { name: /^check$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn.t check that zip/i,
    );
  });

  it("passes cache:'no-store' to the API call", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("white-glove"));
    const user = userEvent.setup();
    render(<PdpWhiteGlove unitPriceCents={297_800} />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "28739");
    await user.click(screen.getByRole("button", { name: /^check$/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.cache).toBe("no-store");
  });
});
