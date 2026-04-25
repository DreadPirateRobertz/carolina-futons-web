import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const eventMocks = vi.hoisted(() => ({
  trackPurchase: vi.fn(),
}));

vi.mock("@/lib/analytics/ga4-events", () => ({
  trackPurchase: eventMocks.trackPurchase,
}));

import { Ga4PurchaseTracker } from "@/components/analytics/Ga4PurchaseTracker";

const baseProps = {
  transactionId: "T-1042",
  value: 2599,
  currency: "USD",
  items: [
    { item_id: "P-1", item_name: "Monterey Futon", price: 1299, quantity: 2 },
  ],
};

beforeEach(() => {
  eventMocks.trackPurchase.mockReset();
});

describe("<Ga4PurchaseTracker />", () => {
  it("fires trackPurchase with the GA4 ecommerce schema on mount", () => {
    render(<Ga4PurchaseTracker {...baseProps} />);
    expect(eventMocks.trackPurchase).toHaveBeenCalledTimes(1);
    expect(eventMocks.trackPurchase).toHaveBeenCalledWith({
      transaction_id: "T-1042",
      value: 2599,
      currency: "USD",
      items: [
        {
          item_id: "P-1",
          item_name: "Monterey Futon",
          price: 1299,
          quantity: 2,
        },
      ],
    });
  });

  it("includes optional tax / shipping / coupon when provided", () => {
    render(
      <Ga4PurchaseTracker
        {...baseProps}
        tax={130}
        shipping={50}
        coupon="SPRING10"
      />,
    );
    expect(eventMocks.trackPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        tax: 130,
        shipping: 50,
        coupon: "SPRING10",
      }),
    );
  });

  it("omits tax / shipping when undefined or NaN", () => {
    render(
      <Ga4PurchaseTracker
        {...baseProps}
        tax={undefined}
        shipping={undefined}
      />,
    );
    const [[arg]] = eventMocks.trackPurchase.mock.calls;
    expect(arg).not.toHaveProperty("tax");
    expect(arg).not.toHaveProperty("shipping");
    expect(arg).not.toHaveProperty("coupon");
  });

  it("does not fire twice on a parent re-render with the same identity", () => {
    const { rerender } = render(<Ga4PurchaseTracker {...baseProps} />);
    rerender(<Ga4PurchaseTracker {...baseProps} />);
    expect(eventMocks.trackPurchase).toHaveBeenCalledTimes(1);
  });
});
