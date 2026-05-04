"use client";

// cf-0i3p — Sale promo lightbox on the home page.
// Fires 3s after first home visit. Suppressed for 24h after dismiss via localStorage.
// Phase 1: hardcoded Spring Sale copy + promo code + email capture + featured products.
// Phase 3 (rennala) will swap for a Wix CMS Promotions collection fetch so copy can be updated without a deploy.

import { useCallback, useEffect, useRef, useState } from "react";

import { NewsletterSignup } from "@/components/site/NewsletterSignup";

const STORAGE_KEY = "cf-promo-dismissed";
const DELAY_MS = 3_000;
const SALE_END_DATE = new Date("2026-05-12T00:00:00");
const CTA_HREF = "/spring-sale";
const PROMO_CODE = "SPRING25";

const FEATURED_SALE_PRODUCTS = [
  { name: "Kingston Futon Frame", href: "/products/kingston-futon-frame", price: "$299", badge: "25% off" },
  { name: "Mesa Foam Mattress", href: "/products/mesa-foam-mattress", price: "$89", badge: "20% off" },
  { name: "Sedona Futon Frame", href: "/products/sedona-futon-frame", price: "$339", badge: "15% off" },
] as const;

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [active, ref]);
}

function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState(() => Math.max(0, target.getTime() - Date.now()));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining(Math.max(0, target.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target, remaining]);

  const totalSec = Math.floor(remaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return { days, hours, mins, secs, expired: remaining <= 0 };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for SSR/Node environments and legacy browsers lacking navigator.clipboard
  return new Promise<void>((resolve, reject) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    el.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (err) {
      document.body.removeChild(el);
      reject(err);
      return;
    }
    document.body.removeChild(el);
    // execCommand returns false when the browser refuses the copy (focus/policy)
    if (!ok) { reject(new Error("execCommand('copy') returned false")); return; }
    resolve();
  });
}

function SaleIllustration() {
  return (
    <svg
      viewBox="0 0 640 180"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id="sl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C85038" />
          <stop offset="55%" stopColor="#E07820" />
          <stop offset="100%" stopColor="#F8C040" />
        </linearGradient>
        <radialGradient id="sl-sun" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="#FAF0C0" stopOpacity="1" />
          <stop offset="40%" stopColor="#F8D080" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#F8C040" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="180" fill="url(#sl-sky)" />
      <ellipse cx="320" cy="180" rx="360" ry="140" fill="url(#sl-sun)" />
      <path d="M 0 90 Q 160 68 320 75 T 640 90 L 640 180 L 0 180 Z" fill="#3A1A10" opacity="0.7" />
      <path d="M 0 110 Q 160 92 320 98 T 640 110 L 640 180 L 0 180 Z" fill="#2A1208" opacity="0.85" />
      <path d="M 0 135 Q 160 118 320 124 T 640 135 L 640 180 L 0 180 Z" fill="#1A0C08" />
      <circle cx="320" cy="180" r="32" fill="#FAF0C0" opacity="0.95" />
    </svg>
  );
}

export function SaleLightbox() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { days, hours, mins, secs, expired } = useCountdown(SALE_END_DATE);
  const prefersReduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useFocusTrap(dialogRef, visible);

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); };
  }, []);

  useEffect(() => {
    // Skip in Playwright/automation contexts so PLP + form E2E tests
    // aren't blocked by the modal's scrim intercepting pointer events.
    // navigator.webdriver is true in automated browsers.
    if (typeof navigator !== "undefined" && navigator.webdriver) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const dismissed = Number(stored);
      if (Date.now() - dismissed < 24 * 60 * 60 * 1000) return;
      localStorage.removeItem(STORAGE_KEY);
    }
    if (expired) return;

    const id = setTimeout(() => {
      if (!triggered.current) {
        triggered.current = true;
        setVisible(true);
      }
    }, DELAY_MS);
    return () => clearTimeout(id);
  }, [expired]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch { /* storage blocked (private mode / quota) — suppression won't persist */ }
  }, []);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  function handleCopyPromoCode() {
    copyToClipboard(PROMO_CODE).then(
      () => {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        setCopied(true);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      },
      () => undefined,
    );
  }

  if (!visible || expired) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="sale-lightbox-heading"
    >
      <div
        data-testid="lightbox-backdrop"
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        onClick={dismiss}
      />

      <div
        ref={dialogRef}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-cf-navy shadow-2xl"
        style={{
          animation: prefersReduced ? "none" : "sl-slide-up 0.35s ease-out",
        }}
      >
        <style>{`
          @keyframes sl-slide-up {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <button
          type="button"
          aria-label="Close sale popup"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-cf-cream/70 transition-colors hover:bg-white/10 hover:text-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream/50"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M3.646 3.646a.5.5 0 0 1 .708 0L8 7.293l3.646-3.647a.5.5 0 0 1 .708.708L8.707 8l3.647 3.646a.5.5 0 0 1-.708.708L8 8.707l-3.646 3.647a.5.5 0 0 1-.708-.708L7.293 8 3.646 4.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>

        <SaleIllustration />

        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6 pt-4 text-cf-cream">
          <p className="text-xs font-semibold uppercase tracking-widest text-cf-cream/60" aria-hidden="true">
            Limited time
          </p>
          <h2
            id="sale-lightbox-heading"
            className="mt-1 font-heading text-3xl font-bold text-cf-cream"
          >
            Spring Sale
          </h2>
          <p className="mt-1 text-sm text-cf-cream/75">
            Up to 25% off select futon frames &amp; mattresses — handmade in NC.
          </p>

          {/* Promo code chip */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-white/10 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-cf-cream/50">Promo code</p>
              <p
                data-testid="promo-code"
                className="font-mono text-lg font-bold tracking-widest text-cf-cream"
              >
                {PROMO_CODE}
              </p>
            </div>
            <div aria-live="polite" aria-atomic="true" className="shrink-0">
              <button
                type="button"
                data-testid="copy-promo-code"
                onClick={handleCopyPromoCode}
                aria-label={copied ? "Promo code copied to clipboard" : "Copy promo code to clipboard"}
                className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold text-cf-cream transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream/50"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Countdown */}
          <div
            className="mt-4 flex gap-3"
            aria-label={`${days} days ${hours} hours ${mins} minutes ${secs} seconds remaining`}
            aria-live="off"
          >
            {[
              { value: pad(days), label: "Days" },
              { value: pad(hours), label: "Hrs" },
              { value: pad(mins), label: "Min" },
              { value: pad(secs), label: "Sec" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-1 flex-col items-center rounded-lg bg-white/10 py-2"
              >
                <span className="font-mono text-xl font-bold leading-none text-cf-cream">
                  {value}
                </span>
                <span className="mt-0.5 text-[10px] uppercase tracking-wider text-cf-cream/50">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Featured sale products — onClick={dismiss} counts as engagement → 24h suppression */}
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-widest text-cf-cream/50">Featured deals</p>
            <ul className="mt-1.5 flex flex-col gap-1" aria-label="Featured sale products">
              {FEATURED_SALE_PRODUCTS.map((product) => (
                <li key={product.href}>
                  <a
                    href={product.href}
                    onClick={dismiss}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream/50"
                  >
                    <span className="text-sm text-cf-cream">{product.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded bg-cf-cta/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {product.badge}
                      </span>
                      <span className="text-sm font-semibold text-cf-cream">{product.price}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <a
            href={CTA_HREF}
            onClick={dismiss}
            className="mt-5 block w-full rounded-xl bg-cf-cta py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Shop the sale →
          </a>

          {/* Email capture */}
          <div
            className="mt-4 rounded-xl bg-white/8 px-4 py-4"
            data-testid="email-capture"
          >
            <NewsletterSignup />
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full text-center text-xs text-cf-cream/40 hover:text-cf-cream/70 focus-visible:outline-none"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
