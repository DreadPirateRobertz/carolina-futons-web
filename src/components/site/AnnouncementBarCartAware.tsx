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
export const ROTATION_MESSAGES = [
  STATIC_PROMPT,
  "10-year warranty on all hardwood futon frames",
  "Family-owned since 1991 · Hendersonville, NC",
  "Free fabric swatches — find your perfect match",
  "Assembly included with every delivery",
] as const;

export const ROTATION_INTERVAL_MS = 5_000;

export function announcementMessage(subtotalCents: number): string {
  if (subtotalCents <= 0) return STATIC_PROMPT;
  if (subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS) return QUALIFIED;
  const remaining = FREE_DELIVERY_THRESHOLD_CENTS - subtotalCents;
  return `You're ${formatCents(remaining)} away from free white-glove delivery`;
}

export function AnnouncementBarCartAware() {
  const { subtotalCents } = useCart();
  const [index, setIndex] = useState(0);

  // Rotate through ROTATION_MESSAGES when the cart is empty.
  // Clears the interval immediately when the cart has items so the
  // cart-aware copy takes over without waiting for the next tick.
  useEffect(() => {
    if (subtotalCents > 0) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % ROTATION_MESSAGES.length),
      ROTATION_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [subtotalCents]);

  const message =
    subtotalCents > 0
      ? announcementMessage(subtotalCents)
      : ROTATION_MESSAGES[index];

  return <AnnouncementBar message={message} />;
}
