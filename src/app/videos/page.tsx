import type { Metadata } from "next";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { VideoGallery } from "@/components/videos/VideoGallery";
import { listVideos } from "@/lib/cms/videos";
import { getSiteContent } from "@/lib/cms/site-content";

const VIDEOS_COPY_FALLBACKS = {
  eyebrow: "Watch",
  heading: "Product Videos",
  intro:
    "Watch our futon frames, Murphy beds, and conversion mechanisms in action — short demos straight from the showroom plus full assembly walkthroughs from our manufacturers.",
};

export const metadata: Metadata = {
  title: "Product Videos — Carolina Futons",
  description:
    "Watch our futon frames, Murphy beds, and conversion mechanisms in action. Wix-hosted demos plus KD Frames assembly guides and Strata wall-hugger conversions.",
  openGraph: {
    title: "Product Videos — Carolina Futons",
    description:
      "Demos and assembly guides for our American-made futon frames, platform beds, and Murphy mechanisms.",
  },
};

export default async function VideosPage() {
  const [{ items: videos }, eyebrow, heading, intro] = await Promise.all([
    listVideos(),
    getSiteContent("videos.eyebrow", VIDEOS_COPY_FALLBACKS.eyebrow),
    getSiteContent("videos.heading", VIDEOS_COPY_FALLBACKS.heading),
    getSiteContent("videos.intro", VIDEOS_COPY_FALLBACKS.intro),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <HeroReveal>
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            {eyebrow}
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-cf-navy sm:text-5xl">
            {heading}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-cf-charcoal/80">
            {intro}
          </p>
        </header>
      </HeroReveal>

      <VideoGallery videos={videos} />
    </main>
  );
}
