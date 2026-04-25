"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { HeroReveal } from "@/components/motion/HeroReveal";
import {
  filterVideosByCategory,
  getVideoCategoryOptions,
  type VideoCategory,
  type VideoEntry,
} from "@/lib/videos/catalog";

const CATEGORY_BADGE: Record<VideoCategory, string> = {
  overview: "Overview",
  futon: "Futon Frame",
  conversion: "Conversion Demo",
  assembly: "Assembly Guide",
};

type Filter = VideoCategory | "all";

export function VideoGallery({ videos }: { videos: readonly VideoEntry[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<VideoEntry | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const visible = useMemo(
    () => filterVideosByCategory(videos, filter),
    [videos, filter],
  );

  const options = useMemo(() => getVideoCategoryOptions(), []);

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
    <>
      <div role="tablist" aria-label="Video category filters" className="mt-6 flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = filter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(opt.id as Filter)}
              className={
                selected
                  ? "rounded-full bg-cf-navy px-4 py-1.5 text-sm font-medium text-white"
                  : "rounded-full border border-cf-charcoal/20 px-4 py-1.5 text-sm text-cf-charcoal hover:border-cf-navy/60"
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length === 0
          ? "No videos in this category."
          : `${visible.length} video${visible.length === 1 ? "" : "s"} shown.`}
      </p>

      {visible.length === 0 ? (
        <p className="mt-10 rounded-md bg-zinc-50 p-6 text-zinc-700">
          No videos in this category.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((video, i) => (
            <HeroReveal key={video.id} as="li" delay={i * 0.06}>
              <VideoCard video={video} onPlay={() => setActive(video)} />
            </HeroReveal>
          ))}
        </ul>
      )}

      {active ? (
        <VideoLightbox
          video={active}
          onClose={() => setActive(null)}
          closeRef={closeRef}
        />
      ) : null}
    </>
  );
}

function VideoCard({
  video,
  onPlay,
}: {
  video: VideoEntry;
  onPlay: () => void;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-cf-charcoal/10 bg-white shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Play ${video.title} video`}
        className="group relative block aspect-video w-full overflow-hidden bg-cf-charcoal/5"
      >
        {video.posterUrl ? (
          <Image
            src={video.posterUrl}
            alt={`${video.title} product demo video`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition group-hover:scale-[1.02]"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-cf-charcoal/50">
            {video.title}
          </div>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-md">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 translate-x-[1px] fill-cf-navy"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
        <span className="absolute left-3 top-3 rounded-full bg-cf-navy/90 px-2.5 py-0.5 text-xs font-medium text-white">
          {CATEGORY_BADGE[video.category]}
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-base font-semibold text-cf-espresso">
          {video.title}
        </h3>
        <p className="text-sm text-cf-charcoal/80">{video.description}</p>
        {video.productSlug ? (
          <Link
            href={`/products/${video.productSlug}`}
            className="mt-auto inline-block text-sm font-medium text-cf-navy hover:underline"
          >
            Shop the {video.title} →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function VideoLightbox({
  video,
  onClose,
  closeRef,
}: {
  video: VideoEntry;
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Now playing: ${video.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -top-10 right-0 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-cf-navy"
        >
          Close ✕
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          {video.source === "youtube" && video.embedUrl ? (
            <iframe
              src={`${video.embedUrl}?autoplay=1`}
              title={video.title}
              allow="accelerated-2d-canvas; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <video
              src={video.videoUrl}
              poster={video.posterUrl}
              controls
              autoPlay
              playsInline
              className="h-full w-full"
            >
              <track kind="captions" />
            </video>
          )}
        </div>
        {video.productSlug ? (
          <div className="mt-4 text-center">
            <Link
              href={`/products/${video.productSlug}`}
              className="inline-block rounded-md bg-cf-navy px-5 py-2 text-sm font-medium text-white hover:bg-cf-navy/90"
            >
              Shop the {video.title}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
