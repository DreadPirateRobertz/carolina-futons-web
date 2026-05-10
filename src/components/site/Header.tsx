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
        // cf-1eb5 r2: v9 full-header bear treatment per Stilgar feedback.
        // - Bears illustration shows edge-to-edge as a hero backdrop.
        // - Strong overlay (was /65 → ramped to /80 at top + bottom for
        //   nav legibility — Stilgar said cream wasn't popping).
        // - White text (not cream) with drop-shadow on every chrome label.
        // - Hero band with v9 copy "Sleep on it for fifteen years." on /
        //   only — exact wording from design-vision-cf-3qt.html mock-hero.
        // - Header is taller on home (hero scale) and slim on other routes.
        "sticky top-0 z-40 w-full border-b border-white/10 text-white transition-shadow duration-200",
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
        {/* v9 sunset overlay — strengthened r2 so the menu label text reads
            against any patch of the photograph (Stilgar feedback). Top
            band veils the announce + nav strip; bottom band veils the
            sub-nav so its links are legible regardless of which patch of
            bear sits behind them. */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2A1810]/80 via-[#B8523A]/35 to-[#2A1810]/80" />
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
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              aria-label="Carolina Futons — home"
            >
              <span className="font-heading text-2xl font-semibold tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Search className="size-5" aria-hidden="true" />
              </Link>
              <Link
                href="/account"
                aria-label="Account"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                    : "border-white bg-white/10 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] hover:bg-[#E8845C] hover:border-[#E8845C]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Browse <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* cf-1eb5 r3: home-only hero band with v9 design copy.
            Exact wording from /Users/hal/gt/cfutons/crew/melania/
              design-vision/DESIGN-VISION.html `.hero-mockup` block
              (the canonical v9 spec — supersedes the cf-3qt internal
               proposal doc r2 used).
            - h2: "Handcrafted Comfort,\nMountain Inspired." (line break
              between phrases, font-family Playfair Display 56px / 700,
              text-shadow 0 2px 12px rgba(0,0,0,0.3))
            - p:  "Premium futons and furniture from the Blue Ridge
              Mountains of North Carolina." (20px, sand-light)
            - cta: "Shop Collection →" on var(--sunset-coral) #4A7D94
            Gated to / so product / category pages keep a slim chrome and
            don't push their own hero below 400+ px of header. */}
        {isHome ? (
          <div
            data-slot="site-header-hero"
            data-testid="site-header-hero"
            className="mx-auto w-full max-w-7xl px-4 pt-12 pb-20 text-center sm:px-6 sm:pt-16 sm:pb-24 lg:px-8 lg:pt-24 lg:pb-32"
          >
            <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-[56px]">
              Handcrafted Comfort,
              <br />
              Mountain Inspired.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-white/95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] sm:text-lg lg:text-xl">
              Premium futons and furniture from the Blue Ridge Mountains of
              North Carolina.
            </p>
            <Link
              href="/shop/futon-frames"
              className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-[#4A7D94] px-10 py-4 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#3D6B80] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              Shop Collection <span aria-hidden="true">→</span>
            </Link>
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
                className="text-xs font-medium uppercase tracking-wider text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-colors hover:text-[#F5C97A] focus-visible:outline-none focus-visible:text-[#F5C97A]"
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
