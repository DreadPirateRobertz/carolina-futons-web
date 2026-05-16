/**
 * cf-5ocx (cf-54st.fu1): page-level tests for /track-order.
 *
 * PR #635 covered the TrackOrderResult render branches (success +
 * business-error envelopes); the page-level branches at
 * src/app/track-order/page.tsx were untested. Risk: a refactor that
 * breaks the `!orderNumber || !email` guard or removes the try/catch
 * around lookupOrderViaVelo would ship silently.
 *
 * These 4 tests cover the page's distinct states:
 *   1. Missing query params → guidance copy block
 *   2. VeloRpcError → user-friendly transport error
 *   3. success:false envelope → TrackOrderResult alert
 *   4. success:true envelope → TrackOrderResult summary
 *
 * Pattern: invoke the async page component directly, render the
 * returned JSX, query by testid + role.
 */
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { VeloRpcError } from "@/lib/wix/velo-client";

const lookupOrderViaVelo = vi.fn();

vi.mock("@/lib/wix/track-order", async () => {
  const actual = await vi.importActual<typeof import("@/lib/wix/track-order")>(
    "@/lib/wix/track-order",
  );
  return {
    ...actual,
    lookupOrderViaVelo: (...args: unknown[]) =>
      lookupOrderViaVelo(...(args as [string, string])),
  };
});

import TrackOrderPage from "./page";

async function renderPage(
  params: Record<string, string | undefined> = {},
) {
  const searchParams = Promise.resolve(params);
  const ui = await TrackOrderPage({ searchParams });
  return render(ui);
}

afterEach(() => {
  cleanup();
  lookupOrderViaVelo.mockReset();
});

describe("/track-order page (cf-5ocx)", () => {
  it("renders the missing-params guidance when no query params are present", async () => {
    await renderPage({});
    expect(screen.getByTestId("track-order-missing-params")).toBeInTheDocument();
    expect(lookupOrderViaVelo).not.toHaveBeenCalled();
  });

  it("renders the missing-params guidance when only orderNumber is present", async () => {
    await renderPage({ n: "10042" });
    expect(screen.getByTestId("track-order-missing-params")).toBeInTheDocument();
    expect(lookupOrderViaVelo).not.toHaveBeenCalled();
  });

  it("renders the missing-params guidance when only email is present", async () => {
    await renderPage({ e: "jane@example.com" });
    expect(screen.getByTestId("track-order-missing-params")).toBeInTheDocument();
    expect(lookupOrderViaVelo).not.toHaveBeenCalled();
  });

  it("renders the transport-error copy when lookupOrderViaVelo throws VeloRpcError", async () => {
    lookupOrderViaVelo.mockRejectedValueOnce(
      new VeloRpcError("lookupOrder", 502, "bad gateway"),
    );
    await renderPage({ n: "10042", e: "jane@example.com" });
    expect(screen.getByTestId("track-order-transport-error")).toBeInTheDocument();
    // The transport-error copy carries the fallback phone number so the
    // customer has a path forward — pin the phone string to catch a
    // copy-edit drift that removes it.
    expect(screen.getByText(/828.*252.*9449/)).toBeInTheDocument();
    expect(lookupOrderViaVelo).toHaveBeenCalledWith(
      "10042",
      "jane@example.com",
    );
  });

  it("renders the success:false envelope as a TrackOrderResult alert", async () => {
    lookupOrderViaVelo.mockResolvedValueOnce({
      success: false,
      error: "Order not found. Please check your order number.",
    });
    await renderPage({ n: "10099", e: "jane@example.com" });
    expect(screen.getByRole("alert")).toHaveTextContent(/not found/i);
    expect(lookupOrderViaVelo).toHaveBeenCalledWith(
      "10099",
      "jane@example.com",
    );
  });

  it("renders the success:true envelope as a TrackOrderResult summary", async () => {
    lookupOrderViaVelo.mockResolvedValueOnce({
      success: true,
      order: {
        number: "10042",
        createdDate: "2026-04-20T10:00:00Z",
        status: "Shipped",
        statusDescription: "On its way.",
        fulfillmentStatus: "FULFILLED",
        paymentStatus: "PAID",
      },
      shipping: {
        carrier: "UPS",
        serviceName: "Ground",
        trackingNumber: "1Z999AA10123456784",
        estimatedDelivery: "Apr 24, 2026",
      },
      timeline: [],
      items: [],
    });
    await renderPage({ n: "10042", e: "jane@example.com" });
    expect(screen.getByTestId("track-order-result")).toBeInTheDocument();
    expect(screen.getByText("Order #10042")).toBeInTheDocument();
    expect(screen.getByTestId("track-order-tracking-number")).toHaveTextContent(
      "1Z999AA10123456784",
    );
  });

  it("re-throws non-VeloRpcError errors so unexpected failures surface in Sentry", async () => {
    // The page intentionally only catches VeloRpcError. A generic Error
    // (or any other unhandled type) must propagate up so Next.js routes
    // it through the error-boundary (5xx) and Sentry captures it. A
    // future refactor that broadens the catch would mask real bugs.
    lookupOrderViaVelo.mockRejectedValueOnce(new Error("unexpected"));
    await expect(
      renderPage({ n: "10042", e: "jane@example.com" }),
    ).rejects.toThrow("unexpected");
  });
});
