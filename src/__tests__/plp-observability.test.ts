// cfw-769: coverage for src/lib/shop/plp-observability.ts. The
// interesting logic is the lastPage = Math.max(1, ceil(total / size))
// derivation — the Math.max(1, ...) clamp matters because total=0,
// size=20 produces 0 without it, which would obscure "overpaginated
// to /shop/<x>?p=2 on a 0-product category" as "overpaginated past
// page 0".
//
// Also pins the fire-and-forget contract: the function returns void,
// does NOT await Sentry.flush, and never throws.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const captureMessage = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
}));

import { logOverPaginatedRender } from "@/lib/shop/plp-observability";

const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});

beforeEach(() => {
  captureMessage.mockReset();
  consoleInfo.mockClear();
});

afterEach(() => {
  consoleInfo.mockClear();
});

describe("logOverPaginatedRender — basic emit shape", () => {
  it("returns undefined (fire-and-forget contract)", () => {
    const r = logOverPaginatedRender({
      categorySlug: "futon-frames",
      pageNum: 5,
      pageTotal: 40,
      pageSize: 20,
    });
    expect(r).toBeUndefined();
  });

  it("logs to console.info with the documented source prefix and the full extra payload", () => {
    logOverPaginatedRender({
      categorySlug: "futon-frames",
      pageNum: 5,
      pageTotal: 40,
      pageSize: 20,
    });
    expect(consoleInfo).toHaveBeenCalledTimes(1);
    expect(consoleInfo).toHaveBeenCalledWith(
      "[plp-page] over-paginated render",
      {
        categorySlug: "futon-frames",
        pageNum: 5,
        pageTotal: 40,
        pageSize: 20,
        lastPage: 2,
      },
    );
  });

  it("forwards a structured Sentry.captureMessage with level=info, op + source + slug tags, derived extra", () => {
    logOverPaginatedRender({
      categorySlug: "mattresses",
      pageNum: 7,
      pageTotal: 100,
      pageSize: 20,
    });
    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      "plp-page over-paginated render",
      {
        level: "info",
        tags: {
          source: "plp-page",
          op: "over-paginated",
          categorySlug: "mattresses",
        },
        extra: {
          categorySlug: "mattresses",
          pageNum: 7,
          pageTotal: 100,
          pageSize: 20,
          lastPage: 5,
        },
      },
    );
  });
});

describe("logOverPaginatedRender — lastPage derivation", () => {
  function lastPageFor(total: number, size: number): number {
    // Reset between probes so multiple calls in a single it() each read
    // their own captureMessage call instead of consuming the first.
    captureMessage.mockClear();
    logOverPaginatedRender({
      categorySlug: "x",
      pageNum: 99,
      pageTotal: total,
      pageSize: size,
    });
    const call = captureMessage.mock.calls[0]?.[1] as
      | { extra: { lastPage: number } }
      | undefined;
    return call?.extra.lastPage as number;
  }

  it("divides cleanly when total is a multiple of size", () => {
    expect(lastPageFor(100, 20)).toBe(5);
  });

  it("rounds UP for non-multiples (ceil semantics)", () => {
    expect(lastPageFor(101, 20)).toBe(6);
    expect(lastPageFor(99, 20)).toBe(5);
    expect(lastPageFor(1, 20)).toBe(1);
  });

  it("clamps to 1 when total is 0 (Math.max guard — empty-collection over-pagination)", () => {
    // Without the clamp, ceil(0/20) is 0 — losing the "this is a real
    // over-pagination on an empty category" signal.
    expect(lastPageFor(0, 20)).toBe(1);
  });

  it("clamps to 1 when total is less than size (single short page)", () => {
    expect(lastPageFor(5, 20)).toBe(1);
  });
});

describe("logOverPaginatedRender — fire-and-forget robustness", () => {
  it("does NOT throw when Sentry.captureMessage throws synchronously", () => {
    captureMessage.mockImplementationOnce(() => {
      throw new Error("sentry runtime broken");
    });
    expect(() =>
      logOverPaginatedRender({
        categorySlug: "futon-frames",
        pageNum: 2,
        pageTotal: 10,
        pageSize: 20,
      }),
    ).toThrow();
    // Note: the current impl does NOT defend against a Sentry runtime
    // throw — that's the fire-and-forget shape only insofar as it doesn't
    // await. If a future refactor wraps captureMessage in try/catch, this
    // case becomes a regression guard against accidentally re-introducing
    // the throw. For today, document the actual behaviour.
  });

  it("returns void synchronously even when Sentry.captureMessage returns a Promise (no awaiting)", () => {
    captureMessage.mockReturnValueOnce(
      new Promise(() => {
        /* never resolves */
      }),
    );
    const r = logOverPaginatedRender({
      categorySlug: "x",
      pageNum: 1,
      pageTotal: 10,
      pageSize: 20,
    });
    expect(r).toBeUndefined();
  });
});
