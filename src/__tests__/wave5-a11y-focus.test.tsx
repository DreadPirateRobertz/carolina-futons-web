import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// cf-if28 (cf-zmsq.followup wave 5): focus-visible pins on member/*
// post-login surfaces and data-testid="search-total-count" assertion on
// /search count header. Pattern matches the 4 prior waves' cf-cta ring
// convention.

// ── Next.js / hooks stubs ─────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

// LogoutButton fetches /api/auth/session in handleLogout — fetch unused at render.
// AddressList + AddressForm use server actions. Mock them so render is
// deterministic; we never invoke the handlers in this audit.
vi.mock("@/app/actions/account-addresses", () => ({
  listAddressesAction: vi.fn().mockResolvedValue({ ok: true, addresses: [] }),
  deleteAddressAction: vi.fn(),
}));
vi.mock("@/app/actions/wishlist", () => ({
  generateShareToken: vi.fn(),
  listWishlistAction: vi.fn().mockResolvedValue({ ok: true, items: [] }),
  removeFromWishlistAction: vi.fn(),
}));

import { LogoutButton } from "@/components/member/LogoutButton";
import { WishlistShareButton } from "@/components/member/WishlistShareButton";
import { DashboardShell } from "@/components/member/DashboardShell";

describe("LogoutButton focus-visible (cf-if28)", () => {
  it("Sign out button carries focus-visible:ring-cf-cta", () => {
    const { container } = render(<LogoutButton />);
    const btn = container.querySelector('button[data-testid="logout-button"]');
    expect(btn).not.toBeNull();
    const classes = (btn?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
    expect(classes).toContain("focus-visible:outline-none");
  });
});

describe("WishlistShareButton focus-visible (cf-if28)", () => {
  it("Share button carries focus-visible:ring-cf-cta", () => {
    const { container } = render(<WishlistShareButton />);
    const btn = container.querySelector(
      'button[data-testid="wishlist-share-button"]',
    );
    expect(btn).not.toBeNull();
    const classes = (btn?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });
});

describe("DashboardShell focus-visible (cf-if28)", () => {
  it("every tab Link carries focus-visible:ring-cf-cta", () => {
    const { container } = render(
      <DashboardShell activeTab="overview" memberId="m-1" memberEmail="x@y.com" memberName={null}>
        <div />
      </DashboardShell>,
    );
    const tabs = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        'nav[data-slot="member-dashboard-tabs"] a',
      ),
    );
    expect(tabs.length).toBeGreaterThan(0);
    for (const t of tabs) {
      const classes = t.className.split(/\s+/);
      expect(classes).toContain("focus-visible:ring-cf-cta");
    }
  });
});

// ── AddressList / AddressForm ────────────────────────────────────────
// These components import server actions + use hooks; render via the
// component's no-data branch where possible to keep the surface small.
import { AddressForm } from "@/components/member/AddressForm";

describe("AddressForm focus-visible (cf-if28)", () => {
  function renderForm() {
    return render(<AddressForm />);
  }

  it("Save submit button carries focus-visible:ring-cf-cta", () => {
    const { container } = renderForm();
    const submit = container.querySelector(
      'button[type="submit"][data-testid="address-form-submit"]',
    );
    expect(submit).not.toBeNull();
    const classes = (submit?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });
});

// AddressList: edit + delete + add-new triggers
import { AddressList } from "@/components/member/AddressList";

describe("AddressList focus-visible (cf-if28)", () => {
  // AddressList auto-opens the AddressForm when `initial=[]` (adding=true);
  // the "Add a new address" trigger only renders when at least one
  // saved address exists. Seed one so we hit the trigger branch.
  const seed = [
    {
      _id: "a-1",
      addressLine: "1 Main",
      city: "Asheville",
      subdivision: "NC",
      postalCode: "28801",
      country: "US",
    },
  ];

  it("Add-new trigger button carries focus-visible:ring-cf-cta", async () => {
    const { findByTestId } = render(
      <AddressList initial={seed as never} />,
    );
    const trigger = await findByTestId("address-list-add-trigger");
    const classes = trigger.className.split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });

  it("Edit + Delete row buttons carry focus-visible:ring-cf-cta", async () => {
    const { findByTestId } = render(
      <AddressList initial={seed as never} />,
    );
    const edit = await findByTestId("address-row-edit");
    const del = await findByTestId("address-row-delete");
    expect(edit.className.split(/\s+/)).toContain("focus-visible:ring-cf-cta");
    expect(del.className.split(/\s+/)).toContain("focus-visible:ring-cf-cta");
  });
});

// WishlistList — empty state has a "Browse the shop" Link.
import { WishlistList } from "@/components/member/WishlistList";

describe("WishlistList focus-visible (cf-if28)", () => {
  it("Browse-the-shop Link in empty state carries focus-visible:ring-cf-cta", () => {
    const { container } = render(<WishlistList initialItems={[]} />);
    const browse = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Browse"),
    );
    expect(browse).toBeDefined();
    const classes = (browse?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });
});

// OrderHistoryList — track-shipment Link per order. trackShipmentHref
// requires fulfillmentStatus=FULFILLED + a number + a memberEmail.
import { OrderHistoryList } from "@/components/member/OrderHistoryList";

describe("OrderHistoryList focus-visible (cf-if28)", () => {
  const order = {
    id: "o-1",
    number: "1001",
    placedAt: new Date().toISOString(),
    fulfillmentStatus: "FULFILLED" as const,
    statusLabel: "Shipped",
    totals: { formattedTotal: "$799.00" },
    itemCount: 1,
  };

  it("Track-shipment Link carries focus-visible:ring-cf-cta", () => {
    const { container } = render(
      <OrderHistoryList
        orders={[order] as never}
        memberEmail="user@example.com"
      />,
    );
    const trackLink = container.querySelector(
      'a[data-slot="order-track-link"]',
    );
    expect(trackLink).not.toBeNull();
    const classes = (trackLink?.className ?? "").split(/\s+/);
    expect(classes).toContain("focus-visible:ring-cf-cta");
  });
});
