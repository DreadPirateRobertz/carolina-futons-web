import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DashboardShell,
  DASHBOARD_TABS,
} from "@/components/member/DashboardShell";

describe("DashboardShell", () => {
  it("renders the member display name from nickname when present", () => {
    render(
      <DashboardShell
        memberId="m1"
        memberName="Chris"
        memberEmail="chris@example.com"
        activeTab="overview"
      >
        <p>body</p>
      </DashboardShell>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Welcome back, Chris",
    );
    expect(screen.getByText("chris@example.com")).toBeInTheDocument();
  });

  it("falls back to email when memberName is null", () => {
    render(
      <DashboardShell
        memberId="m1"
        memberName={null}
        memberEmail="chris@example.com"
        activeTab="overview"
      >
        <p>body</p>
      </DashboardShell>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Welcome back, chris@example.com",
    );
  });

  it('falls back to "Member" when both name and email are null', () => {
    render(
      <DashboardShell
        memberId="m1"
        memberName={null}
        memberEmail={null}
        activeTab="overview"
      >
        <p>body</p>
      </DashboardShell>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Welcome back, Member",
    );
  });

  it("trims whitespace-only memberName and falls back to email", () => {
    render(
      <DashboardShell
        memberId="m1"
        memberName="   "
        memberEmail="chris@example.com"
        activeTab="overview"
      >
        <p>body</p>
      </DashboardShell>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Welcome back, chris@example.com",
    );
  });

  it("marks the active tab with aria-current=page", () => {
    render(
      <DashboardShell
        memberId="m1"
        memberName="Chris"
        memberEmail="chris@example.com"
        activeTab="orders"
      >
        <p>body</p>
      </DashboardShell>,
    );
    const active = screen.getByRole("link", { name: "Orders" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveAttribute("data-active", "true");

    const inactive = screen.getByRole("link", { name: "Overview" });
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive).toHaveAttribute("data-active", "false");
  });

  it("renders all 6 tab links in the documented order", () => {
    render(
      <DashboardShell
        memberId="m1"
        memberName="Chris"
        memberEmail={null}
        activeTab="overview"
      >
        <p>body</p>
      </DashboardShell>,
    );
    const nav = screen.getByRole("navigation", { name: "Account sections" });
    const links = Array.from(nav.querySelectorAll("a"));
    // cf-dmos (PR #619): Addresses tab added between Wishlist and Profile.
    // cf-03e (cf-ruhm-w3.4): "Preferences" tab label aligned to "Notifications"
    // for Wix-prod parity. The /dashboard/preferences route is unchanged.
    expect(links.map((a) => a.textContent)).toEqual([
      "Overview",
      "Orders",
      "Wishlist",
      "Addresses",
      "Profile",
      "Notifications",
    ]);
  });

  it("exposes memberId on the body slot for downstream scoping", () => {
    render(
      <DashboardShell
        memberId="member-42"
        memberName="Chris"
        memberEmail={null}
        activeTab="overview"
      >
        <p>body</p>
      </DashboardShell>,
    );
    const body = document.querySelector('[data-slot="member-dashboard-body"]');
    expect(body).toHaveAttribute("data-member-id", "member-42");
  });

  it("renders children inside the body slot", () => {
    render(
      <DashboardShell
        memberId="m1"
        memberName="Chris"
        memberEmail={null}
        activeTab="overview"
      >
        <p data-testid="custom-child">custom body</p>
      </DashboardShell>,
    );
    expect(screen.getByTestId("custom-child")).toHaveTextContent("custom body");
  });

  it("DASHBOARD_TABS covers the 6 documented sub-bead destinations", () => {
    // cf-dmos (PR #619): /dashboard/addresses added between wishlist and profile.
    expect(DASHBOARD_TABS.map((t) => t.href)).toEqual([
      "/dashboard",
      "/dashboard/orders",
      "/dashboard/wishlist",
      "/dashboard/addresses",
      "/dashboard/profile",
      "/dashboard/preferences",
    ]);
  });
});
