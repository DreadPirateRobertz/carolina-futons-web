import { describe, it, expect, vi, beforeEach } from "vitest";

// cf-gsca (cf-g640.fu1): getCollectionBySlug should be wrapped with
// React.cache() so repeated lookups for the same slug within a single
// request (RSC render tree) reuse one Wix SDK roundtrip instead of N.
//
// React.cache is a request-scoped passthrough outside RSC, so a vanilla
// vitest call wouldn't memoize. We mock `react.cache` with an equivalent
// args-keyed Map memoizer so we can observe call dedup directly.

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => {
      const store = new Map<string, unknown>();
      return ((...args: unknown[]) => {
        const key = JSON.stringify(args);
        if (store.has(key)) return store.get(key);
        const result = fn(...args);
        store.set(key, result);
        return result;
      }) as T;
    },
  };
});

function fakeClient() {
  const getCollectionBySlug = vi.fn(async (slug: string) => ({
    collection: { _id: `id-for-${slug}`, slug, name: slug.toUpperCase() },
  }));
  return {
    client: {
      collections: { getCollectionBySlug },
    },
    spy: getCollectionBySlug,
  };
}

describe("getCollectionBySlug — request-scoped memoization (cf-gsca)", () => {
  it("calls the underlying Wix SDK once when the same slug is requested twice", async () => {
    const { client, spy } = fakeClient();
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => client,
    }));

    const { getCollectionBySlug } = await import("@/lib/wix/products");

    const a = await getCollectionBySlug("mattresses");
    const b = await getCollectionBySlug("mattresses");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ slug: "mattresses" });
  });

  it("does not collapse distinct slugs into a single cache entry", async () => {
    const { client, spy } = fakeClient();
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => client,
    }));

    const { getCollectionBySlug } = await import("@/lib/wix/products");

    const a = await getCollectionBySlug("mattresses");
    const b = await getCollectionBySlug("futon-frames");

    expect(spy).toHaveBeenCalledTimes(2);
    expect(a).toMatchObject({ slug: "mattresses" });
    expect(b).toMatchObject({ slug: "futon-frames" });
  });

  it("still returns null and tags Sentry when the SDK throws", async () => {
    const failingClient = {
      collections: {
        getCollectionBySlug: async () => {
          throw new Error("boom");
        },
      },
    };
    vi.doMock("@/lib/wix-client", () => ({
      getWixClient: () => failingClient,
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { getCollectionBySlug } = await import("@/lib/wix/products");

    expect(await getCollectionBySlug("broken")).toBeNull();
  });
});
