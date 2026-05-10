"use client";

// cfw-9vs: Header wishlist entry point + count badge.
//
// We fetch the count via Server Action on mount rather than from the
// server-rendered <Header> because the header is a client component
// (uses framer-motion + scroll listeners). A miss-on-load that flashes
// a "0" badge is undesirable, so the badge renders nothing until the
// first response arrives, then animates in only when count > 0. For
// signed-out visitors getWishlistCount() returns 0 silently — no auth
// round-trip on every page load.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { getWishlistCount } from "@/app/actions/wishlist";

export function HeaderWishlistLink() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWishlistCount()
      .then((n) => {
        if (!cancelled) setCount(typeof n === "number" ? n : 0);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showBadge = typeof count === "number" && count > 0;
  const badgeLabel = showBadge && count > 99 ? "99+" : String(count ?? 0);
  const ariaLabel = showBadge
    ? `Wishlist, ${count} ${count === 1 ? "item" : "items"}`
    : "Wishlist";

  return (
    <Link
      href="/wishlist"
      aria-label={ariaLabel}
      data-testid="header-wishlist-link"
      data-count={count ?? ""}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-cream transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream"
    >
      <Heart className="size-5" aria-hidden="true" />
      {showBadge ? (
        <span
          aria-hidden="true"
          data-testid="header-wishlist-badge"
          className="absolute top-1 right-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-cf-cta px-1 text-[10px] font-semibold leading-none text-white"
        >
          {badgeLabel}
        </span>
      ) : null}
    </Link>
  );
}
