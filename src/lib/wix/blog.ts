// Thin typed accessors for the Wix Blog module. Mirrors src/lib/wix/products.ts:
// each helper is a 1-call wrapper that catches SDK failures and returns
// null/[] so a transient Wix outage renders as "Coming soon" or 404 instead
// of a raw 500. Sentry is wired via logWixFailure.
//
// SDK shape (per @wix/blog 1.0.x):
//   client.posts.queryPosts()  → builder; .limit(n).find() returns { items }
//   client.posts.getPostBySlug(slug, { fieldsets }) → { post }
// Post fields used here: _id, slug, title, excerpt, contentText, heroImage,
// firstPublishedDate, minutesToRead.
import { getWixClient } from "@/lib/wix-client";
import { logWixFailure } from "@/lib/wix/errors";
import {
  getStaticPostBySlug,
  STATIC_BLOG_POSTS,
  type StaticBlogPost,
} from "@/lib/blog/static-posts";

export type BlogPostSummary = {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  heroImageUrl: string | null;
  firstPublishedDate: Date | null;
  minutesToRead: number | null;
};

export type BlogPost = BlogPostSummary & {
  contentText: string;
};

const RICH_FIELDSETS = ["URL", "CONTENT_TEXT", "RICH_CONTENT", "SEO"] as const;

type RawPost = {
  _id?: string | null;
  slug?: string | null;
  title?: string | null;
  excerpt?: string | null;
  contentText?: string | null;
  heroImage?: string | { url?: string | null } | null;
  firstPublishedDate?: Date | string | null;
  minutesToRead?: number | null;
};

function toIso(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function staticToSummary(p: StaticBlogPost): BlogPostSummary {
  return {
    _id: p.slug,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    heroImageUrl: null,
    firstPublishedDate: p.firstPublishedDate,
    minutesToRead: p.minutesToRead,
  };
}

function staticToPost(p: StaticBlogPost | null | undefined): BlogPost | null {
  if (!p) return null;
  return { ...staticToSummary(p), contentText: p.contentText };
}

function heroUrl(hero: RawPost["heroImage"]): string | null {
  if (!hero) return null;
  if (typeof hero === "string") return hero || null;
  return hero.url ?? null;
}

function toSummary(post: RawPost): BlogPostSummary | null {
  const slug = typeof post.slug === "string" ? post.slug.trim() : "";
  const id = typeof post._id === "string" ? post._id : "";
  if (!slug || !id) return null;
  return {
    _id: id,
    slug,
    title: post.title ?? "",
    excerpt: post.excerpt ?? "",
    heroImageUrl: heroUrl(post.heroImage),
    firstPublishedDate: toIso(post.firstPublishedDate ?? null),
    minutesToRead:
      typeof post.minutesToRead === "number" ? post.minutesToRead : null,
  };
}

export async function listPosts(limit = 12): Promise<BlogPostSummary[]> {
  try {
    const client = getWixClient();
    const result = await client.posts.queryPosts().limit(limit).find();
    const items = (result.items ?? []) as RawPost[];
    const posts = items
      .map(toSummary)
      .filter((p): p is BlogPostSummary => p !== null);
    return posts.length > 0 ? posts : STATIC_BLOG_POSTS.map(staticToSummary);
  } catch (err) {
    await logWixFailure("wix", "listPosts", err);
    return [];
  }
}

export async function listAllPostSlugs(limit = 100): Promise<string[]> {
  try {
    const client = getWixClient();
    const result = await client.posts.queryPosts().limit(limit).find();
    const items = (result.items ?? []) as RawPost[];
    return items
      .map((p) => (typeof p.slug === "string" ? p.slug.trim() : ""))
      .filter((s) => s.length > 0);
  } catch (err) {
    await logWixFailure("wix", "listAllPostSlugs", err);
    return [];
  }
}

// cf-1lf (cf-ruhm.3): case-insensitive title SUBSTRING match for /search.
// Empty/whitespace q returns []; page renders the guided empty state.
//
// WHY this is an in-memory scan, not an SDK query: Wix Blog queryPosts()
// builder only exposes startsWith("title", q) — substring `contains` is not
// in the SDK. The previous impl (cf-3qt.5.4) used startsWith so
// "Best mattress for a futon" failed to match "futon". This impl mirrors
// searchProducts: fetch up to BLOG_SEARCH_CAP posts, filter by
// title.toLowerCase().includes(lower), then slice to `limit`. The cap
// bounds the worst-case fetch (Wix blogs rarely exceed a few hundred
// posts; raise BLOG_SEARCH_CAP if cf-3qt content scales past it).
const BLOG_SEARCH_CAP = 200;

export async function searchPosts(
  q: string,
  limit = 12,
): Promise<BlogPostSummary[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  try {
    const client = getWixClient();
    const result = await client.posts
      .queryPosts()
      .limit(BLOG_SEARCH_CAP)
      .find();
    const items = (result.items ?? []) as RawPost[];
    return items
      .map(toSummary)
      .filter((p): p is BlogPostSummary => p !== null)
      .filter((p) => p.title.toLowerCase().includes(lower))
      .slice(0, limit);
  } catch (err) {
    await logWixFailure("wix", `searchPosts(${trimmed})`, err);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!slug) return null;
  try {
    const client = getWixClient();
    const result = await client.posts.getPostBySlug(slug, {
      fieldsets: [...RICH_FIELDSETS],
    });
    const raw = (result?.post ?? null) as RawPost | null;
    if (!raw) return staticToPost(getStaticPostBySlug(slug));
    const summary = toSummary(raw);
    if (!summary) return null;
    return {
      ...summary,
      contentText: raw.contentText ?? "",
    };
  } catch (err) {
    await logWixFailure("wix", `getPostBySlug(${slug})`, err);
    return staticToPost(getStaticPostBySlug(slug));
  }
}
