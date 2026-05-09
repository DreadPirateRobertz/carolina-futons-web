"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";

import type { CustomerVideoReview } from "@/lib/discovery/customer-video-reviews";

// Customer Video Review Grid (CF-ou66.3 / cfw-9zp). Renders a 3-col desktop /
// 1-col mobile grid of customer-submitted video thumbnails below PdpReviews.
// Clicking a thumbnail opens a lightbox with an embedded player (YouTube
// iframe or native <video> based on the source discriminator). The section
// is suppressed entirely when no videos are filed against the product, so a
// PDP without customer videos renders nothing — no empty heading, no "no
// videos yet" copy that would clutter the page for the long tail.
//
// Lightbox semantics intentionally mirror PdpImageLightbox: ESC + backdrop
// click dismiss, reduced-motion suppresses the crossfade, focus moves to the
// close button on open. A separate component would be a duplication; an
// inline lightbox keeps the open-video state colocated with the click target.

const HEADING_ID = "pdp-customer-video-reviews-heading";

export interface CustomerVideoReviewGridProps {
  videos: readonly CustomerVideoReview[];
}

export function CustomerVideoReviewGrid({ videos }: CustomerVideoReviewGridProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = videos.find((v) => v.id === openId) ?? null;

  if (videos.length === 0) return null;

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mt-16 max-w-3xl border-t border-cf-divider pt-10"
      data-slot="pdp-customer-video-reviews"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id={HEADING_ID}
          className="font-heading text-lg font-semibold text-cf-espresso"
        >
          Customer videos
        </h2>
      </header>

      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {videos.map((video) => (
          <li key={video.id}>
            <CustomerVideoCard video={video} onOpen={() => setOpenId(video.id)} />
          </li>
        ))}
      </ul>

      <CustomerVideoLightbox
        video={open}
        onClose={() => setOpenId(null)}
      />
    </section>
  );
}

function CustomerVideoCard({
  video,
  onOpen,
}: {
  video: CustomerVideoReview;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Play ${video.author}'s video review`}
      data-testid="customer-video-card"
      data-video-id={video.id}
      className="group flex w-full flex-col overflow-hidden rounded-md border border-cf-charcoal/10 bg-white text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy dark:bg-cf-cream"
    >
      <div className="relative aspect-video w-full bg-cf-charcoal/5">
        <Image
          src={video.posterUrl}
          alt={`${video.author}'s video review thumbnail`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition group-hover:scale-[1.02]"
          unoptimized
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 translate-x-[1px] fill-cf-navy"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="font-medium text-cf-espresso">{video.author}</p>
        {typeof video.rating === "number" ? (
          <p
            className="text-sm text-cf-espresso/70"
            aria-label={`Rated ${video.rating} out of 5`}
          >
            <span aria-hidden="true">{"★".repeat(video.rating)}</span>
          </p>
        ) : null}
        <p className="text-sm text-cf-espresso/80">{video.caption}</p>
      </div>
    </button>
  );
}

function CustomerVideoLightbox({
  video,
  onClose,
}: {
  video: CustomerVideoReview | null;
  onClose: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const open = video !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  if (!open || !video) return null;

  const crossfadeProps = reduce
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.18, ease: "easeOut" as const },
      };

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-label={`${video.author}'s video review`}
      data-slot="customer-video-lightbox"
      data-reduced-motion={reduce ? "1" : "0"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
      {...crossfadeProps}
    >
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          ×
        </span>
      </button>
      <div
        className="aspect-video w-full max-w-4xl"
        // Stop the wrapper's clicks from reaching the backdrop dismiss handler.
        onClick={(e) => e.stopPropagation()}
      >
        {video.source === "youtube" && video.embedUrl ? (
          <iframe
            src={`${video.embedUrl}?autoplay=1&rel=0`}
            title={`${video.author}'s video review`}
            allow="accelerated-2d-canvas; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            data-testid="customer-video-iframe"
          />
        ) : (
          <video
            src={video.videoUrl}
            poster={video.posterUrl}
            controls
            autoPlay
            playsInline
            className="h-full w-full"
            data-testid="customer-video-player"
          >
            <track kind="captions" />
          </video>
        )}
      </div>
    </m.div>
  );
}
