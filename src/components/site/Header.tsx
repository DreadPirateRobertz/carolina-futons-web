// Site-wide header (cf-3qt.1 Phase 1).
// Chrome spec from docs/migration/cf-3qt-phase1-prep.md:
//   Announcement bar 60px + main row 93px + sub-nav 60px = 213px total
// CMS wiring + mega-nav content land in Phase 3 (rennala).
// Keep this server-rendered — no state, no effects.
import Link from "next/link";
import { Search, User } from "lucide-react";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { CartTrigger } from "@/components/cart/CartTrigger";

const PRIMARY_NAV = [
  { label: "Futons", href: "/futons" },
  { label: "Murphy Beds", href: "/murphy-beds" },
  { label: "Mattresses", href: "/mattresses" },
  { label: "Frames", href: "/frames" },
  { label: "Sale", href: "/sale" },
] as const;

const SUB_NAV = [
  { label: "Design a Room", href: "/design-a-room" },
  { label: "Guides", href: "/guides" },
  { label: "Reviews", href: "/reviews" },
  { label: "About", href: "/about" },
  { label: "Visit Us", href: "/visit" },
] as const;

export function Header() {
  return (
    <header
      data-slot="site-header"
      className="sticky top-0 z-40 h-cf-header w-full border-b border-cf-divider bg-cf-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cf-cream/80"
    >
      <AnnouncementBar />

      <div
        data-slot="site-header-main"
        className="flex h-cf-header-main items-center border-b border-cf-divider/60"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-heading text-2xl font-semibold tracking-tight text-cf-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            aria-label="Carolina Futons — home"
          >
            Carolina Futons
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
            <button
              type="button"
              aria-label="Search"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-charcoal transition-colors hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="size-5" aria-hidden="true" />
            </button>
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
    </header>
  );
}
