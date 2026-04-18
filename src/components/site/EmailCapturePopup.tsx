"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "cf-email-popup-dismissed";
const DELAY_MS = 8_000;
const SCROLL_THRESHOLD = 0.5;

export function EmailCapturePopup() {
  const [visible, setVisible] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    function trigger() {
      if (triggered.current) return;
      triggered.current = true;
      setVisible(true);
    }

    const timer = setTimeout(trigger, DELAY_MS);

    function onScroll() {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= SCROLL_THRESHOLD) trigger();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = (new FormData(e.currentTarget)).get("email") as string;
    console.log("[EmailCapture] email captured:", email);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-capture-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={dismiss}
      />
      <div className="relative w-full max-w-sm rounded-lg bg-cf-navy p-8 text-cf-cream shadow-xl">
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-4 top-4 text-cf-cream/70 transition-colors hover:text-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream/50"
        >
          ✕
        </button>
        <h2
          id="email-capture-heading"
          className="font-heading text-2xl font-bold text-cf-cream"
        >
          Stay in the loop
        </h2>
        <p className="mt-2 text-sm text-cf-cream/80">
          New arrivals, sale alerts, and care tips — straight to your inbox.
        </p>
        <form
          onSubmit={handleSubmit}
          aria-label="Email signup form"
          className="mt-6 flex flex-col gap-3"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="your@email.com"
            aria-label="Email address"
            className="w-full rounded-md border border-cf-cream/30 bg-white/10 px-4 py-2 text-cf-cream placeholder:text-cf-cream/40 focus:outline-none focus:ring-2 focus:ring-cf-cream/50"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-cf-cta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign me up
          </button>
        </form>
      </div>
    </div>
  );
}
