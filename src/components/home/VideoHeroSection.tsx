"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

const VID_SRC =
  "https://video.wixstatic.com/video/e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7f/1080p/mp4/file.mp4";
const VID_POSTER =
  "https://static.wixstatic.com/media/e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7ff000.jpg/v1/fill/w_1920,h_1080,q_85/file.jpg";

export function VideoHeroSection() {
  const reduceMotion = useReducedMotion() ?? true;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  return (
    <section
      data-slot="video-hero"
      aria-label="Carolina Futons welcome video"
      className="relative w-full overflow-hidden"
      style={{ height: "100svh", minHeight: 500, maxHeight: 900 }}
    >
      {/* Background: static poster (reduced-motion) or autoplay video */}
      {reduceMotion ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${VID_POSTER})` }}
        />
      ) : (
        <video
          ref={videoRef}
          src={VID_SRC}
          poster={VID_POSTER}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <track kind="captions" />
        </video>
      )}

      {/* Gradient scrim for text legibility */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10"
      />

      {/* Headline + CTA overlay */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
          Handmade in the Blue Ridge
        </p>
        <h1
          className="mt-3 font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
        >
          Furniture that earns its place.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
          Family-owned since 1991. Solid hardwood frames, American
          mattresses — no veneer, no shortcuts, no commission pressure.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/shop"
            className="inline-flex h-12 items-center rounded-md bg-white px-7 text-sm font-semibold text-cf-navy transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
          >
            Browse all furniture
          </Link>
          <Link
            href="/design-a-room"
            className="inline-flex h-12 items-center rounded-md border border-white/60 px-7 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
          >
            Design a room
          </Link>
        </div>
      </div>

      {/* Unmute/mute control — only shown when video is playing */}
      {!reduceMotion ? (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="absolute bottom-6 right-6 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {muted ? (
            <VolumeX className="size-5" aria-hidden="true" />
          ) : (
            <Volume2 className="size-5" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </section>
  );
}
