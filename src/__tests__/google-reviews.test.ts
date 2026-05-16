import { describe, it, expect, vi, beforeEach } from "vitest";

// cfw-logger migration: loadReviews's catch branch routes through
// logError so a fetch outage shows up in Sentry under
// source=google-reviews. The mock isolates the test from real Sentry.
const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

import {
  fetchGoogleReviews,
  loadReviews,
  mapGbpReview,
  type GbpReview,
  type GbpReviewsResponse,
} from "@/lib/discovery/google-reviews";
import { REVIEWS } from "@/lib/discovery/reviews";

beforeEach(() => {
  logErrorMock.mockReset();
});

function gbpReview(overrides: Partial<GbpReview> = {}): GbpReview {
  return {
    reviewId: "abc123",
    reviewer: { displayName: "Jane D." },
    starRating: "FIVE",
    comment: "Beautiful hardwood futon frame. Solid and silent.",
    createTime: "2026-03-04T12:34:56.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("mapGbpReview", () => {
  it("maps a valid GBP review into the internal Review shape", () => {
    const r = mapGbpReview(gbpReview());
    expect(r).not.toBeNull();
    expect(r!.rating).toBe(5);
    expect(r!.author).toBe("Jane D.");
    expect(r!.date).toBe("2026-03-04");
    expect(r!.body).toContain("Beautiful hardwood");
    // Title is derived from the first sentence, capped at TITLE_MAX chars.
    expect(r!.title.length).toBeGreaterThan(0);
    expect(r!.title.length).toBeLessThanOrEqual(80);
  });

  it("returns null when the comment is missing or whitespace-only", () => {
    expect(mapGbpReview(gbpReview({ comment: undefined }))).toBeNull();
    expect(mapGbpReview(gbpReview({ comment: "   " }))).toBeNull();
  });

  it("returns null when the star rating is unspecified", () => {
    expect(
      mapGbpReview(gbpReview({ starRating: "STAR_RATING_UNSPECIFIED" })),
    ).toBeNull();
    expect(mapGbpReview(gbpReview({ starRating: undefined }))).toBeNull();
  });

  it("returns null when the createTime cannot be parsed to yyyy-mm-dd", () => {
    expect(mapGbpReview(gbpReview({ createTime: undefined }))).toBeNull();
    expect(mapGbpReview(gbpReview({ createTime: "not-a-date" }))).toBeNull();
  });

  it("falls back to a generic author when displayName is absent", () => {
    const r = mapGbpReview(gbpReview({ reviewer: undefined }));
    expect(r!.author).toBe("Google reviewer");
  });

  it("infers the murphy-beds category from comment keywords", () => {
    const r = mapGbpReview(
      gbpReview({ comment: "Our Murphy bed cabinet is gorgeous." }),
    );
    expect(r!.category).toBe("murphy-beds");
  });

  it("infers the mattresses category from comment keywords", () => {
    const r = mapGbpReview(
      gbpReview({ comment: "The wool mattress is firm but cozy." }),
    );
    expect(r!.category).toBe("mattresses");
  });

  it("defaults to frames when no keyword matches", () => {
    const r = mapGbpReview(
      gbpReview({ comment: "Wonderful service from start to finish." }),
    );
    expect(r!.category).toBe("frames");
  });

  it("truncates long first-sentence titles with an ellipsis", () => {
    const longSentence = `${"A".repeat(120)}.`;
    const r = mapGbpReview(gbpReview({ comment: longSentence }));
    expect(r!.title.endsWith("…")).toBe(true);
    expect(r!.title.length).toBeLessThanOrEqual(80);
  });
});

describe("fetchGoogleReviews", () => {
  it("calls the GBP reviews endpoint with the access token in the Authorization header", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ reviews: [], averageRating: 0, totalReviewCount: 0 }),
    ) as unknown as typeof fetch;

    await fetchGoogleReviews({
      accountId: "acct/1",
      locationId: "loc/2",
      accessToken: "token-xyz",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/accounts/acct%2F1/locations/loc%2F2/reviews");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-xyz");
  });

  it("returns mapped reviews + aggregate from the GBP response", async () => {
    const body: GbpReviewsResponse = {
      reviews: [
        gbpReview({ reviewId: "r1" }),
        gbpReview({
          reviewId: "r2",
          starRating: "FOUR",
          comment: "Mattress is firm but comfortable.",
        }),
      ],
      averageRating: 4.5,
      totalReviewCount: 2,
    };
    const fetchImpl = vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch;

    const result = await fetchGoogleReviews({
      accountId: "a",
      locationId: "l",
      accessToken: "t",
      fetchImpl,
    });

    expect(result.reviews).toHaveLength(2);
    expect(result.averageRating).toBe(4.5);
    expect(result.totalReviewCount).toBe(2);
  });

  it("filters out invalid GBP rows (no comment, unspecified stars, bad date)", async () => {
    const body: GbpReviewsResponse = {
      reviews: [
        gbpReview({ reviewId: "ok" }),
        gbpReview({ reviewId: "no-comment", comment: undefined }),
        gbpReview({ reviewId: "unspecified", starRating: "STAR_RATING_UNSPECIFIED" }),
        gbpReview({ reviewId: "bad-date", createTime: "not-a-date" }),
      ],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch;

    const result = await fetchGoogleReviews({
      accountId: "a",
      locationId: "l",
      accessToken: "t",
      fetchImpl,
    });
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].id).toBe("gbp-ok");
  });

  it("throws a descriptive error when GBP returns a non-2xx", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("forbidden", { status: 403, statusText: "Forbidden" }),
    ) as unknown as typeof fetch;

    await expect(
      fetchGoogleReviews({
        accountId: "a",
        locationId: "l",
        accessToken: "t",
        fetchImpl,
      }),
    ).rejects.toThrow(/GBP API responded 403/);
  });
});

describe("loadReviews", () => {
  it("returns the fixture fallback in non-production when env is unset", async () => {
    const result = await loadReviews({
      env: { NODE_ENV: "test" },
    });
    expect(result.source).toBe("fixture");
    expect(result.ok).toBe(true);
    expect(result.reviews).toEqual(REVIEWS);
    expect(result.totalReviewCount).toBe(REVIEWS.length);
    expect(result.averageRating).toBeGreaterThan(0);
  });

  it("returns an empty source in production when env is unset (no fake reviews leak)", async () => {
    const result = await loadReviews({
      env: { NODE_ENV: "production" },
    });
    expect(result.source).toBe("empty");
    expect(result.reviews).toEqual([]);
    expect(result.averageRating).toBeNull();
    expect(result.totalReviewCount).toBeNull();
  });

  it("returns google data when env is configured and the fetch succeeds", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        reviews: [gbpReview()],
        averageRating: 4.9,
        totalReviewCount: 1,
      } satisfies GbpReviewsResponse),
    ) as unknown as typeof fetch;

    const result = await loadReviews({
      fetchImpl,
      env: {
        NODE_ENV: "production",
        GBP_ACCESS_TOKEN: "tok",
        GBP_ACCOUNT_ID: "acct",
        GBP_LOCATION_ID: "loc",
      },
    });
    expect(result.source).toBe("google");
    expect(result.ok).toBe(true);
    expect(result.reviews).toHaveLength(1);
    expect(result.averageRating).toBe(4.9);
  });

  it("returns ok=false + empty list when the fetch errors (friendly degradation)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const result = await loadReviews({
      fetchImpl,
      env: {
        NODE_ENV: "production",
        GBP_ACCESS_TOKEN: "tok",
        GBP_ACCOUNT_ID: "acct",
        GBP_LOCATION_ID: "loc",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.source).toBe("empty");
    expect(result.reviews).toEqual([]);
  });
});

// cfw-logger migration: loadReviews's catch branch routes through
// logError("google-reviews", "load failed", err). Pin the contract.
describe("loadReviews — logError observability", () => {
  const fetchError = new Error("network down");
  const fetchImpl = (() =>
    vi.fn(async () => {
      throw fetchError;
    }) as unknown as typeof fetch)();

  it("calls logError when the upstream fetch throws", async () => {
    await loadReviews({
      fetchImpl,
      env: {
        NODE_ENV: "production",
        GBP_ACCESS_TOKEN: "tok",
        GBP_ACCOUNT_ID: "acct",
        GBP_LOCATION_ID: "loc",
      },
    });
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });

  it("tags logError with scope='google-reviews' and message='load failed'", async () => {
    await loadReviews({
      fetchImpl,
      env: {
        NODE_ENV: "production",
        GBP_ACCESS_TOKEN: "tok",
        GBP_ACCOUNT_ID: "acct",
        GBP_LOCATION_ID: "loc",
      },
    });
    expect(logErrorMock).toHaveBeenCalledWith(
      "google-reviews",
      "load failed",
      expect.anything(),
    );
  });

  it("passes the caught Error instance directly to logError (preserves stack)", async () => {
    await loadReviews({
      fetchImpl,
      env: {
        NODE_ENV: "production",
        GBP_ACCESS_TOKEN: "tok",
        GBP_ACCOUNT_ID: "acct",
        GBP_LOCATION_ID: "loc",
      },
    });
    const [, , payload] = logErrorMock.mock.calls[0]!;
    expect(payload).toBe(fetchError);
  });
});
