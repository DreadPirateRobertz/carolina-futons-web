import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3, Geist_Mono } from "next/font/google";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import "./globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AnnouncementBarCartAware } from "@/components/site/AnnouncementBarCartAware";
// cf-xqc0: literal fallbacks moved into a non-"use client" constants
// module so layout.tsx (a Server Component) can also read them as the
// `fallback` arg to getSiteContent. See cf-b3mf for the original cross-
// boundary regression and cf-xqc0 for the architectural fix.
import {
  type AnnouncementCta,
  ROTATION_CTAS_DEFAULT,
  ROTATION_MESSAGES_DEFAULT,
} from "@/lib/cms/announcement-defaults";
import { getSiteContent } from "@/lib/cms/site-content";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartAbandonmentTracker } from "@/components/cart/CartAbandonmentTracker";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartHydrator } from "@/components/cart/CartHydrator";
import { LenisProvider } from "@/components/motion/LenisProvider";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { PageTransition } from "@/components/motion/PageTransition";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildOrganizationSchema,
  resolveSiteUrl,
} from "@/lib/seo/json-ld";
import { resolveVerification } from "@/lib/seo/webmaster-verification";
import { RouteProgressBar } from "@/components/site/RouteProgressBar";
import { SaleLightbox } from "@/components/site/SaleLightbox";
import { BackToTop } from "@/components/site/BackToTop";
import { CompareBar } from "@/components/compare/CompareBar";
import { PwaInstallBanner } from "@/components/site/PwaInstallBanner";
import { TikTokPixel } from "@/components/analytics/TikTokPixel";
import { PinterestTag } from "@/components/analytics/PinterestTag";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { GA4Tag } from "@/components/analytics/GA4Tag";
import { ConsentMode } from "@/components/analytics/ConsentMode";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { cookies } from "next/headers";
import {
  CONSENT_COOKIE_NAME,
  parseConsentCookie,
} from "@/lib/consent/consent-state";
import { THEME_INIT_SCRIPT } from "@/lib/themeInitScript";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // metadataBase resolves relative URLs in metadata (canonical, alternates).
  // Absolute CDN URLs in og:image are unaffected but this prevents Next.js
  // warnings in dev and ensures any future relative paths resolve correctly.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://carolinafutons.com"),
  title: "Carolina Futons — American-made futons, Murphy beds, and mattresses",
  description:
    "Family-owned Hendersonville, NC retailer of American-made futons, Murphy cabinet beds, and platform beds since 1991.",
  openGraph: {
    siteName: "Carolina Futons",
    type: "website",
    locale: "en_US",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
  },
  verification: resolveVerification(),
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const consentChoice = parseConsentCookie(
    (await cookies()).get(CONSENT_COOKIE_NAME)?.value,
  );

  // cfw-o2q + cfw-25t: thread owner-editable footer copy from SiteContent.
  // Fallbacks match the Footer component's defaults so the rendered shell
  // is identical when the SiteContent collection is empty / Wix is down.
  // cfw-61b: 5 announcement.rotation.{i}.message + 2 rotation.3.cta-{label,
  // href} keys join the same Promise.all so the announcement copy + footer
  // copy share one cached Wix snapshot per render (unstable_cache layer in
  // site-content.ts).
  const [
    footerTagline,
    footerShowroomHours,
    footerCopyrightLine,
    rotationMessage0,
    rotationMessage1,
    rotationMessage2,
    rotationMessage3,
    rotationCta3Label,
    rotationCta3Href,
    rotationMessage4,
  ] = await Promise.all([
    getSiteContent("footer.tagline", "Quality futons since 1991"),
    // cfw-sbl: key matches the seed convention (hyphenated, lowercase) and
    // the existing seed-data.json row at "footer.showroom-hours.label".
    getSiteContent(
      "footer.showroom-hours.label",
      "Showroom hours: Sun–Tue, 10am–5pm",
    ),
    // cf-n7ni: collapsed footer.copyright.suffix → footer.copyright-line.
    // Owners now edit the FULL copyright line including year placeholder
    // ({year} is substituted at render). One CMS row covers the whole
    // string instead of forcing the prefix/suffix split.
    getSiteContent(
      "footer.copyright-line",
      "© {year} Carolina Futons. Hendersonville, NC.",
    ),
    // cf-xqc0: ROTATION_MESSAGES_DEFAULT / ROTATION_CTAS_DEFAULT are
    // value exports from a NON-"use client" module (announcement-
    // defaults.ts), so they're available to Server Components at SSR
    // — unlike the original cf-b3mf-era imports from
    // AnnouncementBarCartAware.tsx which is "use client" and would
    // resolve as undefined here. See cf-b3mf for the original blank-bar
    // outage that mandated this split.
    getSiteContent(
      "announcement.rotation.0.message",
      ROTATION_MESSAGES_DEFAULT[0],
    ),
    getSiteContent(
      "announcement.rotation.1.message",
      ROTATION_MESSAGES_DEFAULT[1],
    ),
    getSiteContent(
      "announcement.rotation.2.message",
      ROTATION_MESSAGES_DEFAULT[2],
    ),
    getSiteContent(
      "announcement.rotation.3.message",
      ROTATION_MESSAGES_DEFAULT[3],
    ),
    getSiteContent(
      "announcement.rotation.3.cta-label",
      ROTATION_CTAS_DEFAULT[3]?.ctaLabel ?? "",
    ),
    getSiteContent(
      "announcement.rotation.3.cta-href",
      ROTATION_CTAS_DEFAULT[3]?.ctaHref ?? "",
    ),
    getSiteContent(
      "announcement.rotation.4.message",
      ROTATION_MESSAGES_DEFAULT[4],
    ),
  ]);

  const rotationMessages: ReadonlyArray<string> = [
    rotationMessage0,
    rotationMessage1,
    rotationMessage2,
    rotationMessage3,
    rotationMessage4,
  ];
  // Only index 3 currently has a CTA pair in the seed contract. Empty
  // label OR href → no CTA renders (the AnnouncementBar treats undefined
  // as "message-only", and missing-href would otherwise emit a broken
  // <a href="">).
  const rotationCta3: AnnouncementCta | undefined =
    rotationCta3Label && rotationCta3Href
      ? { ctaLabel: rotationCta3Label, ctaHref: rotationCta3Href }
      : undefined;
  const rotationCtas: ReadonlyArray<AnnouncementCta | undefined> = [
    undefined,
    undefined,
    undefined,
    rotationCta3,
    undefined,
  ];
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfair.variable} ${sourceSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Theme init — runs synchronously before first paint to prevent flash.
            Reads localStorage 'cf-theme'; falls back to prefers-color-scheme.
            Content is a hardcoded literal with no user input. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Consent Mode v2 default — MUST emit before any pixel script.
            head + beforeInteractive ensures gtag('consent','default',...)
            is on the dataLayer before GA4/Meta/Pinterest/TikTok read it. */}
        <ConsentMode />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <JsonLd
          id="jsonld-org"
          schema={buildOrganizationSchema(siteUrl)}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <LenisProvider />
        <MotionProvider>
          <RouteProgressBar />
          <CartProvider>
            <CartHydrator />
            <CartAbandonmentTracker />
            <Header
              announcementBar={
                <AnnouncementBarCartAware
                  rotationMessages={rotationMessages}
                  rotationCtas={rotationCtas}
                />
              }
            />
            <main id="main" className="flex-1">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer
              tagline={footerTagline}
              showroomHoursLabel={footerShowroomHours}
              copyrightLine={footerCopyrightLine}
            />
            <CartDrawer />
            <BackToTop />
            <CompareBar />
            <PwaInstallBanner />
            <SaleLightbox />
          </CartProvider>
        </MotionProvider>
        <GA4Tag />
        <TikTokPixel />
        <PinterestTag />
        <MetaPixel />
        <ConsentBanner initialChoice={consentChoice} />
      </body>
    </html>
  );
}
