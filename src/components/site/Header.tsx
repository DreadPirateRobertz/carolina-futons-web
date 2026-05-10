"use client";

// Site-wide header (cf-3qt.1 Phase 1 + cf-nav-scroll-shrink).
// Chrome spec from docs/migration/cf-3qt-phase1-prep.md:
//   Announcement bar 44px + main row 93px + sub-nav 60px = 197px total
//   (cfw-3t9: trimmed announcement 60→44 per cfw-y2i §7 to reclaim home fold)
// CMS wiring + mega-nav content land in Phase 3 (rennala).
//
// Scroll-shrink (cf-nav-scroll-shrink): once the page scrolls past 80px the
// header gains a shadow (both modes) and the main row compresses py-4 → py-2
// (non-reduced-motion only). Under prefers-reduced-motion the height stays
// static — only the shadow fades in, which is not a vestibular trigger.
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Search, User } from "lucide-react";
import { AnnouncementBarCartAware } from "@/components/site/AnnouncementBarCartAware";
import { CartTrigger } from "@/components/cart/CartTrigger";
import { HeaderMobileMenu } from "@/components/site/HeaderMobileMenu";
import { HeaderWishlistLink } from "@/components/site/HeaderWishlistLink";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { MegaMenuItem } from "@/components/site/MegaMenu";

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

// cfw-61b: optional announcementBar slot. layout.tsx (server) fetches the
// owner-editable rotation copy via getSiteContent and passes a configured
// <AnnouncementBarCartAware rotationMessages={…} rotationCtas={…} /> in.
// Existing call sites that render <Header /> without a prop fall through
// to the default mount, which is the byte-identical pre-refactor render.
type HeaderProps = {
  announcementBar?: ReactNode;
};

export function Header({ announcementBar }: HeaderProps = {}) {
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
        // cf-1eb5: v9 full-header bear treatment. Removed `bg-white` so the
        // bears illustration shows edge-to-edge as a hero backdrop behind
        // the chrome (announce bar + nav + sub-nav). The medallion logo was
        // rejected by Stilgar — wordmark only, on the illustration, with a
        // warm v9-orange gradient veil for text contrast.
        "sticky top-0 z-40 w-full border-b border-cf-divider text-cf-cream transition-shadow duration-200",
        shadowClass,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Hero bear backdrop — fills the entire header behind every chrome
          element. Object-position center-top keeps the bear faces in frame
          across the announce-bar + main-row + sub-nav stack (~197px tall).
          Marked priority so the LCP candidate ships with first paint. */}
      <div
        aria-hidden="true"
        data-slot="header-bear-backdrop"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <Image
          src="/design/animals/bears.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_top]"
        />
        {/* v9 sunset overlay — coral/sun-glow tint warms the photo so it
            reads as illustration, not a stock photograph, and gives nav
            text a darker substrate at the bottom. */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#E8845C]/10 via-[#B8523A]/25 to-[#2A1810]/65" />
      </div>

      <div className="relative z-20">
        {announcementBar ?? <AnnouncementBarCartAware />}

        <div
          data-slot="site-header-main"
          className={[
            "flex items-center border-b border-white/10",
            mainRowPaddingClass,
            mainRowTransitionClass,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="mx-auto flex w-full max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              aria-label="Carolina Futons — home"
            >
              <span className="font-heading text-2xl font-semibold tracking-tight text-cf-cream drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                Carolina Futons
              </span>
            </Link>

            <nav
              aria-label="Primary"
              className="hidden flex-1 items-center justify-center gap-6 md:flex"
            >
              {PRIMARY_NAV.map((item) => (
                <MegaMenuItem key={item.href} label={item.label} href={item.href} />
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1">
              <HeaderMobileMenu />
              <ThemeToggle />
              <Link
                href="/search"
                aria-label="Search"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-cream transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream"
              >
                <Search className="size-5" aria-hidden="true" />
              </Link>
              <Link
                href="/account"
                aria-label="Account"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-cream transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream"
              >
                <User className="size-5" aria-hidden="true" />
              </Link>
              <HeaderWishlistLink />
              <CartTrigger />
              <Link
                href="/shop"
                className={[
                  // v9 orange CTA pill — coral border + warm fill on hover so
                  // the Browse action pops against the bear illustration.
                  "ml-2 hidden items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors md:inline-flex",
                  scrolled
                    ? "border-[#E8845C] bg-[#E8845C] text-white hover:bg-[#B8523A] hover:border-[#B8523A]"
                    : "border-cf-cream bg-transparent text-cf-cream hover:bg-[#E8845C] hover:border-[#E8845C] hover:text-white",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Browse <span aria-hidden="true">→</span>
              </Link>
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
                className="text-xs font-medium uppercase tracking-wider text-cf-cream/85 transition-colors hover:text-[#F5C97A] focus-visible:outline-none focus-visible:text-[#F5C97A]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
