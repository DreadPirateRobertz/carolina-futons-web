import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// next/navigation hooks need stubs in jsdom; PLPControls only calls
// useRouter / usePathname / useSearchParams for the change handlers,
// not during initial render of the inputs we audit here.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/shop/futon-frames",
  useSearchParams: () => new URLSearchParams(),
}));

import { PLPControls } from "@/components/plp/PLPControls";

// cf-lmwq (cf-zmsq.followup): the Apply submit button and inStock checkbox
// had no focus-visible classes at all — keyboard users tabbing through the
// PLP filters saw only the browser default outline (or nothing in some
// themes), inconsistent with the cf-cta convention pinned by cf-zmsq on
// Header/PdpGallery/CartDrawer. The sort/price inputs used zinc-400
// instead of cf-cta — within-spec for inputs (focus: not focus-visible:)
// but visually drifted from the brand palette.
describe("PLPControls — focus-visible parity (cf-lmwq)", () => {
  function renderControls() {
    return render(
      <PLPControls
        sort="featured"
        priceMin={undefined}
        priceMax={undefined}
        inStockOnly={false}
        totalFiltered={24}
      />,
    );
  }

  it("Apply submit button carries focus-visible:ring-cf-cta", () => {
    const { container } = renderControls();
    const apply = container.querySelector('button[type="submit"]');
    expect(apply).not.toBeNull();
    const classes = (apply?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
    expect(classes).toContain("focus-visible:outline-none");
    expect(classes).toContain("focus-visible:ring-2");
    expect(classes).toContain("focus-visible:ring-offset-2");
  });

  it("inStock checkbox carries focus-visible:ring-cf-cta", () => {
    const { container } = renderControls();
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
    const classes = (checkbox?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });

  it("sort select uses cf-cta ring (not zinc-400)", () => {
    const { container } = renderControls();
    const select = container.querySelector('select#plp-sort');
    expect(select).not.toBeNull();
    const cls = select?.className ?? "";
    // Inputs use `focus:` (not `focus-visible:`) by convention — they
    // should ring on any focus including click. Bumping the color to the
    // brand cf-cta matches the rest of the form-input system.
    expect(cls).toMatch(/focus:ring-cf-cta\b/);
    expect(cls).not.toMatch(/focus:ring-zinc-400\b/);
  });

  it("priceMin + priceMax number inputs use cf-cta ring (not zinc-400)", () => {
    const { container } = renderControls();
    const inputs = container.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBe(2);
    for (const input of Array.from(inputs)) {
      const cls = (input as HTMLInputElement).className;
      expect(cls).toMatch(/focus:ring-cf-cta\b/);
      expect(cls).not.toMatch(/focus:ring-zinc-400\b/);
    }
  });
});
