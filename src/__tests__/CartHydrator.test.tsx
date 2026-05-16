// cfw-0uv0: contract tests for CartHydrator's logError migration.
// Two ops:
//   - hydrateCartAction (action returned ok:false)
//   - transport (.catch on the promise — RSC / network fault)
// Plus a happy-path no-logError baseline.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// Hoisted so the component's logError import resolves to the mock.
const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const mockHydrate = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/cart", () => ({
  hydrateCartAction: mockHydrate,
}));

const mockDispatch = vi.hoisted(() => vi.fn());
vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({ dispatch: mockDispatch }),
}));

import { CartHydrator } from "@/components/cart/CartHydrator";

beforeEach(() => {
  mockHydrate.mockReset();
  mockDispatch.mockReset();
  mockLogError.mockReset();
  delete process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS;
});

describe("<CartHydrator /> — logError migration (cfw-0uv0)", () => {
  it("happy path: action resolves ok:true, dispatches hydrate, no logError", async () => {
    mockHydrate.mockResolvedValueOnce({
      ok: true,
      lines: [{ productId: "p1" }],
    });
    render(<CartHydrator />);
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "hydrate" }),
      );
    });
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("action returns ok:false: logError op=hydrateCartAction with synthesized Error", async () => {
    mockHydrate.mockResolvedValueOnce({ ok: false, error: "wix outage" });
    render(<CartHydrator />);
    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalledWith(
        "CartHydrator",
        "hydrateCartAction",
        expect.any(Error),
      );
    });
    // Synthesized error message carries the action's reason for grouping
    const [, , err] = mockLogError.mock.calls[0]!;
    expect((err as Error).message).toContain("wix outage");
  });

  it("promise rejects: logError op=transport (distinguishes from action-level failure)", async () => {
    mockHydrate.mockRejectedValueOnce(new Error("RSC fault"));
    render(<CartHydrator />);
    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalledWith(
        "CartHydrator",
        "transport",
        expect.any(Error),
      );
    });
  });
});
