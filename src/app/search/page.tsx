import type { Metadata } from "next";
import Link from "next/link";

import { searchProducts } from "@/lib/wix/products";
import { searchPosts, type BlogPostSummary } from "@/lib/wix/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search — Carolina Futons",
  description:
    "Search Carolina Futons products and journal posts. Solid-wood frames, natural mattresses, Murphy beds, and buying guides.",
  robots: { index: false, follow: true },
};

const PRODUCT_LIMIT = 12;
const POST_LIMIT = 8;

// cf-3qt.5.4: server-rendered /search?q=… results page. Two sections:
// products (Wix Stores by name) + articles (Wix Blog by title). Empty/missing
// q renders the guided-empty state instead of executing the queries. SDK
// failures degrade to "no matches" — searchProducts/searchPosts catch + log.
export default async function SearchPage(props: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await props.searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = (raw ?? "").trim();

  if (!q) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-playfair text-3xl font-semibold tracking-tight text-cf-espresso sm:text-4xl">
          Search
        </h1>
        <p className="mt-3 text-sm text-cf-muted">
          Type a product name or topic to search the catalog and the journal.
        </p>
        <SearchForm q="" />
        <SearchSuggestions />
      </main>
    );
  }

  const [products, posts] = await Promise.all([
    searchProducts(q, PRODUCT_LIMIT),
    searchPosts(q, POST_LIMIT),
  ]);

  const hasResults = products.length > 0 || posts.length > 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-3">
        <h1 className="font-playfair text-3xl font-semibold tracking-tight text-cf-espresso sm:text-4xl">
          Search results
        </h1>
        <p className="text-sm text-cf-muted">
          {hasResults
            ? `Showing ${products.length} ${products.length === 1 ? "product" : "products"} and ${posts.length} ${posts.length === 1 ? "article" : "articles"} for "${q}".`
            : `No results for "${q}".`}
        </p>
        <SearchForm q={q} />
      </header>

      {hasResults ? (
        <div className="mt-10 grid gap-12 lg:grid-cols-[2fr,1fr]">
          <ProductSection products={products} />
          <ArticleSection posts={posts} />
        </div>
      ) : (
        <NoResults q={q} />
      )}
    </main>
  );
}

function SearchForm({ q }: { q: string }) {
  return (
    <form
      role="search"
      action="/search"
      method="get"
      className="mt-6 flex max-w-xl items-center gap-2"
      data-slot="search-form"
    >
      <label htmlFor="search-q" className="sr-only">
        Search query
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search products and articles"
        className="h-11 flex-1 rounded-md border border-cf-divider bg-white px-3 text-sm text-cf-espresso placeholder:text-cf-muted focus:border-cf-cta focus:outline-none focus:ring-2 focus:ring-cf-cta/30"
      />
      <button
        type="submit"
        className="h-11 rounded-md bg-cf-cta px-4 text-sm font-medium text-white hover:bg-cf-cta/90 focus:outline-none focus:ring-2 focus:ring-cf-cta focus:ring-offset-2"
      >
        Search
      </button>
    </form>
  );
}

type SearchProduct = Awaited<ReturnType<typeof searchProducts>>[number];

function ProductSection({ products }: { products: ReadonlyArray<SearchProduct> }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="search-products-heading" data-slot="search-products">
      <h2
        id="search-products-heading"
        className="font-playfair text-xl font-semibold text-cf-espresso"
      >
        Products
      </h2>
      <ul className="mt-4 space-y-3">
        {products.map((p) => (
          <li
            key={p._id ?? p.slug}
            className="rounded-md border border-cf-divider bg-white/60 p-4"
          >
            <Link
              href={`/products/${p.slug}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
            >
              <p className="font-medium text-cf-espresso">{p.name}</p>
              {p.priceData?.formatted?.price ? (
                <p className="mt-1 text-sm text-cf-muted">
                  {p.priceData.formatted.price}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleSection({ posts }: { posts: ReadonlyArray<BlogPostSummary> }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="search-articles-heading" data-slot="search-articles">
      <h2
        id="search-articles-heading"
        className="font-playfair text-xl font-semibold text-cf-espresso"
      >
        Articles
      </h2>
      <ul className="mt-4 space-y-3">
        {posts.map((post) => (
          <li
            key={post._id}
            className="rounded-md border border-cf-divider bg-white/60 p-4"
          >
            <Link
              href={`/blog/${post.slug}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
            >
              <p className="font-medium text-cf-espresso">{post.title}</p>
              {post.excerpt ? (
                <p className="mt-1 text-sm text-cf-muted line-clamp-2">
                  {post.excerpt}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <section className="mt-10 max-w-2xl space-y-4" data-slot="search-no-results">
      <p className="text-cf-ink/80">
        We couldn&rsquo;t find products or articles matching{" "}
        <span className="font-medium text-cf-espresso">&ldquo;{q}&rdquo;</span>.
      </p>
      <SearchSuggestions />
    </section>
  );
}

function SearchSuggestions() {
  return (
    <div className="mt-8" data-slot="search-suggestions">
      <p className="text-sm font-medium text-cf-espresso">Try one of these:</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <li key={s.q}>
            <Link
              href={s.href}
              className="inline-flex items-center rounded-full border border-cf-divider bg-white/60 px-3 py-1 text-sm text-cf-espresso hover:border-cf-cta hover:text-cf-cta"
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SUGGESTIONS: ReadonlyArray<{ label: string; q: string; href: string }> = [
  { label: "Futon frames", q: "futon", href: "/search?q=futon" },
  { label: "Mattresses", q: "mattress", href: "/search?q=mattress" },
  { label: "Murphy beds", q: "murphy", href: "/search?q=murphy" },
  { label: "Buying guides", q: "guide", href: "/search?q=guide" },
];
