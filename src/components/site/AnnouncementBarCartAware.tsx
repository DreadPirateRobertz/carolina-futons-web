"use client";

import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { formatCents } from "@/lib/cart/cart-state";
// cf-xqc0: constants live in a non-"use client" module so layout.tsx
// (Server Component) can also import them as fallbacks for the Wix
// CMS reads. Re-exported below so existing test imports (which point
// at this file) keep working.
import {
  AnnouncementCta,
  FREE_DELIVERY_THRESHOLD_CENTS,
  ROTATION_CTAS_DEFAULT,
  ROTATION_INTERVAL_MS,
  ROTATION_MESSAGES_DEFAULT,
} from "@/lib/cms/announcement-defaults";

export {
  FREE_DELIVERY_THRESHOLD_CENTS,
  ROTATION_INTERVAL_MS,
};
export type { AnnouncementCta };
// cf-xqc0: legacy export aliases. Old name → new name. Kept as named
// re-exports so existing call sites (tests + any server wrapper that
// already adopted the cfw-xyw shape) continue to resolve.
export const ROTATION_MESSAGES = ROTATION_MESSAGES_DEFAULT;
export const ROTATION_CTAS = ROTATION_CTAS_DEFAULT;

const STATIC_PROMPT = `Free white-glove delivery on orders over ${formatCents(
  FREE_DELIVERY_THRESHOLD_CENTS,
)}`;
const QUALIFIED = "You qualify for free white-glove delivery! 🎉";

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
