import type { Metadata } from "next";
import Link from "next/link";

import { listPosts, type BlogPostSummary } from "@/lib/wix/blog";

export const metadata: Metadata = {
  title: "Journal — Carolina Futons",
  description:
    "Notes from a family-owned futon shop in Hendersonville, North Carolina — buying guides, room ideas, and stories from the showroom floor.",
};

// cf-l11g: render the latest 12 posts from Wix Blog. When the SDK fails or no
// posts exist yet the page falls back to the original "Coming soon" copy so
// SEO crawlers + visitors still see editorial content rather than a blank
// state. Server component — no client JS for the index.
export const revalidate = 300; // 5 min cache; new posts surface within one window.

const POSTS_PER_PAGE = 12;

export default async function BlogPage() {
  const posts = await listPosts(POSTS_PER_PAGE);

  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Journal
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Notes from the Showroom
          </h1>
          <p className="text-sm text-cf-muted">
            Carolina Futons has sold solid-wood futon frames and natural
            mattresses out of Hendersonville, North Carolina since 1991. The
            journal is where we share what we&rsquo;ve learned.
          </p>
        </header>

        {posts.length > 0 ? <PostList posts={posts} /> : <ComingSoon />}
      </article>
    </main>
  );
}

function PostList({ posts }: { posts: ReadonlyArray<BlogPostSummary> }) {
  return (
    <ul className="space-y-10" data-slot="blog-post-list">
      {posts.map((post) => (
        <li key={post._id} className="space-y-2">
          <Link
            href={`/blog/${post.slug}`}
            className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
          >
            <h2 className="font-playfair text-2xl font-semibold tracking-tight text-cf-espresso group-hover:text-cf-cta">
              {post.title}
            </h2>
            <PostMeta post={post} />
            {post.excerpt ? (
              <p className="mt-2 leading-relaxed text-cf-ink/80">
                {post.excerpt}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PostMeta({ post }: { post: BlogPostSummary }) {
  const date = post.firstPublishedDate;
  const parts: string[] = [];
  if (date) {
    parts.push(
      date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }
  if (post.minutesToRead && post.minutesToRead > 0) {
    parts.push(`${post.minutesToRead} min read`);
  }
  if (parts.length === 0) return null;
  return <p className="text-xs text-cf-muted">{parts.join(" · ")}</p>;
}

function ComingSoon() {
  return (
    <section className="space-y-4" data-slot="blog-coming-soon">
      <h2 className="font-playfair text-2xl font-semibold tracking-tight">
        Coming soon
      </h2>
      <p className="leading-relaxed">
        We&rsquo;re sketching the first round of posts now: buying guides for
        full vs. queen futons, the difference between cotton and wool-wrapped
        innerspring mattresses, and how our 15-year frame warranty actually
        works in practice. Subscribe below if you&rsquo;d like an email when
        the first one goes up — no promotions, no algorithmic feed, just the
        post.
      </p>
      <p className="leading-relaxed">
        Drop us a line at{" "}
        <a
          href="mailto:carolinafutons@gmail.com"
          className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
        >
          carolinafutons@gmail.com
        </a>{" "}
        and we&rsquo;ll add you to the journal list.
      </p>
    </section>
  );
}
