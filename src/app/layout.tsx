import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3, Geist_Mono } from "next/font/google";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import "./globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
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
import { BackToTop } from "@/components/site/BackToTop";
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
  // Pre-launch: keep noindex until canonical domain + redirects are wired up.
  robots: { index: false, follow: false },
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
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
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
            <Header />
            <main id="main" className="flex-1">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
            <CartDrawer />
            <BackToTop />
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
