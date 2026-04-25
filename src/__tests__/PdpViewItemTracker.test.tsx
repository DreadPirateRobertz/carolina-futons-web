import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const eventMocks = vi.hoisted(() => ({
  trackViewItem: vi.fn(),
}));

vi.mock("@/lib/analytics/ga4-events", () => ({
  trackViewItem: eventMocks.trackViewItem,
}));

beforeEach(() => {
  eventMocks.trackViewItem.mockReset();
});

describe("PdpViewItemTracker", () => {
  it("fires trackViewItem with the supplied item on mount", async () => {
    const { PdpViewItemTracker } = await import(
      "@/components/product/PdpViewItemTracker"
    );
    render(
      <PdpViewItemTracker
        item={{
          item_id: "P-1",
          item_name: "Monterey Futon",
          item_category: "frames",
          price: 1299,
        }}
      />,
    );
    expect(eventMocks.trackViewItem).toHaveBeenCalledTimes(1);
    expect(eventMocks.trackViewItem).toHaveBeenCalledWith({
      item_id: "P-1",
      item_name: "Monterey Futon",
      item_category: "frames",
      price: 1299,
    });
  });

  it("re-fires when item_id changes (PDP-to-PDP navigation)", async () => {
    const { PdpViewItemTracker } = await import(
      "@/components/product/PdpViewItemTracker"
    );
    const { rerender } = render(
      <PdpViewItemTracker
        item={{ item_id: "P-1", item_name: "A", price: 100 }}
      />,
    );
    rerender(
      <PdpViewItemTracker
        item={{ item_id: "P-2", item_name: "B", price: 200 }}
      />,
    );
    expect(eventMocks.trackViewItem).toHaveBeenCalledTimes(2);
  });

  it("does not re-fire on cosmetic prop changes when item_id is stable", async () => {
    const { PdpViewItemTracker } = await import(
      "@/components/product/PdpViewItemTracker"
    );
    const { rerender } = render(
      <PdpViewItemTracker
        item={{ item_id: "P-1", item_name: "A", price: 100 }}
      />,
    );
    rerender(
      <PdpViewItemTracker
        item={{ item_id: "P-1", item_name: "A renamed", price: 110 }}
      />,
    );
    expect(eventMocks.trackViewItem).toHaveBeenCalledTimes(1);
  });
});
