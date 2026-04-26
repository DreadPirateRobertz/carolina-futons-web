import { permanentRedirect } from "next/navigation";

// /our-story was a live-site URL that predates the cf-3qt migration.
// The content now lives at /about — Next.js permanentRedirect emits a 308
// so search engines and bookmarks transfer link equity to /about.
export default function OurStoryPage() {
  permanentRedirect("/about");
}
