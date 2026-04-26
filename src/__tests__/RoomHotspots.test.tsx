import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Stub useReducedMotion so the dot pulse class can be asserted both ways.
const reduceMotionSpy = vi.fn<() => boolean | null>(() => false);
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return { ...actual, useReducedMotion: () => reduceMotionSpy() };
});

import { RoomHotspots, type RoomHotspot } from "@/components/room/RoomHotspots";

const HOTSPOTS: RoomHotspot[] = [
  {
    id: "kingston",
    xPct: 30,
    yPct: 60,
    productSlug: "kingston-futon-frame",
    productName: "Kingston Futon Frame",
    formattedPrice: "$619.00",
  },
  {
    id: "ranchero",
    xPct: 70,
    yPct: 50,
    productSlug: "ranchero-murphy-cabinet-bed",
    productName: "Ranchero Murphy Cabinet Bed",
    formattedPrice: "$2,978.00",
  },
];

function renderRoom(override?: Partial<Parameters<typeof RoomHotspots>[0]>) {
  return render(
    <RoomHotspots
      src="/lifestyle/loft-living.jpg"
      alt="Loft living room with futon and Murphy cabinet"
      width={1200}
      height={800}
      hotspots={HOTSPOTS}
      {...override}
    />,
  );
}

// Popover lookup: locate by the product name text (rendered inside the
// popover) and walk up to the data-slot wrapper. The popover dropped
// `role="dialog"` since it's a disclosure, not a modal.
function popoverFor(productName: string | RegExp): HTMLElement | null {
  const text = screen.queryByText(productName);
  return (
    (text?.closest(
      '[data-slot="room-hotspot-popover"]',
    ) as HTMLElement | null) ?? null
  );
}

beforeEach(() => {
  reduceMotionSpy.mockReset();
  reduceMotionSpy.mockReturnValue(false);
});

describe("RoomHotspots", () => {
  it("renders the lifestyle image with the provided alt text", () => {
    renderRoom();
    const img = screen.getByRole("img", {
      name: /loft living room with futon/i,
    });
    expect(img).toBeInTheDocument();
  });

  it("forwards width + height to the underlying next/image for CLS sizing", () => {
    renderRoom();
    const img = screen.getByRole("img", { name: /loft living room/i });
    expect(img.getAttribute("width")).toBe("1200");
    expect(img.getAttribute("height")).toBe("800");
  });

  it("renders one tab-able dot per hotspot, named after the product", () => {
    renderRoom();
    expect(
      screen.getByRole("button", { name: /shop kingston futon frame/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /shop ranchero murphy cabinet bed/i }),
    ).toBeInTheDocument();
  });

  it("positions each dot via percentage left/top derived from the hotspot map", () => {
    renderRoom();
    const dot = screen.getByRole("button", { name: /shop kingston/i });
    const wrapper = dot.parentElement!;
    expect(wrapper.style.left).toBe("30%");
    expect(wrapper.style.top).toBe("60%");
  });

  it("opens a popover with product details on click", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("button", { name: /shop kingston/i }));
    const popover = popoverFor(/kingston futon frame/i);
    expect(popover).not.toBeNull();
    expect(popover!.textContent).toContain("$619.00");
    const link = screen.getByRole("link", { name: /view product/i });
    expect(link.getAttribute("href")).toBe("/products/kingston-futon-frame");
  });

  it("renders the PDP link href for each hotspot, not just the first", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("button", { name: /shop ranchero/i }));
    expect(
      screen.getByRole("link", { name: /view product/i }).getAttribute("href"),
    ).toBe("/products/ranchero-murphy-cabinet-bed");
  });

  it("URI-encodes product slugs to avoid breaking the PDP link", async () => {
    const user = userEvent.setup();
    renderRoom({
      hotspots: [
        {
          id: "weird",
          xPct: 40,
          yPct: 40,
          productSlug: "weird slug/with chars",
          productName: "Weird One",
          formattedPrice: "$1.00",
        },
      ],
    });
    await user.click(screen.getByRole("button", { name: /shop weird one/i }));
    expect(
      screen.getByRole("link", { name: /view product/i }).getAttribute("href"),
    ).toBe("/products/weird%20slug%2Fwith%20chars");
  });

  it("toggles the popover closed when the same dot is clicked again", async () => {
    const user = userEvent.setup();
    renderRoom();
    const dot = screen.getByRole("button", { name: /shop kingston/i });
    await user.click(dot);
    await user.click(dot);
    expect(popoverFor(/kingston futon frame/i)).toBeNull();
  });

  it("closes the open popover when Escape is pressed and returns focus to the dot", async () => {
    const user = userEvent.setup();
    renderRoom();
    const dot = screen.getByRole("button", { name: /shop kingston/i });
    await user.click(dot);
    expect(popoverFor(/kingston futon frame/i)).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(popoverFor(/kingston futon frame/i)).toBeNull();
    expect(document.activeElement).toBe(dot);
  });

  it("opens the popover when the focused dot is activated via Enter", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.tab();
    // First dot now focused but popover stays closed (standard disclosure pattern)
    expect(popoverFor(/kingston/i)).toBeNull();
    await user.keyboard("{Enter}");
    expect(popoverFor(/kingston futon frame/i)).not.toBeNull();
  });

  it("opens the popover when the focused dot is activated via Space", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.tab();
    expect(popoverFor(/kingston/i)).toBeNull();
    await user.keyboard("[Space]");
    expect(popoverFor(/kingston futon frame/i)).not.toBeNull();
  });

  it("Tab moves focus from the first dot to the second", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /shop kingston/i }),
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /shop ranchero/i }),
    );
  });

  it("Escape with no popover open does not throw", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.tab();
    await user.keyboard("{Escape}");
    // Still focused on the dot, no error thrown.
    expect(
      document.activeElement,
    ).toBe(screen.getByRole("button", { name: /shop kingston/i }));
  });

  it("reflects open state in aria-expanded on the dot button", async () => {
    const user = userEvent.setup();
    renderRoom();
    const dot = screen.getByRole("button", { name: /shop kingston/i });
    expect(dot.getAttribute("aria-expanded")).toBe("false");
    await user.click(dot);
    expect(dot.getAttribute("aria-expanded")).toBe("true");
  });

  it("ties the popover to its dot via aria-controls / id", async () => {
    const user = userEvent.setup();
    renderRoom();
    const dot = screen.getByRole("button", { name: /shop kingston/i });
    await user.click(dot);
    const popoverId = dot.getAttribute("aria-controls");
    expect(popoverId).toBeTruthy();
    expect(document.getElementById(popoverId!)).toBeInstanceOf(HTMLElement);
  });

  it("drops the pulse animation when prefers-reduced-motion is set", () => {
    reduceMotionSpy.mockReturnValue(true);
    renderRoom();
    const dot = screen.getByRole("button", { name: /shop kingston/i });
    const pulse = dot.querySelector('[aria-hidden="true"]');
    expect(pulse?.className).not.toMatch(/animate-ping/);
  });

  it("keeps the pulse animation when reduced motion is not set", () => {
    reduceMotionSpy.mockReturnValue(false);
    renderRoom();
    const dot = screen.getByRole("button", { name: /shop kingston/i });
    const pulse = dot.querySelector('[aria-hidden="true"]');
    expect(pulse?.className).toMatch(/animate-ping/);
  });

  it("renders gracefully with an empty hotspot array (image only)", () => {
    renderRoom({ hotspots: [] });
    expect(
      screen.getByRole("img", { name: /loft living room/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /shop /i })).toBeNull();
  });

  it("only one popover is open at a time across multiple dots", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("button", { name: /shop kingston/i }));
    await user.click(screen.getByRole("button", { name: /shop ranchero/i }));
    expect(popoverFor(/kingston/i)).toBeNull();
    expect(popoverFor(/ranchero murphy/i)).not.toBeNull();
  });

  it("drops hotspots whose xPct/yPct fall outside [0,100] (silent break prevention)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderRoom({
      hotspots: [
        ...HOTSPOTS,
        {
          id: "off-canvas",
          xPct: 200,
          yPct: 50,
          productSlug: "off",
          productName: "Off Canvas",
          formattedPrice: "$0",
        },
      ],
    });
    expect(
      screen.queryByRole("button", { name: /shop off canvas/i }),
    ).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("drops hotspots with NaN coordinates", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderRoom({
      hotspots: [
        {
          id: "nan",
          xPct: NaN,
          yPct: 50,
          productSlug: "nan",
          productName: "NaN One",
          formattedPrice: "$0",
        },
      ],
    });
    expect(screen.queryByRole("button", { name: /shop nan one/i })).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("drops hotspots with empty productSlug or productName", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderRoom({
      hotspots: [
        {
          id: "empty-slug",
          xPct: 50,
          yPct: 50,
          productSlug: "",
          productName: "Has Name",
          formattedPrice: "$0",
        },
      ],
    });
    expect(
      screen.queryByRole("button", { name: /shop has name/i }),
    ).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("drops duplicate-id hotspots so the only-one-open invariant holds", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderRoom({
      hotspots: [
        HOTSPOTS[0]!,
        { ...HOTSPOTS[1]!, id: "kingston" }, // dup id
      ],
    });
    // Only the first kingston survives; second dropped.
    const buttons = screen.queryAllByRole("button", { name: /^shop /i });
    expect(buttons).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
