import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

// cf-o1wv (cf-yu2l.F1.cache-test): pin the React.cache dedup contract
// on /spring-sale's fetchSpringSaleLanding wrapper. The page calls it
// from BOTH generateMetadata AND the default-export page render — without
// React.cache each path round-trips to the Wix Stores SDK, doubling load.
//
// The bead originally proposed an e2e Playwright spec because vitest can't
// see Next.js's RSC AsyncLocalStorage scope. The cf-gsca PR #678 pattern
// solves this without Playwright: mock `react.cache` with an args-keyed
// Map memoizer that emulates request-scoped memoization, then assert the
// underlying data-layer fn is invoked exactly once across both call sites.
//
// Strict win over a real e2e:
// - No Playwright runtime, no Wix interceptor, no preview deploy.
// - The mocked cache implements the SAME contract React.cache provides
//   (memoize-by-args inside a single execution context).
// - A refactor that drops `cache()` fails this test loudly — exactly the
//   silent-doubling regression the bead names.

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Sentry no-op (some of the page's transitive imports tag failures).
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn(async () => true),
}));

// Args-keyed Map memoizer — emulates React.cache inside a request scope.
// Vanilla React.cache outside RSC is identity-passthrough; without this
// mock the underlying fn fires twice (once per call) and the assertion
// looks like a regression that's actually a test-environment artifact.
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

// Stub the derived-products resolver — page render path needs it.
vi.mock("@/lib/shop/derived-products", () => ({
  resolveDerivedProducts: vi.fn().mockResolvedValue({ items: [], error: null }),
}));

describe("SpringSale React.cache dedup contract (cf-o1wv)", () => {
  it("fires getLandingBySlug exactly once across generateMetadata + page render", async () => {
    const getLandingBySlugSpy = vi.fn(async () => ({
      slug: "spring-sale",
      headline: "Spring Sale on mattresses",
      subheadline: "Test sub",
      ctaPrimaryLabel: "Shop",
      ctaPrimaryHref: "/shop/mattresses-sale",
      ctaSecondaryLabel: "Browse",
      ctaSecondaryHref: "/shop/mattresses",
    }));

    vi.doMock("@/lib/wix/cf3qt", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/wix/cf3qt")>();
      return { ...actual, getLandingBySlug: getLandingBySlugSpy };
    });

    const { default: SpringSalePage, generateMetadata } = await import(
      "@/app/spring-sale/page"
    );

    // Order matches Next.js App Router: generateMetadata runs first,
    // then the default export renders. React.cache should dedup the
    // two reads into a single Wix call.
    await generateMetadata();
    await SpringSalePage();

    expect(getLandingBySlugSpy).toHaveBeenCalledTimes(1);
    expect(getLandingBySlugSpy).toHaveBeenCalledWith("spring-sale");
  });

  it("still calls getLandingBySlug once when only generateMetadata runs (regression guard for the cache key)", async () => {
    const getLandingBySlugSpy = vi.fn(async () => null);

    vi.doMock("@/lib/wix/cf3qt", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/wix/cf3qt")>();
      return { ...actual, getLandingBySlug: getLandingBySlugSpy };
    });

    const { generateMetadata } = await import("@/app/spring-sale/page");

    await generateMetadata();

    expect(getLandingBySlugSpy).toHaveBeenCalledTimes(1);
  });

  it("still calls getLandingBySlug once when only the page render runs (regression guard for the cache key)", async () => {
    const getLandingBySlugSpy = vi.fn(async () => null);

    vi.doMock("@/lib/wix/cf3qt", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/wix/cf3qt")>();
      return { ...actual, getLandingBySlug: getLandingBySlugSpy };
    });

    const { default: SpringSalePage } = await import(
      "@/app/spring-sale/page"
    );

    await SpringSalePage();

    expect(getLandingBySlugSpy).toHaveBeenCalledTimes(1);
  });

  it("tolerates a getLandingBySlug rejection without doubling the call (cache still dedups)", async () => {
    const getLandingBySlugSpy = vi.fn(async () => {
      throw new Error("wix outage");
    });

    vi.doMock("@/lib/wix/cf3qt", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/wix/cf3qt")>();
      return { ...actual, getLandingBySlug: getLandingBySlugSpy };
    });

    const { default: SpringSalePage, generateMetadata } = await import(
      "@/app/spring-sale/page"
    );

    // The wrapped fn catches the rejection and returns null per the
    // existing fail-soft contract; both call sites should reuse the
    // same cached null instead of re-firing the failing Wix call.
    await generateMetadata();
    await SpringSalePage();

    expect(getLandingBySlugSpy).toHaveBeenCalledTimes(1);
  });
});
