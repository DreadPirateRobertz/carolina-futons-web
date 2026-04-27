import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

// cf-pdp-variant-swatches: Mock useReducedMotion so we can exercise both the
// motion branch (layoutId-driven morph) and the reduced branch (no layout
// animation). Mirrors the pattern in PdpStickyCta.test.tsx.
const mockUseReducedMotion = vi.fn<() => boolean | null>();
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

import { VariantSwatchGrid } from "@/components/product/VariantSwatchGrid";

const choices = [
  { value: "Sand", description: "Sand" },
  { value: "Espresso", description: "Espresso" },
  { value: "Charcoal", description: "Charcoal" },
];

beforeEach(() => {
  mockUseReducedMotion.mockReset();
  mockUseReducedMotion.mockReturnValue(false);
});

describe("VariantSwatchGrid", () => {
  it("renders a labeled group with one swatch button per choice", () => {
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={() => {}}
      />,
    );
    const group = screen.getByRole("group", { name: /color/i });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("marks the selected swatch with aria-pressed=true and others false", () => {
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Espresso"
        onSelect={() => {}}
      />,
    );
    const sand = screen.getByRole("button", { name: /color: sand/i });
    const espresso = screen.getByRole("button", { name: /color: espresso/i });
    expect(sand).toHaveAttribute("aria-pressed", "false");
    expect(espresso).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect with the swatch value on click", () => {
    const onSelect = vi.fn();
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /color: charcoal/i }));
    expect(onSelect).toHaveBeenCalledWith("Charcoal");
  });

  it("disables unavailable choices and announces them in the label", () => {
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={() => {}}
        isAvailable={(v) => v !== "Charcoal"}
      />,
    );
    const charcoal = screen.getByRole("button", { name: /color: charcoal.*unavailable/i });
    expect(charcoal).toBeDisabled();
  });

  it("does not invoke onSelect when an unavailable swatch is clicked", () => {
    const onSelect = vi.fn();
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={onSelect}
        isAvailable={(v) => v !== "Charcoal"}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /color: charcoal/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("ArrowRight moves focus and selection to the next enabled swatch", () => {
    const onSelect = vi.fn();
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={onSelect}
      />,
    );
    const sand = screen.getByRole("button", { name: /color: sand/i });
    sand.focus();
    fireEvent.keyDown(sand, { key: "ArrowRight" });
    const espresso = screen.getByRole("button", { name: /color: espresso/i });
    expect(document.activeElement).toBe(espresso);
    expect(onSelect).toHaveBeenLastCalledWith("Espresso");
  });

  it("ArrowLeft from first wraps to the last enabled swatch", () => {
    const onSelect = vi.fn();
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={onSelect}
      />,
    );
    const sand = screen.getByRole("button", { name: /color: sand/i });
    sand.focus();
    fireEvent.keyDown(sand, { key: "ArrowLeft" });
    const charcoal = screen.getByRole("button", { name: /color: charcoal/i });
    expect(document.activeElement).toBe(charcoal);
    expect(onSelect).toHaveBeenLastCalledWith("Charcoal");
  });

  it("Home/End jump to first/last enabled swatch", () => {
    const onSelect = vi.fn();
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Espresso"
        onSelect={onSelect}
      />,
    );
    const espresso = screen.getByRole("button", { name: /color: espresso/i });
    espresso.focus();
    fireEvent.keyDown(espresso, { key: "Home" });
    expect(onSelect).toHaveBeenLastCalledWith("Sand");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(onSelect).toHaveBeenLastCalledWith("Charcoal");
  });

  it("ArrowRight skips unavailable swatches", () => {
    const onSelect = vi.fn();
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={onSelect}
        isAvailable={(v) => v !== "Espresso"}
      />,
    );
    const sand = screen.getByRole("button", { name: /color: sand/i });
    sand.focus();
    fireEvent.keyDown(sand, { key: "ArrowRight" });
    const charcoal = screen.getByRole("button", { name: /color: charcoal/i });
    expect(document.activeElement).toBe(charcoal);
    expect(onSelect).toHaveBeenLastCalledWith("Charcoal");
  });

  it("renders the active-ring with a shared layoutId when motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={() => {}}
      />,
    );
    const ring = container.querySelector('[data-slot="swatch-active-ring"]');
    expect(ring).not.toBeNull();
    // Shared layoutId is the morph mechanic — Framer animates a single ring
    // element between selected swatches across renders.
    expect(ring?.getAttribute("data-layout-id")).toBe(
      "variant-swatch-active-ring-Color",
    );
  });

  it("drops the layoutId morph when prefers-reduced-motion is true (WCAG 2.3.3)", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={() => {}}
      />,
    );
    const ring = container.querySelector('[data-slot="swatch-active-ring"]');
    // Static ring still renders for visual selection; the morph layoutId is
    // dropped so Framer doesn't animate position between swatches.
    expect(ring).not.toBeNull();
    expect(ring?.getAttribute("data-layout-id")).toBeNull();
  });

  it("scopes the layoutId per option name so two grids don't cross-morph", () => {
    const { container } = render(
      <div>
        <VariantSwatchGrid
          optionName="Color"
          choices={choices}
          selected="Sand"
          onSelect={() => {}}
        />
        <VariantSwatchGrid
          optionName="Size"
          choices={[
            { value: "Full", description: "Full" },
            { value: "Queen", description: "Queen" },
          ]}
          selected="Full"
          onSelect={() => {}}
        />
      </div>,
    );
    const ringIds = Array.from(
      container.querySelectorAll('[data-slot="swatch-active-ring"]'),
    ).map((el) => el.getAttribute("data-layout-id"));
    expect(ringIds).toEqual([
      "variant-swatch-active-ring-Color",
      "variant-swatch-active-ring-Size",
    ]);
  });

  it("each swatch has a min 44x44 hit target (WCAG 2.5.5)", () => {
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={() => {}}
      />,
    );
    for (const value of ["Sand", "Espresso", "Charcoal"]) {
      const btn = screen.getByRole("button", {
        name: new RegExp(`color: ${value}`, "i"),
      });
      expect(btn.className).toMatch(/min-h-11/);
      expect(btn.className).toMatch(/min-w-11/);
    }
  });

  it("renders a color preview swatch when choice has media.mainMedia.image.url", () => {
    const colorChoices = [
      {
        value: "Sand",
        description: "Sand",
        media: { mainMedia: { image: { url: "https://img/sand.jpg" } } },
      },
    ];
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={colorChoices}
        selected="Sand"
        onSelect={() => {}}
      />,
    );
    const swatch = screen
      .getByRole("button", { name: /color: sand/i })
      .querySelector('[data-slot="swatch-preview"]') as HTMLElement | null;
    expect(swatch).not.toBeNull();
    expect(swatch?.style.backgroundImage).toContain("https://img/sand.jpg");
  });

  it("tabIndex — tab-in goes to first enabled swatch when selected matches no choice", () => {
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Unknown"
        onSelect={() => {}}
      />,
    );
    const sand = screen.getByRole("button", { name: /color: sand/i });
    const espresso = screen.getByRole("button", { name: /color: espresso/i });
    const charcoal = screen.getByRole("button", { name: /color: charcoal/i });
    expect(sand).toHaveAttribute("tabindex", "0");
    expect(espresso).toHaveAttribute("tabindex", "-1");
    expect(charcoal).toHaveAttribute("tabindex", "-1");
  });

  it("tabIndex — tab-in goes to first enabled swatch when selected is a disabled choice", () => {
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Charcoal"
        onSelect={() => {}}
        isAvailable={(v) => v !== "Charcoal"}
      />,
    );
    const sand = screen.getByRole("button", { name: /color: sand/i });
    const charcoal = screen.getByRole("button", { name: /color: charcoal.*unavailable/i });
    expect(sand).toHaveAttribute("tabindex", "0");
    expect(charcoal).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowDown moves focus and selection like ArrowRight", () => {
    const onSelect = vi.fn();
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={onSelect}
      />,
    );
    const sand = screen.getByRole("button", { name: /color: sand/i });
    sand.focus();
    fireEvent.keyDown(sand, { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /color: espresso/i }),
    );
    expect(onSelect).toHaveBeenLastCalledWith("Espresso");
  });

  it("ArrowUp moves focus and selection like ArrowLeft", () => {
    const onSelect = vi.fn();
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Sand"
        onSelect={onSelect}
      />,
    );
    const sand = screen.getByRole("button", { name: /color: sand/i });
    sand.focus();
    fireEvent.keyDown(sand, { key: "ArrowUp" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /color: charcoal/i }),
    );
    expect(onSelect).toHaveBeenLastCalledWith("Charcoal");
  });

  it("all-disabled: no button has tabIndex=0 and arrow keys are no-ops", () => {
    const onSelect = vi.fn();
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected={undefined}
        onSelect={onSelect}
        isAvailable={() => false}
      />,
    );
    for (const value of ["Sand", "Espresso", "Charcoal"]) {
      const btn = screen.getByRole("button", {
        name: new RegExp(`color: ${value}`, "i"),
      });
      expect(btn).toHaveAttribute("tabindex", "-1");
    }
    const sand = screen.getByRole("button", { name: /color: sand/i });
    fireEvent.keyDown(sand, { key: "ArrowRight" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("reduced-motion: all swatch buttons still render correctly when motion is disabled", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(
      <VariantSwatchGrid
        optionName="Color"
        choices={choices}
        selected="Espresso"
        onSelect={() => {}}
        isAvailable={(v) => v !== "Charcoal"}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: /color: espresso/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /color: charcoal.*unavailable/i }),
    ).toBeDisabled();
  });
});
