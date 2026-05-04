import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-3qt.4.4: smoke tests for the /getting-it-home page.
// Verifies: metadata export, H1, zone list from LOCAL_ZONES, and that the
// address check form section is present. AddressCheckForm is mocked because
// it's a client component that hits a Server Action.

vi.mock("./AddressCheckForm", () => ({
  AddressCheckForm: () => <div data-testid="address-check-form" />,
}));

vi.mock("@/app/getting-it-home/AddressCheckForm", () => ({
  AddressCheckForm: () => <div data-testid="address-check-form" />,
}));

import GettingItHomePage, { metadata } from "@/app/getting-it-home/page";
import { LOCAL_ZONES } from "@/lib/delivery/local-zones";

describe("GettingItHomePage — metadata", () => {
  it("exports a metadata title containing 'Getting It Home'", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/getting it home/i);
  });

  it("exports a non-empty metadata description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description ?? "").length).toBeGreaterThan(0);
  });
});

describe("GettingItHomePage — structure", () => {
  it("renders the H1 'Getting It Home'", () => {
    render(<GettingItHomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /getting it home/i }),
    ).toBeTruthy();
  });

  it("renders the address check section heading", () => {
    render(<GettingItHomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /check your address/i }),
    ).toBeTruthy();
  });

  it("renders the delivery zones section heading", () => {
    render(<GettingItHomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /our four delivery zones/i }),
    ).toBeTruthy();
  });

  it("renders one list item per LOCAL_ZONE entry", () => {
    const { container } = render(<GettingItHomePage />);
    const zoneList = container.querySelector("[data-slot='gih-zones-list']");
    expect(zoneList).not.toBeNull();
    const zoneItems = zoneList!.querySelectorAll("[data-zone]");
    expect(zoneItems.length).toBe(LOCAL_ZONES.length);
  });

  it("renders each zone's name", () => {
    render(<GettingItHomePage />);
    for (const zone of LOCAL_ZONES) {
      expect(screen.getByText(zone.name)).toBeTruthy();
    }
  });

  it("renders curbside and white-glove pricing for each zone", () => {
    const { container } = render(<GettingItHomePage />);
    for (const zone of LOCAL_ZONES) {
      const item = container.querySelector(`[data-zone="${zone.code}"]`);
      expect(item).not.toBeNull();
      expect(item!.textContent).toContain(String(zone.delivery));
      expect(item!.textContent).toContain(String(zone.whiteGlove));
    }
  });

  it("renders the AddressCheckForm placeholder", () => {
    render(<GettingItHomePage />);
    expect(screen.getByTestId("address-check-form")).toBeTruthy();
  });
});
