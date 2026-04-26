"use client";

import { useCart } from "@/components/cart/CartProvider";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { formatCents } from "@/lib/cart/cart-state";

// Cart-aware wrapper around <AnnouncementBar />. Reads the live cart
// subtotal and swaps the static "free white-glove over $1,500" copy for
// progress / qualified copy. Threshold mirrors the brand promise rendered
// elsewhere (footer, /shipping page, PDP copy).
//
// Three states:
//   subtotal === 0      → static prompt ("Free white-glove on orders over $X")
//   0 < subtotal < $1,500 → progress ("You're $Y away from free delivery")
//   subtotal ≥ $1,500   → qualified ("You qualify for free white-glove delivery!")

export const FREE_DELIVERY_THRESHOLD_CENTS = 150_000;

const STATIC_PROMPT = `Free white-glove delivery on orders over ${formatCents(
  FREE_DELIVERY_THRESHOLD_CENTS,
)}`;
const QUALIFIED = "You qualify for free white-glove delivery! 🎉";

export function announcementMessage(subtotalCents: number): string {
  if (subtotalCents <= 0) return STATIC_PROMPT;
  if (subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS) return QUALIFIED;
  const remaining = FREE_DELIVERY_THRESHOLD_CENTS - subtotalCents;
  return `You're ${formatCents(remaining)} away from free white-glove delivery`;
}

export function AnnouncementBarCartAware() {
  const { subtotalCents } = useCart();
  return <AnnouncementBar message={announcementMessage(subtotalCents)} />;
}
