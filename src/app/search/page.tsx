import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { EmptySearchIllustration } from "@/components/illustrations/EmptySearchIllustration";
import { SearchTabs, parseSearchType, type SearchType } from "@/components/search/SearchTabs";
import { searchPages, type SearchPage as SearchPageEntry } from "@/lib/search/pages";
import { searchProducts } from "@/lib/wix/products";
import { searchPosts, type BlogPostSummary } from "@/lib/wix/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search — Carolina Futons",
  description:
    "Search Carolina Futons products, pages, and journal posts. Solid-wood frames, natural mattresses, Murphy beds, and buying guides.",
  robots: { index: false, follow: true },
};

const PRODUCT_LIMIT = 12;
const POST_LIMIT = 8;
const PAGE_LIMIT = 12;

// cf-76a (cf-ruhm.1): server-rendered /search?q=…&type=… results page.
// Wix-prod parity: 4-tab filter (All / Products / Pages / Blog) over the
// same three data sources (Wix Stores by name, in-repo Pages manifest,
// Wix Blog by title substring per cf-1lf). Empty/missing q renders the
// guided-empty state instead of executing the queries. SDK failures
// degrade to "no matches" — searchProducts/searchPosts catch + log;
// searchPages is in-memory and cannot throw.
//
// Originally cf-3qt.5.4 (Products + Articles only). cf-76a adds tabs +
// Pages reader; cf-1lf upstream fixes article substring search.
export default async function SearchPage(props: {
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>;
}) {
  const params = await props.searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = (raw ?? "").trim();
  const type = parseSearchType(params.type);

  if (!q) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-playfair text-3xl font-semibold tracking-tight text-cf-espresso sm:text-4xl">
          Search
        </h1>
        <p className="mt-3 text-sm text-cf-muted">
          Type a product name or topic to search the catalog, the site,
          and the journal.
        </p>
        <SearchForm q="" />
        <SearchSuggestions />
      </main>
    );
  }

  // Fetch every type in parallel — tab counts need totals for the strip
  // even when only one type is rendered below it (Wix prod does the same:
  // "All (41) · Products (12) · Pages (26) · Blog (3)").
  const [products, pages, posts] = await Promise.all([
    searchProducts(q, PRODUCT_LIMIT),
    Promise.resolve(searchPages(q, PAGE_LIMIT)),
    searchPosts(q, POST_LIMIT),
  ]);

  const counts = {
    all: products.length + pages.length + posts.length,
    products: products.length,
    pages: pages.length,
    articles: posts.length,
  };

  const hasResults = counts.all > 0;
  const showProducts = (type === "all" || type === "products") && products.length > 0;
  const showPages = (type === "all" || type === "pages") && pages.length > 0;
  const showArticles = (type === "all" || type === "articles") && posts.length > 0;
  const showAnyForActiveType = showProducts || showPages || showArticles;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-3">
        <h1 className="font-playfair text-3xl font-semibold tracking-tight text-cf-espresso sm:text-4xl">
          Search results
        </h1>
        {/* aria-live so screen readers re-announce the count on each
            submission (cf-ruhm.5 P2 in audit — partial fix here, full
            role="status" wrapper deferred to its own bead). */}
        <p
          className="text-sm text-cf-muted"
          aria-live="polite"
          aria-atomic="true"
        >
          {hasResults
            ? `${counts.all} ${counts.all === 1 ? "result" : "results"} for "${q}".`
            : `No results for "${q}".`}
        </p>
        <SearchForm q={q} />
      </header>

      {hasResults ? (
        <>
          <SearchTabs q={q} type={type} counts={counts} />
          {showAnyForActiveType ? (
            <div className="mt-10 space-y-12">
              {showProducts ? <ProductSection products={products} /> : null}
              {showPages ? <PagesSection pages={pages} /> : null}
              {showArticles ? <ArticleSection posts={posts} /> : null}
            </div>
          ) : (
            <NoResultsForType q={q} type={type} />
          )}
        </>
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
        placeholder="Search products, pages, and articles"
        className="h-11 flex-1 rounded-md border border-cf-divider bg-white dark:bg-cf-cream px-3 text-sm text-cf-espresso placeholder:text-cf-muted focus:border-cf-cta focus:outline-none focus:ring-2 focus:ring-cf-cta/30"
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
            data-slot="product-card"
            className="rounded-md border border-cf-divider bg-white/60 dark:bg-cf-cream dark:border-cf-ink/30 p-4"
          >
            <Link
              href={`/products/${p.slug}`}
              className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
            >
              {p.media?.mainMedia?.image?.url ? (
                <Image
                  src={p.media.mainMedia.image.url}
                  alt=""
                  width={64}
                  height={64}
                  className="size-16 flex-none rounded object-cover"
                />
              ) : null}
              <div>
                <p className="font-medium text-cf-espresso">{p.name}</p>
                {p.priceData?.formatted?.price ? (
                  <p className="mt-1 text-sm text-cf-muted">
                    {p.priceData.formatted.price}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PagesSection({ pages }: { pages: ReadonlyArray<SearchPageEntry> }) {
  if (pages.length === 0) return null;
  return (
    <section aria-labelledby="search-pages-heading" data-slot="search-pages">
      <h2
        id="search-pages-heading"
        className="font-playfair text-xl font-semibold text-cf-espresso"
      >
        Pages
      </h2>
      <ul className="mt-4 space-y-3">
        {pages.map((p) => (
          <li
            key={p.slug}
            data-slot="page-card"
            className="rounded-md border border-cf-divider bg-white/60 dark:bg-cf-cream dark:border-cf-ink/30 p-4"
          >
            <Link
              href={p.slug}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
            >
              <p className="font-medium text-cf-espresso">{p.title}</p>
              <p className="mt-1 text-sm text-cf-muted line-clamp-2">
                {p.description}
              </p>
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
            className="rounded-md border border-cf-divider bg-white/60 dark:bg-cf-cream dark:border-cf-ink/30 p-4"
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
    <section className="mt-10 max-w-2xl space-y-6" data-slot="search-no-results">
      <EmptySearchIllustration className="mx-auto" />
      <p className="text-center text-cf-ink/80">
        We couldn&rsquo;t find products, pages, or articles matching{" "}
        <span className="font-medium text-cf-espresso">&ldquo;{q}&rdquo;</span>.
      </p>
      <SearchSuggestions />
    </section>
  );
}

function NoResultsForType({ q, type }: { q: string; type: SearchType }) {
  return (
    <section
      className="mt-10 max-w-2xl space-y-4"
      data-slot="search-no-results-for-type"
    >
      <p className="text-cf-ink/80">
        No {type === "all" ? "" : `${type} `}results for{" "}
        <span className="font-medium text-cf-espresso">&ldquo;{q}&rdquo;</span>.{" "}
        <Link
          href={`/search?q=${encodeURIComponent(q)}`}
          className="text-cf-cta hover:underline"
        >
          Try All
        </Link>
        .
      </p>
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
              className="inline-flex items-center rounded-full border border-cf-divider bg-white/60 dark:bg-cf-cream dark:border-cf-ink/30 px-3 py-1 text-sm text-cf-espresso hover:border-cf-cta hover:text-cf-cta"
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
