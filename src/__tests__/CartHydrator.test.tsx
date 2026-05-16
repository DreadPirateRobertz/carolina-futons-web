import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const mockHydrate = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/cart", () => ({
  hydrateCartAction: (...args: unknown[]) => mockHydrate(...args),
}));

const mockDispatch = vi.hoisted(() => vi.fn());
vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({ dispatch: mockDispatch }),
}));

import { CartHydrator } from "@/components/cart/CartHydrator";

beforeEach(() => {
  vi.clearAllMocks();
});

// Logger migration (cfw-logger batch 16): CartHydrator's two error paths
// (result.ok=false and transport-error .catch()) previously logged to
// console.error. They now forward to logError with distinct op tags so
// Sentry can split server-cart errors from network errors.
describe("CartHydrator logError migration", () => {
  it("calls logError with op='hydrateCartAction.result-error' when server returns ok=false", async () => {
    mockHydrate.mockResolvedValueOnce({ ok: false, error: "server down" });
    render(<CartHydrator />);
    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalled();
    });
    const [source, op, err] = mockLogError.mock.calls[0];
    expect(source).toBe("cart-hydrator");
    expect(op).toBe("hydrateCartAction.result-error");
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("server down");
  });

  it("calls logError with op='hydrateCartAction.transport' on .catch() (network/transport throw)", async () => {
    const networkErr = new Error("ECONNREFUSED");
    mockHydrate.mockRejectedValueOnce(networkErr);
    render(<CartHydrator />);
    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalled();
    });
    const [source, op, err] = mockLogError.mock.calls[0];
    expect(source).toBe("cart-hydrator");
    expect(op).toBe("hydrateCartAction.transport");
    expect(err).toBe(networkErr);
  });

  it("does NOT call logError on happy path (ok=true)", async () => {
    mockHydrate.mockResolvedValueOnce({ ok: true, lines: [] });
    render(<CartHydrator />);
    // Wait one microtask flush for the .then() to run.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockLogError).not.toHaveBeenCalled();
    // And the dispatch was called for hydrate
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "hydrate",
      lines: [],
    });
  });
});
