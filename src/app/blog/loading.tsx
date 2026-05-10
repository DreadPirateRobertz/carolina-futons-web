import { Skeleton } from "@/components/ui/skeleton";

// cfw-yl1: rendered by Next during async resolution of /blog. The page
// is ISR-cached (revalidate=300), so cache hits serve instantly — this
// fires on cold cache misses (every 5 min) plus on invalidation. The
// skeleton mirrors the journal layout: narrow column with eyebrow +
// h1 + subhead, then a stack of post-card placeholders (title + meta
// row + excerpt block).

const SKELETON_POST_COUNT = 6;

export default function BlogLoading() {
  return (
    <main
      data-testid="blog-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16"
    >
      <article className="mx-auto max-w-[65ch] space-y-8">
        <header className="space-y-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-10 w-3/4 rounded sm:h-12" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </header>

        <ul
          data-slot="blog-loading-list"
          className="space-y-10"
        >
          {Array.from({ length: SKELETON_POST_COUNT }).map((_, i) => (
            <li key={i} className="space-y-2">
              <Skeleton className="h-7 w-4/5 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="mt-2 h-4 w-full rounded" />
              <Skeleton className="h-4 w-11/12 rounded" />
            </li>
          ))}
        </ul>
      </article>
    </main>
  );
}
