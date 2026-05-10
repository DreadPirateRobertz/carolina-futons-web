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
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  // cf-1eb5 r2: v9 hero copy ("Sleep on it for fifteen years.") only on /,
  // not /shop/* /products/* /about /etc. Everywhere else the header stays a
  // slim chrome strip so product / category pages don't push content far
  // below the fold.
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY >= SCROLL_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shadowClass = scrolled ? "shadow-md" : "";
  // cf-h85f: once scrolled past the threshold the header collapses to a
  // slim chrome — bears + hero band fade out, wordmark + nav darken to read
  // on a solid white surface. Mobile is the priority case (Stilgar's bear
  // header was eating the fold); desktop gets the same shrink, but the
  // hero band sits at min-h-[80vh] so the desktop transition feels gentler
  // because the user has more distance to scroll before crossing the
  // threshold. Motion-respect: under prefers-reduced-motion we drop the
  // `transition-*` classes so the change is instant — the collapse still
  // happens, it just doesn't animate (vestibular-friendly).
  const compressMainRow = scrolled && !prefersReducedMotion;
  const mainRowPaddingClass = compressMainRow ? "py-2" : "py-4";
  const mainRowTransitionClass = prefersReducedMotion
    ? ""
    : "transition-[padding] duration-200 ease-out";
  // cf-h85f: bear-backdrop fade + hero-band collapse + wordmark recolor
  // happen on `scrolled` regardless of reduced-motion (vestibular concern
  // is animated movement; instant state change is fine). Drop the
  // `transition-*` class under reduced-motion so users see an instant
  // snap rather than a 300ms ease.
  const motionTransition = prefersReducedMotion
    ? ""
    : "transition-all duration-300 ease-out";

  return (
    <header
      data-slot="site-header"
      data-scrolled={scrolled ? "true" : "false"}
      className={[
        // cf-1eb5 + cf-h85f: full-header bear treatment at top → slim chrome
        // post-scroll. The transparent surface lets the bear backdrop show
        // through unscrolled; once `scrolled`, we swap to bg-white so the
        // collapsed chrome reads on a clean surface even after the bears
        // fade out.
        "sticky top-0 z-40 w-full border-b transition-colors duration-300",
        scrolled
          ? "border-cf-divider bg-white text-cf-espresso"
          : "border-white/10 text-white",
        prefersReducedMotion ? "" : "transition-shadow duration-200",
        shadowClass,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Hero bear backdrop — fills the entire header behind every chrome
          element. Object-position center-top keeps the bear faces in frame
          across announce + nav + (home-only) hero band + sub-nav stack.
          Marked priority so the LCP candidate ships with first paint. */}
      <div
        aria-hidden="true"
        data-slot="header-bear-backdrop"
        className={[
          // cf-h85f: fade the bear backdrop out when the user scrolls past
          // the threshold. opacity-0 keeps the DOM stable (regression-pin
          // tests still find the slot), but hides the photo so the slim
          // chrome reads on the white surface above.
          "pointer-events-none absolute inset-0 overflow-hidden",
          motionTransition,
          scrolled ? "opacity-0" : "opacity-100",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Image
          src="/design/animals/bears.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_40%]"
        />
        {/* cf-1eb5 r5: copy moves to BOTTOM of hero (flex-col justify-end),
            so the top 65% is unobstructed bears. Drop the horizontal
            left→right wash from r4 (it was covering bear #2 in the center)
            and replace with a single bottom-up gradient: dark in the
            bottom ~200px under the text, fully transparent above so all
            three bears render at full saturation.
            Top strip kept thin so the announce/nav chrome reads. */}
        <div className="absolute inset-x-0 bottom-0 h-[280px] bg-gradient-to-t from-[#2A1810]/90 via-[#2A1810]/55 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#2A1810]/85 to-transparent" />
      </div>

      <div className="relative z-30">
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
              className={[
                "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                scrolled ? "focus-visible:ring-cf-cta" : "focus-visible:ring-white",
              ].join(" ")}
              aria-label="Carolina Futons — home"
            >
              {/* cf-h85f: wordmark shrinks + recolors when chrome collapses.
                  text-2xl → text-lg on scroll so the slim chrome stays
                  visually balanced with the smaller utility row icons.
                  Drop-shadow is for legibility on the bear photo only —
                  removed once the bg goes white. */}
              <span
                className={[
                  "font-heading font-semibold tracking-tight",
                  motionTransition,
                  scrolled
                    ? "text-lg text-cf-espresso"
                    : "text-2xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]",
                ].join(" ")}
              >
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Search className="size-5" aria-hidden="true" />
              </Link>
              <Link
                href="/account"
                aria-label="Account"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                    : "border-white bg-white/10 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] hover:bg-[#E8845C] hover:border-[#E8845C]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Browse <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* cf-1eb5 r5: home-only hero band per Stilgar feedback.
            - TALLER: lg:min-h-[80vh] so the band is genuinely hero-scale
              and the bears get vertical room (Stilgar: "expand the
              section").
            - TEXT AT BOTTOM: flex-col + justify-end places copy in the
              bottom-left quadrant. Top 65% is open sky for the bears so
              all three faces are visible.
            - ORANGE COPY: headline V3_PAL.coral #E8845C, subline #F0A882
              (sunGlow). v9 sunset palette per Stilgar.
            - V9 STYLE: Playfair Display 700, 56px @ lg, exact mockup
              copy from DESIGN-VISION.html `.hero-mockup`.
            Gated to / so product / category pages keep a slim chrome. */}
        {isHome ? (
          <div
            data-slot="site-header-hero"
            data-testid="site-header-hero"
            aria-hidden={scrolled ? "true" : undefined}
            className={[
              // cf-h85f: hero band collapses on scroll. We use max-h + opacity
              // so the transition is smooth, and the post-collapse layout
              // doesn't reserve any vertical space (max-h-0 + overflow-hidden
              // + padding zeroed). aria-hidden flips when collapsed so SR
              // users don't keep getting the headline read out from a hidden
              // surface.
              "mx-auto flex w-full max-w-7xl flex-col justify-end overflow-hidden",
              motionTransition,
              scrolled
                ? "max-h-0 px-4 py-0 opacity-0 sm:px-6 lg:px-8"
                : "px-4 pt-32 pb-12 min-h-[440px] sm:min-h-[560px] sm:px-6 sm:pt-40 sm:pb-14 lg:px-8 lg:min-h-[80vh] lg:pt-48 lg:pb-16",
            ].join(" ")}
          >
            <div className="max-w-xl text-left">
              <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-[#E8845C] drop-shadow-[0_3px_14px_rgba(0,0,0,0.65)] sm:text-5xl lg:text-[56px]">
                Handcrafted Comfort,
                <br />
                Mountain Inspired.
              </h1>
              <p className="mt-6 max-w-lg text-base text-[#F0A882] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] sm:text-lg lg:text-xl">
                Premium futons and furniture from the Blue Ridge Mountains of
                North Carolina.
              </p>
              <Link
                href="/shop/futon-frames"
                className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-[#E8845C] px-10 py-4 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#B8523A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Shop Collection <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        ) : null}

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
                className="text-xs font-medium uppercase tracking-wider text-cf-blue drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] transition-colors hover:text-[#F5C97A] focus-visible:outline-none focus-visible:text-[#F5C97A]"
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
