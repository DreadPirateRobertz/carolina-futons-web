import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

import { MetaPurchaseTracker } from "@/components/analytics/MetaPurchaseTracker";

// cf-3qt.7.3: MetaPurchaseTracker fires the Purchase event exactly once
// per render. The fbq global is mocked at the window level so we can
// assert the dispatched parameters without booting the real Meta SDK.

beforeEach(() => {
  (window as unknown as { fbq: ReturnType<typeof vi.fn> }).fbq = vi.fn();
});

afterEach(() => {
  delete (window as unknown as { fbq?: unknown }).fbq;
});

describe("MetaPurchaseTracker", () => {
  it("fires fbq('track', 'Purchase', {...}) on mount with the supplied params", () => {
    render(
      <MetaPurchaseTracker
        value={1899.5}
        currency="USD"
        contentIds={["sku-1", "sku-2"]}
        orderId="order-42"
      />,
    );
    const fbq = (window as unknown as { fbq: ReturnType<typeof vi.fn> }).fbq;
    expect(fbq).toHaveBeenCalledWith("track", "Purchase", {
      value: 1899.5,
      currency: "USD",
      content_ids: ["sku-1", "sku-2"],
      content_type: "product",
      eventID: "order-42",
    });
  });

  it("omits eventID when no orderId is supplied", () => {
    render(
      <MetaPurchaseTracker
        value={50}
        currency="USD"
        contentIds={["sku-1"]}
      />,
    );
    const fbq = (window as unknown as { fbq: ReturnType<typeof vi.fn> }).fbq;
    const payload = fbq.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(payload).toBeDefined();
    expect("eventID" in payload).toBe(false);
  });

  it("does not double-fire when re-rendered with the same props", () => {
    const props = {
      value: 100,
      currency: "USD",
      contentIds: ["sku-1"] as readonly string[],
    };
    const { rerender } = render(<MetaPurchaseTracker {...props} />);
    rerender(<MetaPurchaseTracker {...props} />);
    rerender(<MetaPurchaseTracker {...props} />);
    const fbq = (window as unknown as { fbq: ReturnType<typeof vi.fn> }).fbq;
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op when fbq is missing (pixel never loaded)", () => {
    delete (window as unknown as { fbq?: unknown }).fbq;
    expect(() =>
      render(
        <MetaPurchaseTracker
          value={1}
          currency="USD"
          contentIds={["sku-1"]}
        />,
      ),
    ).not.toThrow();
  });
});
