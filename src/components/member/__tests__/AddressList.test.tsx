/**
 * cf-dmos (cf-zn5b.2 G-9): AddressList smoke tests.
 *
 * Confirms the empty-state branch + per-row Edit/Delete affordance
 * presence. The Server Action call sites are unit-tested in
 * src/app/actions/__tests__/addresses.test.ts; this file only covers
 * the rendering surface so the page-level wiring stays grep-able.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/actions/addresses", () => ({
  addAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
}));

import { AddressList } from "@/components/member/AddressList";
import type { Address } from "@/app/actions/addresses";

const SAMPLE: Address = {
  _id: "a1",
  addressLine: "100 Main St",
  city: "Asheville",
  subdivision: "NC",
  postalCode: "28801",
  country: "USA",
};

describe("AddressList", () => {
  it("renders the inline add-form when the member has no saved addresses", () => {
    render(<AddressList initial={[]} />);
    // Empty-state form auto-opens — no list rows + an Add form rendered.
    expect(screen.queryAllByTestId("address-row")).toHaveLength(0);
    expect(screen.getByTestId("address-form")).toBeInTheDocument();
  });

  it("renders one row per saved address with Edit + Delete buttons", () => {
    render(
      <AddressList
        initial={[
          SAMPLE,
          { ...SAMPLE, _id: "a2", addressLine: "200 Oak Ave" },
        ]}
      />,
    );
    const rows = screen.getAllByTestId("address-row");
    expect(rows).toHaveLength(2);
    expect(screen.getAllByTestId("address-row-edit")).toHaveLength(2);
    expect(screen.getAllByTestId("address-row-delete")).toHaveLength(2);
  });

  it("shows the Add-a-new-address trigger once at least one address exists", () => {
    render(<AddressList initial={[SAMPLE]} />);
    expect(screen.getByTestId("address-list-add-trigger")).toBeInTheDocument();
  });

  it("renders city/state/zip line", () => {
    render(<AddressList initial={[SAMPLE]} />);
    expect(screen.getByText(/Asheville, NC 28801/)).toBeInTheDocument();
  });
});
