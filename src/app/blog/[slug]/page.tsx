import type { Metadata } from "next";
import Image from "next/image";
import { CfLink } from "@/components/ui/cf-link";
import { notFound } from "next/navigation";

import {
  getPostBySlug,
  listAllPostSlugs,
  type BlogPost,
} from "@/lib/wix/blog";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildArticleSchema, resolveSiteUrl } from "@/lib/seo/json-ld";

// cf-l11g: dynamic blog post route. ISR-compatible — generateStaticParams
// pre-renders the latest published posts at build time so they're indexable
// without a live Wix call on first paint, and `revalidate` re-fetches every
// 5 minutes so edits/new posts surface without a redeploy.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await listAllPostSlugs(100);
  return slugs.map((slug) => ({ slug }));
}

// NEXT_PUBLIC_SITE_URL is baked in at build time for ISR (revalidate=300).
// For fully-dynamic pages, call resolveSiteUrl() inside the render function.
const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

function postDescription(post: BlogPost): string {
  return (post.excerpt || post.contentText).slice(0, 160);
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post — Carolina Futons" };
  const description = postDescription(post);
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: `${post.title} — Carolina Futons`,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: canonicalUrl,
      ...(post.firstPublishedDate && {
        publishedTime: post.firstPublishedDate instanceof Date
          ? post.firstPublishedDate.toISOString()
          : String(post.firstPublishedDate),
      }),
      ...(post.heroImageUrl && { images: [{ url: post.heroImageUrl }] }),
    },
    twitter: {
      card: post.heroImageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      ...(post.heroImageUrl && { images: [post.heroImageUrl] }),
    },
  };
}

export default async function BlogPostPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const articleSchema = buildArticleSchema({
    title: post.title,
    description: postDescription(post),
    canonicalUrl: `${SITE_URL}/blog/${post.slug}`,
    siteUrl: SITE_URL,
    publishedDate: post.firstPublishedDate,
    heroImageUrl: post.heroImageUrl,
  });

  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd id="jsonld-article" schema={articleSchema} />
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <Header post={post} />
        {post.heroImageUrl ? (
          <Hero url={post.heroImageUrl} alt={post.title} />
        ) : null}
        <Body text={post.contentText} />
        <BackLink />
      </article>
    </main>
  );
}

function Header({ post }: { post: BlogPost }) {
  return (
    <header className="space-y-3" data-slot="blog-post-header">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
        Journal
      </p>
      <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
        {post.title}
      </h1>
      <Meta post={post} />
    </header>
  );
}

function Meta({ post }: { post: BlogPost }) {
  const parts: string[] = [];
  if (post.firstPublishedDate) {
    parts.push(
      post.firstPublishedDate.toLocaleDateString("en-US", {
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
  return <p className="text-sm text-cf-muted">{parts.join(" · ")}</p>;
}

function Hero({ url, alt }: { url: string; alt: string }) {
  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-cf-sand"
      data-slot="blog-post-hero"
    >
      <Image
        src={url}
        alt={alt}
        fill
        sizes="(min-width: 768px) 65ch, 100vw"
        className="object-cover"
        priority
      />
    </div>
  );
}

function Body({ text }: { text: string }) {
  if (!text) return null;
  // Phase-1 renderer: Wix returns either RICH_CONTENT (DraftJS) or contentText
  // (plain text). We render the plain-text variant for now — preserves
  // paragraph breaks and is XSS-safe by construction. A richContent renderer
  // is a follow-up bead once the editorial team decides on rich formatting.
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return (
    <div className="space-y-5" data-slot="blog-post-body">
      {paragraphs.map((p, i) => (
        <p key={i} className="leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  );
}

function BackLink() {
  return (
    <p>
      <CfLink href="/blog" className="text-sm">
        ← Back to the journal
      </CfLink>
    </p>
  );
}
