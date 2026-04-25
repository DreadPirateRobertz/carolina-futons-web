import { NextResponse, type NextRequest } from "next/server";

import { searchProducts } from "@/lib/wix/products";
import { searchPosts } from "@/lib/wix/blog";

export const dynamic = "force-dynamic";

const PRODUCT_LIMIT = 12;
const POST_LIMIT = 8;

// cf-3qt.5.4: thin server endpoint backing the /search page and (later) the
// header suggestions box. Queries Wix Stores by product name + Wix Blog by
// post title in parallel. Empty/missing q returns an empty result, not 400 —
// the page renders the guided empty state from the same shape.
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
    });
  }

  const [products, posts] = await Promise.all([
    searchProducts(trimmed, PRODUCT_LIMIT),
    searchPosts(trimmed, POST_LIMIT),
  ]);

  return NextResponse.json({
    ok: true,
    q: trimmed,
    products: products.map((p) => ({
      id: p._id ?? "",
      slug: p.slug ?? "",
      name: p.name ?? "",
      priceFormatted: p.priceData?.formatted?.price ?? null,
      imageUrl: p.media?.mainMedia?.image?.url ?? null,
    })),
    posts: posts.map((p) => ({
      id: p._id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
    })),
    total: products.length + posts.length,
  });
}
