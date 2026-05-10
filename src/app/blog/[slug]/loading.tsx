import { Skeleton } from "@/components/ui/skeleton";

// cfw-0io: rendered by Next during async resolution of /blog/<slug>.
// The page is ISR-cached (revalidate=300) so cache hits serve
// instantly — this fires on cold cache misses (every 5 min, plus on
// invalidation) while getPostBySlug round-trips Wix Blog SDK.
//
// Layout mirrors the article page: narrow column with eyebrow + h1 +
// meta row, then a 16/9 hero image placeholder, then body text blocks
// of varied widths to evoke real prose paragraphs.

const BODY_WIDTHS = [
  "w-full", "w-11/12", "w-full", "w-10/12",
  "w-full", "w-11/12", "w-9/12",
  "w-full", "w-11/12", "w-full", "w-8/12",
];

export default function BlogPostLoading() {
  return (
    <main
      data-testid="blog-post-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16"
    >
      <article className="mx-auto max-w-[65ch] space-y-8">
        <header className="space-y-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-10 w-full rounded sm:h-12" />
          <Skeleton className="h-10 w-3/4 rounded sm:h-12" />
          <Skeleton className="h-3 w-48 rounded" />
        </header>

        <Skeleton
          data-slot="blog-post-loading-hero"
          className="aspect-[16/9] w-full rounded-lg"
        />

        <div
          data-slot="blog-post-loading-body"
          className="space-y-3"
        >
          {BODY_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w} rounded`} />
          ))}
        </div>
      </article>
    </main>
  );
}
