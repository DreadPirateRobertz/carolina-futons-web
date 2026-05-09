"use client";

// Site-wide footer — Phase 3 rebrand + cf-j6ub Living Footer atmosphere.
// Retires the Phase 1 108px chrome spec in favor of a content-height
// footer that carries the brand: logo + tagline + real contact data
// (BUSINESS constant) + social presence. Marketing owns the tagline and
// the social URLs; the test suite pins exact copy so silent drift
// (e.g. someone updates a handle without a bead) surfaces as a failure.
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, Phone } from "lucide-react";

import { BUSINESS } from "@/lib/business/contact-info";
import { NewsletterSignup } from "@/components/site/NewsletterSignup";
import { LivingFooterBg } from "@/components/site/LivingFooterBg";
import { MascotFooterDivider } from "@/components/mascot/MascotFooterDivider";

type SocialLink = {
  name: string;
  href: string;
  // Inline SVG path — keeps brand icons out of the bundle-size conversation
  // and avoids coupling to any specific icon package's brand coverage.
  path: string;
};

// Known CF social handles. If a handle changes, update here — the test
// suite asserts the four brands are present but trusts the href value
// from this constant, so a rename only needs one edit.
export const FOOTER_SOCIALS: ReadonlyArray<SocialLink> = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/carolinafutons",
    path: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.77-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/carolinafutons",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.71 3.71 0 0 1-1.38-.9 3.71 3.71 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 5.5a4.34 4.34 0 1 0 0 8.68 4.34 4.34 0 0 0 0-8.68zm5.54-.2a1.01 1.01 0 1 0 0 2.03 1.01 1.01 0 0 0 0-2.03zM12 9.78a2.22 2.22 0 1 1 0 4.44 2.22 2.22 0 0 1 0-4.44z",
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@carolinafutons",
    path: "M16.5 3v2.52a4.5 4.5 0 0 0 4.5 4.5v2.52a7.02 7.02 0 0 1-4.5-1.62v6.08a5.5 5.5 0 1 1-5.5-5.5c.17 0 .33.01.5.03v2.6a2.92 2.92 0 1 0 2.42 2.88V3h2.58z",
  },
  {
    name: "Pinterest",
    href: "https://www.pinterest.com/carolinafutons",
    path: "M12 2a10 10 0 0 0-3.64 19.32c-.09-.76-.17-1.93.04-2.77.19-.75 1.22-4.78 1.22-4.78s-.31-.63-.31-1.55c0-1.45.84-2.54 1.89-2.54.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.87 3.48-.25 1.04.52 1.89 1.54 1.89 1.85 0 3.27-1.95 3.27-4.76 0-2.49-1.79-4.23-4.35-4.23-2.96 0-4.7 2.22-4.7 4.52 0 .9.34 1.86.77 2.38.08.1.1.19.07.29-.08.32-.26 1.04-.29 1.19-.05.19-.16.23-.37.14-1.36-.63-2.21-2.62-2.21-4.22 0-3.44 2.5-6.6 7.2-6.6 3.78 0 6.71 2.69 6.71 6.29 0 3.75-2.36 6.77-5.65 6.77-1.1 0-2.14-.57-2.49-1.25l-.68 2.59c-.25.94-.91 2.11-1.36 2.83A10 10 0 1 0 12 2z",
  },
];

type FooterColumn = {
  heading: string;
  links: ReadonlyArray<{ label: string; href: string }>;
};

const FOOTER_COLUMNS: ReadonlyArray<FooterColumn> = [
  {
    heading: "Shop",
    links: [
      { label: "Futon Frames", href: "/shop/futon-frames" },
      { label: "Murphy Cabinet Beds", href: "/shop/murphy-cabinet-beds" },
      { label: "Mattresses", href: "/shop/mattresses" },
      { label: "Platform Beds", href: "/shop/platform-beds" },
    ],
  },
  {
    heading: "Info",
    links: [
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Warranty", href: "/warranty" },
      { label: "Our Story", href: "/about" },
      { label: "Visit Us", href: "/visit" },
      { label: "Press", href: "/press" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

function SocialIcon({ path, label }: { path: string; label: string }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path d={path} />
    </svg>
  );
}

// cfw-o2q: SiteContent-driven copy. Both strings are optional so existing
// tests that render <Footer /> without props (the brand fallback contract)
// keep passing — they assert the default copy. layout.tsx threads the
// owner-editable values in via getSiteContent("footer.tagline", default)
// and getSiteContent("footer.showroomHours", default).
type FooterProps = {
  tagline?: string;
  showroomHoursLabel?: string;
};

const DEFAULT_TAGLINE = "Quality futon furniture since 1991";
const DEFAULT_SHOWROOM_HOURS = "Showroom hours: Sun–Tue, 10am–5pm";

export function Footer({
  tagline = DEFAULT_TAGLINE,
  showroomHoursLabel = DEFAULT_SHOWROOM_HOURS,
}: FooterProps = {}) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <footer
      data-slot="site-footer"
      className="relative mt-auto overflow-hidden bg-cf-footer-bg text-cf-cream"
    >
      {/* cf-j6ub: time-of-day animated atmosphere — absolute behind all content */}
      <LivingFooterBg />
      {/* Animated mascot divider — sky → ridges → sleeping bear, floats gently */}
      <motion.div
        aria-hidden="true"
        className="relative z-10 h-[200px] w-full"
        animate={prefersReducedMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <MascotFooterDivider className="h-full w-full" />
      </motion.div>
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="inline-flex w-fit items-center gap-3">
              <Image
                src="/brand/cf-logo-square.png"
                alt="Carolina Futons"
                width={56}
                height={56}
                className="rounded-md bg-cf-cream/5"
              />
              <span className="font-heading text-lg font-semibold text-cf-cream">
                Carolina Futons
              </span>
            </Link>
            <p className="max-w-xs text-sm text-cf-cream/80">{tagline}</p>
            <ul className="mt-2 flex items-center gap-3 text-cf-cream/80">
              {FOOTER_SOCIALS.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cf-cream/20 transition-colors hover:border-cf-cream hover:text-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-cf-footer-bg"
                  >
                    <SocialIcon path={social.path} label={social.name} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <nav
              key={col.heading}
              aria-label={col.heading}
              className="flex flex-col gap-3 text-sm"
            >
              <span className="font-heading text-cf-cream/70">
                {col.heading}
              </span>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-cf-cream/90 transition-colors hover:text-cf-cream focus-visible:outline-none focus-visible:underline underline-offset-4"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-3 text-sm">
            <span className="font-heading text-cf-cream/70">Contact</span>
            <address className="not-italic text-cf-cream/80 leading-relaxed">
              {BUSINESS.street}
              <br />
              {BUSINESS.city}, {BUSINESS.state} {BUSINESS.zip}
            </address>
            {/* cfw-eqk: tap-to-call/tap-to-email affordance — Phone/Mail icons
                next to the existing tel:/mailto: links. The icons are
                aria-hidden so the accessible link name stays the bare
                "Call/Text {phone}" / "{email}" copy that callers + tests
                rely on. */}
            <a
              href={BUSINESS.phoneHref}
              className="inline-flex items-center gap-2 text-cf-cream/90 transition-colors hover:text-cf-cream focus-visible:outline-none focus-visible:underline underline-offset-4"
            >
              <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>Call/Text {BUSINESS.phone}</span>
            </a>
            <a
              href={BUSINESS.emailHref}
              className="inline-flex items-center gap-2 text-cf-cream/90 transition-colors hover:text-cf-cream focus-visible:outline-none focus-visible:underline underline-offset-4"
            >
              <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{BUSINESS.email}</span>
            </a>
            <p className="mt-1 text-cf-cream/70">{showroomHoursLabel}</p>
          </div>
        </div>

        <div
          data-slot="site-footer-newsletter"
          className="mt-10 border-t border-cf-cream/10 pt-8"
        >
          <div className="mx-auto max-w-md">
            <NewsletterSignup />
          </div>
        </div>
      </div>

      <div
        data-slot="site-footer-bottom"
        className="relative z-10 border-t border-cf-cream/10 text-xs text-cf-cream/70"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
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
