"use client";

// cf-0i3p — Sale promo lightbox on the home page.
// Fires 3s after first home visit. Suppressed for 24h after dismiss via localStorage.
// Phase 1: hardcoded Spring Sale copy. Phase 3 (rennala) will swap for a Wix
// CMS Promotions collection fetch so Stilgar can update copy without a deploy.

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "cf-promo-dismissed";
const DELAY_MS = 3_000;
const SALE_END_DATE = new Date("2026-05-12T00:00:00");
const CTA_HREF = "/spring-sale";

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

// Simple Blue Ridge silhouette — same palette as MountainSkyline
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
      {/* Ridges */}
      <path d="M 0 90 Q 160 68 320 75 T 640 90 L 640 180 L 0 180 Z" fill="#3A1A10" opacity="0.7" />
      <path d="M 0 110 Q 160 92 320 98 T 640 110 L 640 180 L 0 180 Z" fill="#2A1208" opacity="0.85" />
      <path d="M 0 135 Q 160 118 320 124 T 640 135 L 640 180 L 0 180 Z" fill="#1A0C08" />
      {/* Sun disc */}
      <circle cx="320" cy="180" r="32" fill="#FAF0C0" opacity="0.95" />
    </svg>
  );
}

export function SaleLightbox() {
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);
  const { days, hours, mins, secs, expired } = useCountdown(SALE_END_DATE);
  const prefersReduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useFocusTrap(dialogRef, visible);

  useEffect(() => {
    const key = STORAGE_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      const dismissed = Number(stored);
      if (Date.now() - dismissed < 24 * 60 * 60 * 1000) return; // still within 24h
      localStorage.removeItem(key); // expired — allow re-show
    }
    if (expired) return; // sale over

    const id = setTimeout(() => {
      if (!triggered.current) {
        triggered.current = true;
        setVisible(true);
      }
    }, DELAY_MS);
    return () => clearTimeout(id);
  }, [expired]);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  if (!visible || expired) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="sale-lightbox-heading"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        onClick={dismiss}
      />

      {/* Panel */}
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

        {/* Dismiss */}
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

        {/* Illustration */}
        <SaleIllustration />

        {/* Body */}
        <div className="px-6 pb-6 pt-4 text-cf-cream">
          <p
            className="text-xs font-semibold uppercase tracking-widest text-cf-cream/60"
            aria-hidden="true"
          >
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

          {/* CTA */}
          <a
            href={CTA_HREF}
            onClick={dismiss}
            className="mt-5 block w-full rounded-xl bg-cf-cta py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Shop the sale →
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full text-center text-xs text-cf-cream/40 hover:text-cf-cream/70 focus-visible:outline-none"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
