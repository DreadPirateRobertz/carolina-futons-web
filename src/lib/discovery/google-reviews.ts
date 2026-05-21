import { logError } from "@/lib/logging/log-error";

import {
  REVIEWS,
  type Review,
  type ReviewCategory,
  averageRating as fixtureAverageRating,
} from "./reviews";

const GBP_REVIEWS_ENDPOINT = "https://mybusiness.googleapis.com/v4";

export type GbpStarRating =
  | "STAR_RATING_UNSPECIFIED"
  | "ONE"
  | "TWO"
  | "THREE"
  | "FOUR"
  | "FIVE";

export interface GbpReview {
  reviewId?: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string };
  starRating?: GbpStarRating;
  comment?: string;
  createTime?: string;
  updateTime?: string;
}

export interface GbpReviewsResponse {
  reviews?: GbpReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

export interface FetchGoogleReviewsConfig {
  accountId: string;
  locationId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
  pageSize?: number;
}

export interface LoadedReviews {
  reviews: readonly Review[];
  averageRating: number | null;
  totalReviewCount: number | null;
  source: "google" | "fixture" | "empty";
  ok: boolean;
}

const STAR_TO_NUM: Record<GbpStarRating, 1 | 2 | 3 | 4 | 5 | null> = {
  STAR_RATING_UNSPECIFIED: null,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

const TITLE_MAX = 80;

export function mapGbpReview(g: GbpReview): Review | null {
  const rating = g.starRating ? STAR_TO_NUM[g.starRating] : null;
  if (rating === null) return null;
  const comment = g.comment?.trim();
  if (!comment) return null;
  const createDate = (g.createTime ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(createDate)) return null;
  const id = g.reviewId
    ? `gbp-${g.reviewId}`
    : `gbp-${createDate}-${comment.length}`;
  const author = g.reviewer?.displayName?.trim() || "Google reviewer";
  return {
    id,
    author,
    category: inferCategory(comment),
    rating,
    title: deriveTitle(comment),
    body: comment,
    date: createDate,
    productName: "",
  };
}

function deriveTitle(comment: string): string {
  const firstSentence = comment.split(/[.!?\n]/)[0]?.trim() ?? "";
  if (firstSentence.length === 0) return "Customer review";
  if (firstSentence.length <= TITLE_MAX) return firstSentence;
  return `${firstSentence.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

function inferCategory(comment: string): ReviewCategory {
  const c = comment.toLowerCase();
  if (c.includes("murphy")) return "murphy-beds";
  if (c.includes("mattress")) return "mattresses";
  return "frames";
}

export async function fetchGoogleReviews(
  config: FetchGoogleReviewsConfig,
): Promise<{
  reviews: Review[];
  averageRating: number | null;
  totalReviewCount: number | null;
}> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const url = new URL(
    `${GBP_REVIEWS_ENDPOINT}/accounts/${encodeURIComponent(
      config.accountId,
    )}/locations/${encodeURIComponent(config.locationId)}/reviews`,
  );
  if (config.pageSize) {
    url.searchParams.set("pageSize", String(config.pageSize));
  }

  const res = await fetchImpl(url.toString(), {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(
      `google-reviews: GBP API responded ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as GbpReviewsResponse;
  const reviews = (data.reviews ?? [])
    .map(mapGbpReview)
    .filter((r): r is Review => r !== null);
  return {
    reviews,
    averageRating:
      typeof data.averageRating === "number" ? data.averageRating : null,
    totalReviewCount:
      typeof data.totalReviewCount === "number" ? data.totalReviewCount : null,
  };
}

export interface LoadReviewsOptions {
  fetchImpl?: typeof fetch;
  env?: Partial<NodeJS.ProcessEnv>;
}

export async function loadReviews(
  options: LoadReviewsOptions = {},
): Promise<LoadedReviews> {
  const env = options.env ?? process.env;
  const accessToken = env.GBP_ACCESS_TOKEN?.trim();
  const accountId = env.GBP_ACCOUNT_ID?.trim();
  const locationId = env.GBP_LOCATION_ID?.trim();

  if (!accessToken || !accountId || !locationId) {
    if (env.NODE_ENV === "production") {
      return {
        reviews: [],
        averageRating: null,
        totalReviewCount: null,
        source: "empty",
        ok: true,
      };
    }
    return {
      reviews: REVIEWS,
      averageRating: fixtureAverageRating(REVIEWS),
      totalReviewCount: REVIEWS.length,
      source: "fixture",
      ok: true,
    };
  }

  try {
    const result = await fetchGoogleReviews({
      accountId,
      locationId,
      accessToken,
      fetchImpl: options.fetchImpl,
    });
    return { ...result, source: "google", ok: true };
  } catch (err) {
    // cfw-rlqo: routes through the shared logError helper so GBP fetch
    // failures ship to Sentry (level=error, tags { source: "google-reviews",
    // op: "load" }) with awaited flush — drop-event-safe on Vercel.
    await logError("google-reviews", "load", err, { accountId, locationId });
    return {
      reviews: [],
      averageRating: null,
      totalReviewCount: null,
      source: "empty",
      ok: false,
    };
  }
}
