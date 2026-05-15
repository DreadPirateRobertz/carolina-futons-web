import type { Metadata } from "next";

type OpenGraphField = NonNullable<Metadata["openGraph"]>;
type TwitterField = NonNullable<Metadata["twitter"]>;

// Mirror an `openGraph` block into a Twitter card metadata field so
// non-OG-aware Twitter crawlers see the same title/description/images
// as Facebook/Slack/iMessage unfurls. Saves repeating the same fields
// twice in a page's `generateMetadata`/`metadata` export.
//
// Per cf-5rmn audit §P2 #3: layout-level `twitter: { card }` alone
// leaves the description to whatever Twitter pulls from the page body
// (often a navigation breadcrumb). Per-page `twitter.{title,description,
// images}` fixes that without each page hand-rolling the same fields.
//
// Pass `card: "summary"` when the page intentionally lacks a large image
// (e.g., text-only posts); default is `summary_large_image`.
export function twitterFromOpenGraph(
  og: OpenGraphField,
  card: "summary" | "summary_large_image" = "summary_large_image",
): TwitterField {
  const out: TwitterField = { card };
  if (og.title) out.title = og.title as TwitterField["title"];
  if (og.description) out.description = og.description;
  if (og.images) {
    const imgs = Array.isArray(og.images) ? og.images : [og.images];
    out.images = imgs as TwitterField["images"];
  }
  return out;
}
