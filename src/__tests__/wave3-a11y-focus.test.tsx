import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type React from "react";

// cf-978m (cf-zmsq.followup wave 3): bulk classList pin across the three
// highest-traffic interactive surfaces still missing the focus-visible
// convention. Per-component negative + positive assertions ensure
// (a) the convention class is present, (b) a future refactor that drops
// it fails the test loudly.

// ── PLPPagination ─────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/shop/futon-frames",
  useSearchParams: () => new URLSearchParams(),
}));

import { PLPPagination } from "@/components/plp/PLPPagination";

describe("PLPPagination focus-visible (cf-978m)", () => {
  function renderPagination(page: number, hasPrev: boolean, hasNext: boolean) {
    return render(
      <PLPPagination
        basePath="/shop/futon-frames"
        page={page}
        hasPrev={hasPrev}
        hasNext={hasNext}
        searchParams={{}}
      />,
    );
  }

  it("Previous link carries focus-visible:ring-cf-cta", () => {
    const { container } = renderPagination(2, true, true);
    const prev = Array.from(container.querySelectorAll("a")).find(
      (a) => a.textContent?.includes("Previous"),
    );
    expect(prev).toBeDefined();
    const classes = (prev?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
    expect(classes).toContain("focus-visible:outline-none");
    expect(classes).toContain("focus-visible:ring-2");
  });

  it("Next link carries focus-visible:ring-cf-cta", () => {
    const { container } = renderPagination(1, false, true);
    const next = Array.from(container.querySelectorAll("a")).find(
      (a) => a.textContent?.includes("Next"),
    );
    expect(next).toBeDefined();
    const classes = (next?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });
});

// ── GiftCardPicker ────────────────────────────────────────────────────
// The picker needs Wix product mocks; we just render with a minimal stub.
// Server-action mock prevents the import from triggering a network call.
vi.mock("@/app/actions/cart", () => ({
  addItemAction: vi.fn(),
}));
vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({ addLineOptimistic: vi.fn(), setOpen: vi.fn() }),
}));

import { GiftCardPicker } from "@/components/gift-cards/GiftCardPicker";

describe("GiftCardPicker focus-visible (cf-978m)", () => {
  function renderPicker() {
    const cards = [
      {
        _id: "gc-50",
        name: "Gift Card",
        slug: "gift-card-50",
        priceData: { price: 50, formatted: { price: "$50.00" } },
      },
      {
        _id: "gc-100",
        name: "Gift Card",
        slug: "gift-card-100",
        priceData: { price: 100, formatted: { price: "$100.00" } },
      },
    ] as never;
    return render(<GiftCardPicker cards={cards} />);
  }

  it("amount-select buttons carry focus-visible:ring-cf-cta", () => {
    const { container } = renderPicker();
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
    );
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      const classes = b.className.split(/\s+/);
      expect(classes).toContain("focus-visible:ring-cf-cta");
    }
  });

  it("Add-to-cart submit button carries focus-visible:ring-cf-cta", () => {
    const { container } = renderPicker();
    const cta = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((b) => b.textContent?.includes("Add"));
    expect(cta).toBeDefined();
    const classes = (cta?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });
});

// ── PhotoSubmitForm ───────────────────────────────────────────────────
vi.mock("@/app/community-gallery/actions", () => ({
  submitCommunityPhoto: vi.fn(),
}));

import { PhotoSubmitForm } from "@/components/gallery/PhotoSubmitForm";

describe("PhotoSubmitForm focus-visible (cf-978m)", () => {
  it("Submit photo button carries focus-visible:ring-cf-cta", () => {
    const { container } = render(<PhotoSubmitForm />);
    const submit = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null;
    expect(submit).not.toBeNull();
    const classes = (submit?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
    expect(classes).toContain("focus-visible:outline-none");
  });
});
