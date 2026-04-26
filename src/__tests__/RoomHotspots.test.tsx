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

beforeEach(() => {
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
    // Position lives on the wrapping <div>, not the button itself.
    const wrapper = dot.parentElement!;
    expect(wrapper.style.left).toBe("30%");
    expect(wrapper.style.top).toBe("60%");
  });

  it("opens a popover with product details on click", async () => {
    const user = userEvent.setup();
    renderRoom();
    const dot = screen.getByRole("button", { name: /shop kingston/i });
    await user.click(dot);
    const dialog = screen.getByRole("dialog", { name: /kingston futon frame/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog.textContent).toContain("$619.00");
    const link = screen.getByRole("link", { name: /view product/i });
    expect(link.getAttribute("href")).toBe("/products/kingston-futon-frame");
  });

  it("toggles the popover closed when the same dot is clicked again", async () => {
    const user = userEvent.setup();
    renderRoom();
    const dot = screen.getByRole("button", { name: /shop kingston/i });
    await user.click(dot);
    await user.click(dot);
    expect(
      screen.queryByRole("dialog", { name: /kingston/i }),
    ).not.toBeInTheDocument();
  });

  it("closes the open popover when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("button", { name: /shop kingston/i }));
    expect(screen.getByRole("dialog", { name: /kingston/i })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: /kingston/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the popover when the focused dot is activated via Enter", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.tab();
    // First dot now focused but popover stays closed (standard disclosure pattern)
    expect(
      screen.queryByRole("dialog", { name: /kingston/i }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("dialog", { name: /kingston futon frame/i }),
    ).toBeInTheDocument();
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
    expect(
      screen.queryByRole("dialog", { name: /kingston/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: /ranchero/i }),
    ).toBeInTheDocument();
  });
});
