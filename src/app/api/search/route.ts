import { NextResponse, type NextRequest } from "next/server";

import { searchProducts } from "@/lib/wix/products";
import { searchPosts } from "@/lib/wix/blog";

export const dynamic = "force-dynamic";

const PRODUCT_PAGE_SIZE = 12;
const POST_PAGE_SIZE = 8;

// cf-3qt.5.4 + cf-94l (cf-ruhm.2): thin server endpoint backing the /search
// page (and later the header suggestions box). Queries Wix Stores by product
// name + Wix Blog by post title in parallel. Empty/missing q returns an
// empty result, not 400 — the page renders the guided empty state from the
// same shape. cf-94l surfaces per-type totals so the consumer can build
// pagination headers without re-counting.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const trimmed = q.trim();
  if (!trimmed) {
    return NextResponse.json({
      ok: true,
      q: "",
      products: [],
      posts: [],
      total: 0,
      productsTotal: 0,
      postsTotal: 0,
    });
  }

  const [productsResult, postsResult] = await Promise.all([
    searchProducts(trimmed, { pageSize: PRODUCT_PAGE_SIZE }),
    searchPosts(trimmed, { pageSize: POST_PAGE_SIZE }),
  ]);

  return NextResponse.json({
    ok: true,
    q: trimmed,
    products: productsResult.items.map((p) => ({
      id: p._id ?? "",
      slug: p.slug ?? "",
      name: p.name ?? "",
      priceFormatted: p.priceData?.formatted?.price ?? null,
      imageUrl: p.media?.mainMedia?.image?.url ?? null,
    })),
    posts: postsResult.items.map((p) => ({
      id: p._id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
    })),
    // total is the FULL match count (sum of both types), useful for the
    // consumer's header. productsTotal/postsTotal split it per type for
    // tab counts on /search.
    total: productsResult.total + postsResult.total,
    productsTotal: productsResult.total,
    postsTotal: postsResult.total,
  });
}
