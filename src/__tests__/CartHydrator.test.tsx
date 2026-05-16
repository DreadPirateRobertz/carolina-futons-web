import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { CartHydrator } from "@/components/cart/CartHydrator";
import { CartProvider } from "@/components/cart/CartProvider";

// Pins the logError migration so an accidental revert to a bare
// console.error("[CartHydrator] …") (or to a string-interpolated prefix
// that bypasses the helper) fails loudly. Asserts on the console.error
// sink because logError forwards there in every env; the Sentry
// forwarder is prod-only and unit-tested in log.test.ts.
//
// Two failure paths exist:
//   - result.ok === false   → "[CartHydrator] hydrateCartAction failed"
//   - promise reject        → "[CartHydrator] hydrateCartAction transport error"

const hydrateMock = vi.fn();
vi.mock("@/app/actions/cart", () => ({
  hydrateCartAction: () => hydrateMock(),
  // The real module exports more actions; CartHydrator only uses hydrate.
}));

function renderHydrator() {
  return render(
    <CartProvider>
      <CartHydrator />
    </CartProvider>,
  );
}

describe("CartHydrator — logError migration", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    hydrateMock.mockReset();
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Ensure non-fixture mode so the hydrate path runs at all.
    vi.stubEnv("NEXT_PUBLIC_USE_FIXTURE_PRODUCTS", "0");
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("emits '[CartHydrator] hydrateCartAction failed' with the result.error payload on result.ok=false", async () => {
    const reason = "session-expired";
    hydrateMock.mockResolvedValueOnce({ ok: false, error: reason });
    renderHydrator();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(errSpy.mock.calls[0]![0]).toBe(
      "[CartHydrator] hydrateCartAction failed",
    );
    expect(errSpy.mock.calls[0]![1]).toBe(reason);
  });

  it("emits '[CartHydrator] hydrateCartAction transport error' with the rejected err on promise rejection", async () => {
    const thrown = new Error("ECONNRESET");
    hydrateMock.mockRejectedValueOnce(thrown);
    renderHydrator();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(errSpy.mock.calls[0]![0]).toBe(
      "[CartHydrator] hydrateCartAction transport error",
    );
    expect(errSpy.mock.calls[0]![1]).toBe(thrown);
  });

  it("does NOT log on the happy path (result.ok=true)", async () => {
    hydrateMock.mockResolvedValueOnce({ ok: true, lines: [] });
    renderHydrator();
    // Give the effect's microtask a chance to settle.
    await waitFor(() => expect(hydrateMock).toHaveBeenCalledTimes(1));
    expect(errSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
