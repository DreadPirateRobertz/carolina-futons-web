"use client";

// Share-to-social row at the bottom of the PDP. Each button is an anchor
// pointing at the respective network's public share endpoint (no SDK, no
// API keys) so crawlers + no-JS users still see a valid share link. The
// click handler intercepts and opens a sized popup window — the standard
// UX for share affordances on furniture/product pages.

import type { MouseEvent } from "react";

export type PdpShareButtonsProps = {
  productUrl: string;
  productName: string;
  imageUrl?: string;
};

const POPUP_FEATURES = "width=600,height=600,noopener,noreferrer";

// Query-string builder that emits %20 for spaces (encodeURIComponent
// semantics) rather than the application/x-www-form-urlencoded `+` that
// URLSearchParams produces — share endpoints accept both, but `%20` matches
// the conventional share-button URL shape and keeps the test contract
// straightforward.
function qs(entries: ReadonlyArray<readonly [string, string]>): string {
  return entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

function buildFacebookUrl(productUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?${qs([["u", productUrl]])}`;
}

function buildPinterestUrl(
  productUrl: string,
  productName: string,
  imageUrl: string | undefined,
): string {
  const entries: Array<readonly [string, string]> = [
    ["url", productUrl],
    ["description", productName],
  ];
  if (imageUrl) entries.push(["media", imageUrl]);
  return `https://pinterest.com/pin/create/button/?${qs(entries)}`;
}

function openPopup(href: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined") return;
    event.preventDefault();
    window.open(href, "_blank", POPUP_FEATURES);
  };
}

export function PdpShareButtons({
  productUrl,
  productName,
  imageUrl,
}: PdpShareButtonsProps) {
  const facebookUrl = buildFacebookUrl(productUrl);
  const pinterestUrl = buildPinterestUrl(productUrl, productName, imageUrl);

  return (
    <section
      aria-label="Share this product"
      className="mt-16 border-t border-cf-divider pt-4 flex flex-wrap items-center gap-3"
      data-slot="pdp-share-buttons"
    >
      <span className="text-sm font-medium text-cf-espresso/70">Share</span>
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={openPopup(facebookUrl)}
        className="inline-flex items-center gap-2 rounded-md border border-cf-divider bg-white px-3 py-2 text-sm font-medium text-cf-espresso transition hover:bg-cf-sand/40 dark:bg-cf-cream dark:hover:bg-cf-sand/20"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="currentColor"
        >
          <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12" />
        </svg>
        Share on Facebook
      </a>
      <a
        href={pinterestUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={openPopup(pinterestUrl)}
        className="inline-flex items-center gap-2 rounded-md border border-cf-divider bg-white px-3 py-2 text-sm font-medium text-cf-espresso transition hover:bg-cf-sand/40 dark:bg-cf-cream dark:hover:bg-cf-sand/20"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="currentColor"
        >
          <path d="M12 2a10 10 0 0 0-3.64 19.32c-.09-.78-.17-1.98.04-2.83.19-.77 1.21-4.89 1.21-4.89s-.31-.62-.31-1.54c0-1.44.84-2.52 1.88-2.52.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.86 3.49-.25 1.04.52 1.89 1.55 1.89 1.86 0 3.29-1.96 3.29-4.79 0-2.5-1.8-4.25-4.37-4.25-2.98 0-4.72 2.23-4.72 4.53 0 .9.34 1.86.77 2.38.08.1.1.19.07.29-.08.32-.26 1.04-.3 1.19-.05.19-.15.23-.35.14-1.3-.6-2.12-2.49-2.12-4.02 0-3.27 2.38-6.27 6.85-6.27 3.6 0 6.39 2.56 6.39 5.98 0 3.57-2.25 6.44-5.38 6.44-1.05 0-2.04-.55-2.37-1.2l-.65 2.46c-.23.91-.87 2.05-1.29 2.74A10 10 0 1 0 12 2" />
        </svg>
        Share on Pinterest
      </a>
    </section>
  );
}
