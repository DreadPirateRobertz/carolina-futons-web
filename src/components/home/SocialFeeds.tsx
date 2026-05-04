"use client";

// useSyncExternalStore pattern (not useEffect+setState): the consent cookie is
// an external store. getServerSnapshot returns false so SSR and the first
// hydration frame are identical. The "focus" listener re-checks when the user
// returns from another tab where they may have accepted the banner.

import { useSyncExternalStore } from "react";

import {
  SOCIAL_EMBEDS,
  PLATFORM_NAMES,
  PLATFORM_COLORS,
  type SocialEmbed,
} from "@/lib/social-embeds";
import {
  CONSENT_COOKIE_NAME,
  parseConsentCookie,
} from "@/lib/consent/consent-state";

// ── Consent store ────────────────────────────────────────────────────────────

let cachedCookieRaw: string | undefined;
let cachedGranted = false;

function readConsentFromCookie(): boolean {
  if (typeof document === "undefined") return false;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`))
    ?.split("=")[1];
  const decoded = raw ? decodeURIComponent(raw) : undefined;
  if (decoded === cachedCookieRaw) return cachedGranted;
  cachedCookieRaw = decoded;
  cachedGranted = parseConsentCookie(decoded) === "granted";
  return cachedGranted;
}

function subscribeToConsent(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("focus", cb);
  return () => window.removeEventListener("focus", cb);
}

function getConsentSnapshot(): boolean {
  return readConsentFromCookie();
}

function getConsentServerSnapshot(): boolean {
  return false;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Placeholder({ embed }: { embed: SocialEmbed }) {
  const color = PLATFORM_COLORS[embed.platform];
  return (
    <div
      data-slot={`social-feed-placeholder-${embed.platform}`}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-cf-divider bg-cf-sand/40 text-center"
      style={{ height: embed.height, borderTopColor: color, borderTopWidth: 3 }}
    >
      <p className="text-sm text-cf-charcoal/70">
        Accept cookies to load the {PLATFORM_NAMES[embed.platform]} embed.
      </p>
      <a
        href={embed.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium underline underline-offset-2"
        style={{ color }}
      >
        Visit us on {PLATFORM_NAMES[embed.platform]} →
      </a>
    </div>
  );
}

function IframeEmbed({ embed }: { embed: SocialEmbed }) {
  return (
    <iframe
      data-slot={`social-feed-${embed.platform}`}
      src={embed.embedUrl}
      title={embed.label}
      height={embed.height}
      className="w-full rounded-lg border border-cf-divider"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

function PinterestCard({ embed }: { embed: SocialEmbed }) {
  const color = PLATFORM_COLORS.pinterest;
  return (
    <div
      data-slot={`social-feed-${embed.platform}`}
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-cf-divider bg-cf-cream"
      style={{ height: embed.height, borderTopColor: color, borderTopWidth: 3 }}
    >
      <svg
        viewBox="0 0 24 24"
        fill={color}
        aria-hidden="true"
        className="h-10 w-10"
      >
        <path d="M12 2a10 10 0 0 0-3.64 19.32c-.09-.76-.17-1.93.04-2.77.19-.75 1.22-4.78 1.22-4.78s-.31-.63-.31-1.55c0-1.45.84-2.54 1.89-2.54.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.87 3.48-.25 1.04.52 1.89 1.54 1.89 1.85 0 3.27-1.95 3.27-4.76 0-2.49-1.79-4.23-4.35-4.23-2.96 0-4.7 2.22-4.7 4.52 0 .9.34 1.86.77 2.38.08.1.1.19.07.29-.08.32-.26 1.04-.29 1.19-.05.19-.16.23-.37.14-1.36-.63-2.21-2.62-2.21-4.22 0-3.44 2.5-6.6 7.2-6.6 3.78 0 6.71 2.69 6.71 6.29 0 3.75-2.36 6.77-5.65 6.77-1.1 0-2.14-.57-2.49-1.25l-.68 2.59c-.25.94-.91 2.11-1.36 2.83A10 10 0 1 0 12 2z" />
      </svg>
      <div className="text-center">
        <p className="font-heading text-base font-semibold text-cf-navy">
          Our Pinterest board
        </p>
        <p className="mt-1 text-sm text-cf-charcoal/70">
          Futon frame ideas &amp; inspiration
        </p>
      </div>
      <a
        href={embed.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        Browse the board
      </a>
    </div>
  );
}

function EmbedCell({
  embed,
  consented,
}: {
  embed: SocialEmbed;
  consented: boolean;
}) {
  if (!consented) return <Placeholder embed={embed} />;
  if (embed.platform === "pinterest") return <PinterestCard embed={embed} />;
  return <IframeEmbed embed={embed} />;
}

// ── Main component ───────────────────────────────────────────────────────────

export function SocialFeeds() {
  const consented = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );

  return (
    <section
      data-slot="social-feeds"
      className="border-t border-cf-divider bg-cf-cream"
      aria-label="Social media feeds"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-semibold text-cf-navy sm:text-3xl">
          Follow along
        </h2>
        <p className="mt-2 text-sm text-cf-charcoal/70">
          See what&apos;s new at Carolina Futons
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SOCIAL_EMBEDS.map((embed) => (
            <div key={embed.platform} className="overflow-hidden">
              <EmbedCell embed={embed} consented={consented} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
