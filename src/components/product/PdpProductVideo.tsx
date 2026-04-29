"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import type { VideoEntry } from "@/lib/videos/catalog";

export type PdpProductVideoProps = {
  video: VideoEntry;
};

export function PdpProductVideo({ video }: PdpProductVideoProps) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    // For native video, trigger play after state update causes render
    if (video.source !== "youtube") {
      requestAnimationFrame(() => videoRef.current?.play());
    }
  };

  return (
    <section
      aria-label={`${video.title} product video`}
      data-slot="pdp-product-video"
      className="mt-8 max-w-2xl"
    >
      <div className="overflow-hidden rounded-lg border border-cf-charcoal/10 bg-white shadow-sm">
        {/* Thumbnail / inline player */}
        <div className="relative aspect-video w-full bg-cf-charcoal/5">
          {!playing ? (
            <button
              type="button"
              onClick={handlePlay}
              aria-label={`Play ${video.title} product video`}
              className="group absolute inset-0 flex items-center justify-center"
              data-testid="pdp-video-play-btn"
            >
              {video.posterUrl ? (
                <Image
                  src={video.posterUrl}
                  alt={`${video.title} product video thumbnail`}
                  fill
                  sizes="(max-width: 768px) 100vw, 672px"
                  className="object-cover transition group-hover:scale-[1.02]"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-cf-charcoal/50">
                  {video.title}
                </div>
              )}
              {/* Play button overlay */}
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7 translate-x-[2px] fill-cf-navy"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            </button>
          ) : video.source === "youtube" && video.embedUrl ? (
            <iframe
              src={`${video.embedUrl}?autoplay=1&rel=0`}
              title={`${video.title} product video`}
              allow="accelerated-2d-canvas; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              data-testid="pdp-video-iframe"
            />
          ) : (
            <video
              ref={videoRef}
              src={video.videoUrl}
              poster={video.posterUrl}
              controls
              muted
              playsInline
              className="h-full w-full"
              data-testid="pdp-video-player"
            >
              <track kind="captions" />
            </video>
          )}
        </div>

        {/* Meta + link */}
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold text-cf-espresso">{video.title}</p>
            <p className="mt-0.5 text-sm text-cf-charcoal/70">{video.description}</p>
          </div>
          <Link
            href="/videos"
            className="shrink-0 text-sm font-medium text-cf-navy hover:underline"
          >
            See all videos →
          </Link>
        </div>
      </div>
    </section>
  );
}
