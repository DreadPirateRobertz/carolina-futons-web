"use client";

// Announcement bar — Wix CMS-driven (melania §5 Q3).
// Phase 1: static stub shape matches future Wix `Announcements` collection row:
//   { message: string, ctaLabel?: string, ctaHref?: string }
// Phase 3 (rennala) will swap the inline props for a server-side fetch.
// cf-t31z: when no `message` prop is given, copy is cart-driven:
//   empty cart → default promo text
//   cart below threshold → "You're $X away from free delivery"
//   cart at/above threshold → "You qualify for free delivery!"

import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/cart/cart-state";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping/thresholds";

type AnnouncementBarProps = {
  message?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function AnnouncementBar({
  message,
  ctaLabel,
  ctaHref,
}: AnnouncementBarProps) {
  const { subtotalCents, itemCount } = useCart();

  let displayMessage: string;
  if (message !== undefined) {
    displayMessage = message;
  } else {
    const gap = FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents;
    if (itemCount > 0 && gap <= 0) {
      displayMessage = "You qualify for free delivery!";
    } else if (itemCount > 0) {
      displayMessage = `You're ${formatCents(gap)} away from free delivery`;
    } else {
      displayMessage = "Free white-glove delivery on orders over $1,500";
    }
  }

  return (
    <div
      data-slot="announcement-bar"
      role="region"
      aria-label="Site announcement"
      className="flex h-[60px] items-center justify-center bg-cf-navy px-4 text-center text-sm font-medium text-cf-cream"
    >
      <p className="inline-flex items-center gap-2">
        <span>{displayMessage}</span>
        {ctaLabel && ctaHref ? (
          <a
            href={ctaHref}
            className="underline underline-offset-4 decoration-cf-cream/60 hover:decoration-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream rounded-sm"
          >
            {ctaLabel}
          </a>
        ) : null}
      </p>
    </div>
  );
}
