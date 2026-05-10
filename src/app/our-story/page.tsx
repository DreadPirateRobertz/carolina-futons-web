import { permanentRedirect } from "next/navigation";

// /our-story was a live-site URL that predates the cf-3qt migration.
// The content now lives at /about — issue a 308 so caches/crawlers
// consolidate /our-story link equity into /about.
export default function OurStoryPage() {
  permanentRedirect("/about");
}
