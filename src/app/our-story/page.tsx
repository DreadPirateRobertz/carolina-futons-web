import { permanentRedirect } from "next/navigation";

// /our-story was a live-site URL that predates the cf-3qt migration.
// The content now lives at /about — permanent redirect so inbound links
// and any bookmarked URLs land on the right page.
export default function OurStoryPage() {
  permanentRedirect("/about");
}
