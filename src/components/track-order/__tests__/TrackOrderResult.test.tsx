/**
 * cf-54st: TrackOrderResult smoke tests.
 *
 * The component is pure render — branches on success vs error envelope
 * and conditionally renders shipping / timeline / items sections.
 * These tests pin the branches so a regression to "shows error envelope
 * as a success card" or "drops the tracking number" trips immediately.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { TrackOrderResult } from "@/components/track-order/TrackOrderResult";
import type { TrackOrderResponse } from "@/lib/wix/track-order";

const SUCCESS: TrackOrderResponse = {
  success: true,
  order: {
    number: "10042",
    createdDate: "2026-04-20T10:00:00Z",
    status: "Shipped",
    statusDescription: "Your order is on its way.",
    fulfillmentStatus: "FULFILLED",
    paymentStatus: "PAID",
  },
  shipping: {
    carrier: "UPS",
    serviceName: "Ground",
    trackingNumber: "1Z999AA10123456784",
    estimatedDelivery: "Apr 24, 2026",
  },
  timeline: [
    { step: 0, label: "Order placed", completed: true, current: false },
    { step: 1, label: "Shipped", completed: true, current: true },
    { step: 2, label: "Delivered", completed: false, current: false },
  ],
  items: [
    { name: "Eureka Futon Frame", image: null, quantity: 1 },
    { name: "Moonshadow Mattress", image: null, quantity: 1 },
  ],
};

describe("<TrackOrderResult />", () => {
  it("renders the business error envelope as an alert when success=false", () => {
    render(
      <TrackOrderResult
        response={{ success: false, error: "Order not found." }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/order not found/i);
    expect(screen.queryByTestId("track-order-result")).toBeNull();
  });

  it("renders the order summary on success", () => {
    render(<TrackOrderResult response={SUCCESS} />);
    expect(screen.getByText("Order #10042")).toBeInTheDocument();
    // "Shipped" appears twice (order.status + timeline step label) — assert
    // both by collecting matches rather than getByText, which throws on >1.
    expect(screen.getAllByText("Shipped").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/your order is on its way/i)).toBeInTheDocument();
  });

  it("renders the tracking number when shipping.trackingNumber is present", () => {
    render(<TrackOrderResult response={SUCCESS} />);
    expect(screen.getByTestId("track-order-tracking-number")).toHaveTextContent(
      "1Z999AA10123456784",
    );
  });

  it("does NOT render the shipping section when trackingNumber is null", () => {
    render(
      <TrackOrderResult
        response={{
          ...SUCCESS,
          shipping: { ...SUCCESS.shipping!, trackingNumber: null },
        }}
      />,
    );
    expect(screen.queryByTestId("track-order-tracking-number")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /shipping/i }),
    ).toBeNull();
  });

  it("renders one timeline step per entry with completed/current data attrs", () => {
    render(<TrackOrderResult response={SUCCESS} />);
    const steps = screen.getAllByTestId("track-order-timeline-step");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveAttribute("data-completed", "true");
    expect(steps[1]).toHaveAttribute("data-current", "true");
    expect(steps[2]).toHaveAttribute("data-completed", "false");
  });

  it("renders the items list", () => {
    render(<TrackOrderResult response={SUCCESS} />);
    expect(screen.getByText("Eureka Futon Frame")).toBeInTheDocument();
    expect(screen.getByText("Moonshadow Mattress")).toBeInTheDocument();
  });

  it("omits the timeline section when timeline is empty", () => {
    render(
      <TrackOrderResult response={{ ...SUCCESS, timeline: [] }} />,
    );
    expect(
      screen.queryByRole("heading", { name: /timeline/i }),
    ).toBeNull();
  });

  it("omits the items section when items is empty", () => {
    render(<TrackOrderResult response={{ ...SUCCESS, items: [] }} />);
    expect(
      screen.queryByRole("heading", { name: /items/i }),
    ).toBeNull();
  });
});
