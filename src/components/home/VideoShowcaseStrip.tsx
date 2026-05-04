"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

import type { VideoEntry } from "@/lib/videos/catalog";

type Props = {
  videos: readonly VideoEntry[];
};

export function VideoShowcaseStrip({ videos }: Props) {
  const [active, setActive] = useState<VideoEntry | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!active) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <section
      data-slot="video-showcase-strip"
      aria-labelledby="video-showcase-heading"
      className="w-full bg-cf-espresso py-10 dark:bg-cf-sand sm:py-12"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="video-showcase-heading"
            className="font-heading text-xl font-semibold text-white sm:text-2xl"
          >
            See it in action
          </h2>
          <Link
            href="/videos"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Watch all →
          </Link>
        </div>

        {/* Mobile: horizontal scroll; desktop: 3-col grid */}
        <ul className="mt-6 flex gap-4 overflow-x-auto pb-3 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          {videos.map((video) => (
            <li key={video.id} className="w-[80vw] shrink-0 sm:w-auto">
              <button
                type="button"
                aria-label={`Play video: ${video.title}`}
                onClick={() => setActive(video)}
                className="group relative block w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cf-espresso"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-900">
                  {video.posterUrl ? (
                    <Image
                      src={video.posterUrl}
                      alt={video.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 33vw, 80vw"
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-zinc-800" />
                  )}
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors duration-150 group-hover:bg-black/50">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-150 group-hover:scale-110">
                      <Play
                        className="size-6 translate-x-0.5 text-cf-espresso dark:text-cf-sand"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-left">
                  <p className="text-sm font-semibold text-white">
                    {video.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-white/60">
                    {video.description}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Lightbox */}
      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Now playing: ${active.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setActive(null)}
              aria-label="Close video"
              className="absolute -top-10 right-0 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-cf-navy hover:bg-white dark:text-cf-sand"
            >
              Close ✕
            </button>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              {active.source === "youtube" ? (
                active.embedUrl ? (
                  <iframe
                    src={`${active.embedUrl}?autoplay=1`}
                    title={active.title}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/60 text-sm">
                    Video unavailable
                  </div>
                )
              ) : (
                <video
                  src={active.videoUrl}
                  poster={active.posterUrl}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full"
                >
                  <track kind="captions" />
                </video>
              )}
            </div>
            {active.productSlug ? (
              <div className="mt-4 text-center">
                <Link
                  href={`/products/${active.productSlug}`}
                  className="inline-block rounded-md bg-white px-5 py-2 text-sm font-medium text-cf-navy hover:bg-white/90 dark:text-cf-sand"
                >
                  Shop the {active.title}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
