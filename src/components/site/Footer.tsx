// Site-wide footer (cf-3qt.1 Phase 1).
// Chrome spec from docs/migration/cf-3qt-phase1-prep.md:
//   Main row 72px (column content) + bottom row 36px (copyright) = 108px total
// Phase 1 renders the compact shell. Newsletter + richer column content lands
// in Phase 3 (rennala) + Phase 5 (blaidd content seeding).
import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    heading: "Shop",
    links: [
      { label: "Futons", href: "/shop/futon-frames" },
      { label: "Murphy Beds", href: "/shop/murphy-cabinet-beds" },
      { label: "Mattresses", href: "/shop/mattresses" },
      { label: "Platform Beds", href: "/shop/platform-beds" },
    ],
  },
  {
    heading: "Help",
    links: [
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Warranty", href: "/warranty" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "About",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Visit Us", href: "/visit" },
      { label: "Press", href: "/press" },
      { label: "Blog", href: "/blog" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer
      data-slot="site-footer"
      className="mt-auto h-cf-footer border-t border-cf-divider bg-cf-footer-bg text-cf-cream"
    >
      <div
        data-slot="site-footer-main"
        className="flex h-cf-footer-main items-center"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-10 gap-y-2 px-4 sm:px-6 lg:px-8">
          {FOOTER_COLUMNS.map((col) => (
            <nav
              key={col.heading}
              aria-label={col.heading}
              className="flex items-center gap-4 text-sm"
            >
              <span className="font-heading text-cf-cream/70">
                {col.heading}:
              </span>
              {col.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-cf-cream/90 transition-colors hover:text-cf-cream focus-visible:outline-none focus-visible:underline underline-offset-4"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>

      <div
        data-slot="site-footer-bottom"
        className="flex h-cf-footer-bottom items-center border-t border-cf-cream/10 text-xs text-cf-cream/70"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Carolina Futons. Hendersonville, NC.</span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="hover:text-cf-cream focus-visible:outline-none focus-visible:underline underline-offset-4"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-cf-cream focus-visible:outline-none focus-visible:underline underline-offset-4"
            >
              Terms
            </Link>
            <Link
              href="/accessibility"
              className="hover:text-cf-cream focus-visible:outline-none focus-visible:underline underline-offset-4"
            >
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
