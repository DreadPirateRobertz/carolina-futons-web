"use client";

import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { formatCents } from "@/lib/cart/cart-state";

export const FREE_DELIVERY_THRESHOLD_CENTS = 150_000;

const STATIC_PROMPT = `Free white-glove delivery on orders over ${formatCents(
  FREE_DELIVERY_THRESHOLD_CENTS,
)}`;
const QUALIFIED = "You qualify for free white-glove delivery! 🎉";

// Shown when the cart is empty, cycling every ROTATION_INTERVAL_MS.
// cfw-xyw: still exported as the canonical default so existing tests +
// non-server callers don't break, AND so the SiteContent reader has a
// safe fallback when Wix is down or the announcement.rotation.* keys
// aren't provisioned. The component itself accepts a `rotationMessages`
// prop (cfw-66o pass-1) so a future server wrapper can thread Brenda's
// edits in without touching this file.
export const ROTATION_MESSAGES = [
  STATIC_PROMPT,
  "10-year warranty on all hardwood futon frames",
  "Family-owned since 1991 · Hendersonville, NC",
  "Free fabric swatches — find your perfect match",
  "Assembly included with every delivery",
] as const;

export type AnnouncementCta = { ctaLabel: string; ctaHref: string };

// CTA links paired with ROTATION_MESSAGES by index; undefined = message-only.
// cfw-xyw: exported (was previously module-private) so server-side
// rebuilders can derive a Brenda-overridable variant while preserving
// today's pairing for keys without an override.
export const ROTATION_CTAS: ReadonlyArray<AnnouncementCta | undefined> = [
  undefined,
  undefined,
  undefined,
  { ctaLabel: "Order free swatches", ctaHref: "/swatch-request" },
  undefined,
];

export const ROTATION_INTERVAL_MS = 5_000;

// cfw-xyw: prop-driven rotation copy. Defaults preserve today's hardcoded
// strings byte-identical so a `<AnnouncementBarCartAware />` render
// (no props — the current pattern at Header.tsx:93) is unchanged.
//
// Future: a server wrapper (cfw-66o follow-up) will read
// announcement.rotation.{i}.{message,cta-label,cta-href} via
// getSiteContent and pass the resolved arrays in via props. Headers stays
// "use client"; the wrapper does the server-only fetch above it.
type AnnouncementBarCartAwareProps = {
  rotationMessages?: ReadonlyArray<string>;
  rotationCtas?: ReadonlyArray<AnnouncementCta | undefined>;
};

export function announcementMessage(subtotalCents: number): string {
  if (subtotalCents <= 0) return STATIC_PROMPT;
  if (subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS) return QUALIFIED;
  const remaining = FREE_DELIVERY_THRESHOLD_CENTS - subtotalCents;
  return `You're ${formatCents(remaining)} away from free white-glove delivery`;
}

export function AnnouncementBarCartAware({
  rotationMessages = ROTATION_MESSAGES,
  rotationCtas = ROTATION_CTAS,
}: AnnouncementBarCartAwareProps = {}) {
  const { subtotalCents } = useCart();
  const [index, setIndex] = useState(0);
  const messagesLength = rotationMessages.length;

  // Rotate through rotationMessages when the cart is empty.
  // Clears the interval immediately when the cart has items so the
  // cart-aware copy takes over without waiting for the next tick.
  // setIndex(0) on cart-fill is intentional — bounded by subtotalCents
  // 0→positive transition, not a cascading-render hazard.
  // cfw-xyw: also resets on rotationMessages length change so a server-
  // supplied shorter list can't strand the index out of bounds.
  useEffect(() => {
    if (subtotalCents > 0 || messagesLength === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bounded reset on cart fill or empty rotation
      setIndex(0);
      return;
    }
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messagesLength),
      ROTATION_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [subtotalCents, messagesLength]);

  const isRotating = subtotalCents <= 0 && messagesLength > 0;
  const safeIndex = messagesLength > 0 ? index % messagesLength : 0;
  const message = isRotating
    ? rotationMessages[safeIndex]
    : announcementMessage(subtotalCents);
  const cta = isRotating ? rotationCtas[safeIndex] : undefined;

  return <AnnouncementBar message={message} {...cta} />;
}
