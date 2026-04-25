import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  trackViewItem,
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  type Ga4Item,
} from "@/lib/analytics/ga4-events";

const item: Ga4Item = {
  item_id: "P-001",
  item_name: "Monterey Futon",
  item_brand: "Carolina Futons",
  item_category: "frames",
  price: 1299.5,
};

let gtagSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  gtagSpy = vi.fn();
  (window as unknown as { gtag: typeof gtagSpy }).gtag = gtagSpy;
});

afterEach(() => {
  delete (window as unknown as { gtag?: unknown }).gtag;
});

describe("ga4-events — installation guard", () => {
  it("no-ops when window.gtag is missing", () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    expect(() => trackViewItem(item)).not.toThrow();
    expect(() => trackAddToCart(item)).not.toThrow();
    expect(() => trackBeginCheckout([item], 1299.5)).not.toThrow();
    expect(() =>
      trackPurchase({ transaction_id: "T-1", value: 1299.5, items: [item] }),
    ).not.toThrow();
  });

  it("no-ops when window.gtag is not a function", () => {
    (window as unknown as { gtag: unknown }).gtag = "not-a-function";
    trackViewItem(item);
    // No assertion needed — call should not throw.
  });
});

describe("trackViewItem", () => {
  it("calls gtag with view_item + GA4 ecommerce schema", () => {
    trackViewItem(item);
    expect(gtagSpy).toHaveBeenCalledWith("event", "view_item", {
      currency: "USD",
      value: 1299.5,
      items: [item],
    });
  });

  it("defaults value to 0 when price is missing", () => {
    const { price: _omit, ...noPriceItem } = item;
    void _omit;
    trackViewItem(noPriceItem as Ga4Item);
    expect(gtagSpy).toHaveBeenCalledWith(
      "event",
      "view_item",
      expect.objectContaining({ value: 0 }),
    );
  });

  it("respects an explicit currency override", () => {
    trackViewItem(item, "CAD");
    expect(gtagSpy).toHaveBeenCalledWith(
      "event",
      "view_item",
      expect.objectContaining({ currency: "CAD" }),
    );
  });
});

describe("trackAddToCart", () => {
  it("multiplies price by quantity for the cart event value", () => {
    trackAddToCart({ ...item, quantity: 3 });
    expect(gtagSpy).toHaveBeenCalledWith("event", "add_to_cart", {
      currency: "USD",
      value: 1299.5 * 3,
      items: [{ ...item, quantity: 3 }],
    });
  });

  it("defaults quantity to 1 when omitted", () => {
    trackAddToCart(item);
    expect(gtagSpy).toHaveBeenCalledWith(
      "event",
      "add_to_cart",
      expect.objectContaining({
        value: 1299.5,
        items: [{ ...item, quantity: 1 }],
      }),
    );
  });
});

describe("trackBeginCheckout", () => {
  it("forwards items + value with default USD currency", () => {
    trackBeginCheckout([item], 2599);
    expect(gtagSpy).toHaveBeenCalledWith("event", "begin_checkout", {
      currency: "USD",
      value: 2599,
      items: [item],
    });
  });
});

describe("trackPurchase", () => {
  it("emits the full GA4 purchase payload", () => {
    trackPurchase({
      transaction_id: "T-9001",
      value: 2599,
      items: [item],
      tax: 130,
      shipping: 50,
      coupon: "SPRING10",
    });
    expect(gtagSpy).toHaveBeenCalledWith("event", "purchase", {
      currency: "USD",
      transaction_id: "T-9001",
      value: 2599,
      items: [item],
      tax: 130,
      shipping: 50,
      coupon: "SPRING10",
    });
  });

  it("respects the optional currency override", () => {
    trackPurchase({
      transaction_id: "T-9002",
      value: 2599,
      items: [item],
      currency: "EUR",
    });
    expect(gtagSpy).toHaveBeenCalledWith(
      "event",
      "purchase",
      expect.objectContaining({ currency: "EUR" }),
    );
  });
});
