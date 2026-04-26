"use client";

// Site-wide header (cf-3qt.1 Phase 1 + cf-nav-scroll-shrink).
// Chrome spec from docs/migration/cf-3qt-phase1-prep.md:
//   Announcement bar 60px + main row 93px + sub-nav 60px = 213px total
// CMS wiring + mega-nav content land in Phase 3 (rennala).
//
// Scroll-shrink (cf-nav-scroll-shrink): once the page scrolls past 80px the
// header gains a shadow (both modes) and the main row compresses py-4 → py-2
// (non-reduced-motion only). Under prefers-reduced-motion the height stays
// static — only the shadow fades in, which is not a vestibular trigger.
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Search, User } from "lucide-react";
import { AnnouncementBarCartAware } from "@/components/site/AnnouncementBarCartAware";
import { CartTrigger } from "@/components/cart/CartTrigger";
import { HeaderMobileMenu } from "@/components/site/HeaderMobileMenu";
import { LivingSkyClient } from "@/components/illustrations/LivingSkyClient";

const PRIMARY_NAV = [
  { label: "Futons", href: "/shop/futon-frames" },
  { label: "Murphy Beds", href: "/shop/murphy-cabinet-beds" },
  { label: "Platform Beds", href: "/shop/platform-beds" },
  { label: "Mattresses", href: "/shop/mattresses" },
  { label: "Sale", href: "/shop/mattresses-sale" },
] as const;

const SUB_NAV = [
  { label: "Design a Room", href: "/design-a-room" },
  { label: "Guides", href: "/guides" },
  { label: "Reviews", href: "/reviews" },
  { label: "About", href: "/about" },
  { label: "Visit Us", href: "/visit" },
] as const;

const SCROLL_THRESHOLD_PX = 80;

export function Header() {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY >= SCROLL_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shadowClass = scrolled ? "shadow-md" : "";
  // Height shrink is motion — suppress under reduced-motion so the chrome
  // doesn't reflow under the user's eye. Shadow stays either way.
  const compressMainRow = scrolled && !prefersReducedMotion;
  const mainRowPaddingClass = compressMainRow ? "py-2" : "py-4";
  const mainRowTransitionClass = prefersReducedMotion
    ? ""
    : "transition-[padding] duration-200 ease-out";

  return (
    <header
      data-slot="site-header"
      data-scrolled={scrolled ? "true" : "false"}
      className={[
        "sticky top-0 z-40 h-cf-header w-full overflow-hidden border-b border-cf-divider bg-gradient-to-b from-cf-header-start to-cf-header-end text-cf-ink transition-shadow duration-200",
        shadowClass,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* LivingSky backdrop — time-of-day sky fills header width at desktop.
          SVG viewBox 1040×150 renders ≈208px tall at 1440px wide, which
          nearly fills the 213px header. On narrow viewports the gradient
          fallback shows below the SVG — the white veil blends both.
          aria-hidden: purely decorative, no AT value. */}
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-0 w-full">
        <LivingSkyClient />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-white/40" />

      <div className="relative z-20">
        <AnnouncementBarCartAware />

      <div
        data-slot="site-header-main"
        className={[
          "flex items-center border-b border-cf-divider/60",
          mainRowPaddingClass,
          mainRowTransitionClass,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Carolina Futons — home"
          >
            <Image
              src="/brand/cf-logo-square.png"
              alt=""
              width={36}
              height={36}
              priority
              className="size-9 rounded-sm"
            />
            <span className="font-heading text-2xl font-semibold tracking-tight text-cf-navy">
              Carolina Futons
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden flex-1 items-center justify-center gap-6 md:flex"
          >
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-cf-charcoal transition-colors hover:text-cf-cta focus-visible:outline-none focus-visible:text-cf-cta"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <HeaderMobileMenu />
            <Link
              href="/search"
              aria-label="Search"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-charcoal transition-colors hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="/account"
              aria-label="Account"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-charcoal transition-colors hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <User className="size-5" aria-hidden="true" />
            </Link>
            <CartTrigger />
          </div>
        </div>
      </div>

      <nav
        aria-label="Secondary"
        data-slot="site-header-sub"
        className="hidden h-cf-header-sub items-center md:flex"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          {SUB_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-medium uppercase tracking-wider text-cf-charcoal/80 transition-colors hover:text-cf-cta focus-visible:outline-none focus-visible:text-cf-cta"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      </div>{/* /z-20 content wrapper */}
    </header>
  );
}
