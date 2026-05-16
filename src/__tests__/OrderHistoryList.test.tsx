import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { OrderHistoryList } from "@/components/member/OrderHistoryList";
import type { MemberOrderSummary } from "@/lib/wix/orders";

const baseOrder: MemberOrderSummary = {
  id: "O-1",
  number: "1042",
  createdDate: "2026-04-20T10:00:00Z",
  status: "APPROVED",
  paymentStatus: "PAID",
  fulfillmentStatus: "NOT_FULFILLED",
  totalFormatted: "$1,299.99",
  totalValue: 1299.99,
  currency: "USD",
  itemCount: 3,
};

describe("<OrderHistoryList />", () => {
  it("renders an empty-state copy block when there are no orders", () => {
    render(<OrderHistoryList orders={[]} />);
    expect(
      screen.getByText(/haven['’]t placed an order yet/i),
    ).toBeInTheDocument();
  });

  it("renders one card per order with the order number heading", () => {
    render(
      <OrderHistoryList
        orders={[baseOrder, { ...baseOrder, id: "O-2", number: "1043" }]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Order #1042")).toBeInTheDocument();
    expect(screen.getByText("Order #1043")).toBeInTheDocument();
  });

  it("renders the formatted total when present", () => {
    render(<OrderHistoryList orders={[baseOrder]} />);
    expect(screen.getByText("$1,299.99")).toBeInTheDocument();
  });

  it("humanizes status fields (APPROVED -> Approved, NOT_FULFILLED -> Not Fulfilled)", () => {
    render(<OrderHistoryList orders={[baseOrder]} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Not Fulfilled")).toBeInTheDocument();
  });

  it("pluralizes item count", () => {
    const { rerender } = render(
      <OrderHistoryList orders={[{ ...baseOrder, itemCount: 1 }]} />,
    );
    expect(screen.getByText(/^1 item$/)).toBeInTheDocument();
    rerender(
      <OrderHistoryList orders={[{ ...baseOrder, itemCount: 4 }]} />,
    );
    expect(screen.getByText(/^4 items$/)).toBeInTheDocument();
  });

  it("falls back to 'Order' when no order number is set", () => {
    render(
      <OrderHistoryList orders={[{ ...baseOrder, number: null }]} />,
    );
    expect(screen.getByText("Order")).toBeInTheDocument();
  });

  it("omits the date row when createdDate is null", () => {
    render(
      <OrderHistoryList orders={[{ ...baseOrder, createdDate: null }]} />,
    );
    const card = screen.getByRole("listitem");
    expect(within(card).queryByText(/^placed/i)).toBeNull();
  });

  // cf-fd94 (cf-zn5b.1 G-7): Wix Velo's initOrderHistory rendered a
  // "Track shipment" link per shipped row. cfw was missing the link;
  // customers had to hunt the shipping-confirmation email to track.
  describe("track-shipment link (cf-fd94)", () => {
    const shipped: MemberOrderSummary = {
      ...baseOrder,
      id: "O-9",
      number: "1099",
      fulfillmentStatus: "FULFILLED",
    };

    it("renders a Track shipment link for FULFILLED orders when memberEmail is provided", () => {
      render(
        <OrderHistoryList
          orders={[shipped]}
          memberEmail="jane@example.com"
        />,
      );
      const link = screen.getByRole("link", { name: /track shipment/i });
      expect(link).toHaveAttribute(
        "href",
        "/track-order?n=1099&e=jane%40example.com",
      );
    });

    it("does NOT render the link for NOT_FULFILLED orders", () => {
      render(
        <OrderHistoryList
          orders={[baseOrder]}
          memberEmail="jane@example.com"
        />,
      );
      expect(
        screen.queryByRole("link", { name: /track shipment/i }),
      ).toBeNull();
    });

    it("does NOT render the link when memberEmail is missing (can't construct the lookup URL)", () => {
      render(<OrderHistoryList orders={[shipped]} memberEmail={null} />);
      expect(
        screen.queryByRole("link", { name: /track shipment/i }),
      ).toBeNull();
    });

    it("does NOT render the link when the order has no number to look up", () => {
      render(
        <OrderHistoryList
          orders={[{ ...shipped, number: null }]}
          memberEmail="jane@example.com"
        />,
      );
      expect(
        screen.queryByRole("link", { name: /track shipment/i }),
      ).toBeNull();
    });
  });
});
