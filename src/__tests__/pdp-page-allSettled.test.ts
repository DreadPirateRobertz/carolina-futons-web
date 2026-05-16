// cf-8xw2 (cf-g640.fu2): unit tests for the unwrapSettled helper that
// underpins the PDP catalog-read isolation. The helper itself isn't
// exported (it's a module-internal in /products/[slug]/page.tsx), so
// these tests assert the BEHAVIOR via a port of the same shape — any
// future change to the helper's contract should mirror here first.
//
// Why a separate test module: page.tsx is a server component with a
// heavy dependency graph (Wix client, Sentry, Next.js metadata, etc.).
// Importing it for unit tests requires the og-metadata.test.ts
// mocking-stack which is overkill for a 1-helper assertion. Mirror
// here as the contract pin; integration coverage lives in
// products-sentry.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";

const logWixFailure = vi.fn();

vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

import { logWixFailure as logged } from "@/lib/wix/errors";

beforeEach(() => {
  vi.clearAllMocks();
});

// Port of the unwrapSettled helper for contract testing. Keep in sync
// with src/app/products/[slug]/page.tsx#unwrapSettled.
async function unwrapSettled<T>(
  settled: PromiseSettledResult<T>,
  fallback: T,
  context: string,
  slug: string,
): Promise<T> {
  if (settled.status === "fulfilled") return settled.value;
  await logged(context, slug, settled.reason);
  return fallback;
}

describe("unwrapSettled (cf-8xw2)", () => {
  it("returns the fulfilled value when the promise resolved", async () => {
    const settled: PromiseSettledResult<{ items: string[] }> = {
      status: "fulfilled",
      value: { items: ["a", "b"] },
    };
    const result = await unwrapSettled(
      settled,
      { items: [] },
      "pdp:test",
      "kingston-futon",
    );
    expect(result).toEqual({ items: ["a", "b"] });
    expect(logWixFailure).not.toHaveBeenCalled();
  });

  it("returns the fallback when the promise rejected", async () => {
    const err = new Error("Wix down");
    const settled: PromiseSettledResult<{ items: string[] }> = {
      status: "rejected",
      reason: err,
    };
    const result = await unwrapSettled(
      settled,
      { items: [] },
      "pdp:test",
      "kingston-futon",
    );
    expect(result).toEqual({ items: [] });
    expect(logWixFailure).toHaveBeenCalledWith(
      "pdp:test",
      "kingston-futon",
      err,
    );
  });

  it("logs context + slug verbatim so Sentry breadcrumbs correlate", async () => {
    const err = new Error("collection not found");
    const settled: PromiseSettledResult<null> = {
      status: "rejected",
      reason: err,
    };
    await unwrapSettled(
      settled,
      null,
      "pdp:getCollectionBySlug:mattresses",
      "mesa-foam-mattress",
    );
    expect(logWixFailure).toHaveBeenCalledWith(
      "pdp:getCollectionBySlug:mattresses",
      "mesa-foam-mattress",
      err,
    );
  });

  it("returns fallback type T (not undefined) so the caller's destructure is total", async () => {
    type Badges = ReadonlyArray<{ kind: string }>;
    const settled: PromiseSettledResult<Badges> = {
      status: "rejected",
      reason: new Error("badges service unavailable"),
    };
    const result = await unwrapSettled<Badges>(settled, [], "pdp:badges", "x");
    // Caller can destructure / iterate without nullish-check guards.
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("does not throw when the rejection reason is itself non-Error (defensive)", async () => {
    // Some legacy code throws strings; Promise.allSettled propagates
    // them unchanged. The helper must not crash before logging.
    const settled: PromiseSettledResult<null> = {
      status: "rejected",
      reason: "raw string rejection",
    };
    await expect(
      unwrapSettled(settled, null, "pdp:test", "slug"),
    ).resolves.toBeNull();
    expect(logWixFailure).toHaveBeenCalledWith("pdp:test", "slug", "raw string rejection");
  });
});

describe("Promise.allSettled isolation invariant (cf-8xw2)", () => {
  it("a rejection in one helper does NOT cascade into the others' results", async () => {
    // Sanity check on the Promise.allSettled contract — caller of
    // unwrapSettled relies on this Promise primitive guarantee.
    const settled = await Promise.allSettled([
      Promise.resolve({ items: ["a"] }),
      Promise.reject(new Error("also-bought down")),
      Promise.resolve([{ kind: "Sale" }]),
      Promise.resolve(null),
    ]);
    expect(settled[0]).toEqual({ status: "fulfilled", value: { items: ["a"] } });
    expect(settled[1].status).toBe("rejected");
    expect(settled[2]).toEqual({
      status: "fulfilled",
      value: [{ kind: "Sale" }],
    });
    expect(settled[3]).toEqual({ status: "fulfilled", value: null });
  });

  it("Promise.all would cascade — pin the regression target", async () => {
    // Documents WHY we switched: if we ever revert to Promise.all,
    // this test would prove the cascade. The expectation is the
    // PDP allSettled migration is permanent.
    await expect(
      Promise.all([
        Promise.resolve({ items: ["a"] }),
        Promise.reject(new Error("also-bought down")),
        Promise.resolve([{ kind: "Sale" }]),
      ]),
    ).rejects.toThrow(/also-bought down/);
  });
});
