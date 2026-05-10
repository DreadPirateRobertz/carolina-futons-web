// cf-xqc0: shared constants for the announcement bar.
//
// Single source of truth for both surfaces:
//   - layout.tsx (Server Component): uses these as the `fallback` argument
//     to getSiteContent() so the bar still renders when Wix is down or
//     the announcement.rotation.* keys are unprovisioned.
//   - AnnouncementBarCartAware.tsx ("use client"): uses these as the
//     prop default for rotationMessages / rotationCtas so callers that
//     omit those props (the current Header.tsx pattern) still get the
//     same copy.
//
// This file MUST NOT include "use client". The cf-b3mf P0 was caused by
// these constants living inside a "use client" module — Next.js does not
// expose value exports of client modules to Server Components at SSR,
// so the layout.tsx getSiteContent() calls fed `undefined` as the
// fallback, the helper's own `fallback = ""` default kicked in, and the
// bar rendered empty in production. Keeping this file framework-free
// (pure constants + types, no React, no hooks) means both surfaces
// can import without re-introducing the cross-boundary regression.

import { formatCents } from "@/lib/cart/cart-state";

export const FREE_DELIVERY_THRESHOLD_CENTS = 150_000;

export const ROTATION_INTERVAL_MS = 5_000;

export type AnnouncementCta = { ctaLabel: string; ctaHref: string };

// Slot 0 derives the "$1,500" string from FREE_DELIVERY_THRESHOLD_CENTS
// at module load. If the threshold ever changes (Stilgar bumps it to
// $2,000 etc), this slot updates automatically — no parallel string to
// keep in sync. Keeping a function instead of inlining the call lets a
// future caller derive a localized variant if/when needed.
const STATIC_PROMPT = `Free white-glove delivery on orders over ${formatCents(
  FREE_DELIVERY_THRESHOLD_CENTS,
)}`;

// Default rotation copy. Brenda overrides via Wix CMS keys
// announcement.rotation.{0..4}.message; layout.tsx reads each via
// getSiteContent(key, ROTATION_MESSAGES_DEFAULT[i]) so a missing key
// falls back to the byte-identical-to-launch string.
export const ROTATION_MESSAGES_DEFAULT: ReadonlyArray<string> = [
  STATIC_PROMPT,
  "10-year warranty on all hardwood futon frames",
  "Family-owned since 1991 · Hendersonville, NC",
  "Free fabric swatches — find your perfect match",
  "Assembly included with every delivery",
] as const;

// Paired by index with ROTATION_MESSAGES_DEFAULT. undefined = message-
// only slot (no CTA renders). Slot 3 is the only seeded CTA today;
// Brenda can add more by populating announcement.rotation.{i}.cta-label
// + .cta-href on additional slots and threading them through layout.tsx.
export const ROTATION_CTAS_DEFAULT: ReadonlyArray<AnnouncementCta | undefined> = [
  undefined,
  undefined,
  undefined,
  { ctaLabel: "Order free swatches", ctaHref: "/swatch-request" },
  undefined,
];
