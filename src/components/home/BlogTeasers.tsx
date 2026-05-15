import Image from "next/image";
import Link from "next/link";

import { listPosts } from "@/lib/wix/blog";

const MAX_EXCERPT = 120;

function truncate(text: string): string {
  if (text.length <= MAX_EXCERPT) return text;
  return text.slice(0, MAX_EXCERPT).trimEnd() + "…";
}

export async function BlogTeasers() {
  const posts = await listPosts(3);
  if (posts.length === 0) return null;

  return (
    <section
      data-slot="blog-teasers"
      aria-labelledby="blog-teasers-heading"
      className="border-t border-cf-divider bg-cf-cream"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="blog-teasers-heading"
            className="font-heading text-2xl font-semibold text-cf-navy sm:text-3xl"
          >
            From the blog
          </h2>
          <Link
            href="/blog"
            className="text-sm font-medium text-cf-navy/70 transition-colors hover:text-cf-navy"
          >
            All posts →
          </Link>
        </div>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post._id}>
              <Link
                href={`/blog/${post.slug}`}
                data-slot="blog-teaser-card"
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-cf-divider bg-white transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy focus-visible:ring-offset-2"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-cf-sand">
                  {post.heroImageUrl ? (
                    <Image
                      src={post.heroImageUrl}
                      alt={post.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span
                        aria-hidden="true"
                        className="font-heading text-4xl text-cf-charcoal/20"
                      >
                        CF
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="font-heading text-base font-semibold leading-snug text-cf-espresso group-hover:text-cf-navy">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="flex-1 text-sm leading-relaxed text-cf-charcoal/70">
                      {truncate(post.excerpt)}
                    </p>
                  )}
                  <span className="mt-1 text-xs font-medium text-cf-navy">
                    Read more →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
