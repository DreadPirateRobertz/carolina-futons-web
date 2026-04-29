"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cf_app_banner_dismissed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const ts = Number(stored);
    if (!ts) return false;
    return Date.now() - ts < SEVEN_DAYS_MS;
  } catch {
    // storage unavailable — silently ignore
    return false;
  }
}

export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!isDismissed()) setVisible(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // storage unavailable — silently ignore
    }
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="App download promotion"
      className="md:hidden flex items-center gap-3 px-4 py-3 text-cf-espresso"
      style={{ backgroundColor: "#E8D5B7" }}
    >
      <p className="flex-1 text-sm font-medium">
        Shop Carolina Futons on the go — download our app.
      </p>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href="#"
          aria-label="Download on the App Store"
          className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso rounded"
        >
          App Store
        </a>
        <a
          href="#"
          aria-label="Get it on Google Play Store"
          className="rounded px-2 py-1 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso"
          style={{ backgroundColor: "#E8845C" }}
        >
          Play Store
        </a>
      </div>

      <button
        type="button"
        aria-label="Dismiss app download banner"
        onClick={dismiss}
        className="ml-1 shrink-0 rounded p-1 text-cf-espresso/60 hover:bg-black/10 hover:text-cf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3.646 3.646a.5.5 0 0 1 .708 0L8 7.293l3.646-3.647a.5.5 0 0 1 .708.708L8.707 8l3.647 3.646a.5.5 0 0 1-.708.708L8 8.707l-3.646 3.647a.5.5 0 0 1-.708-.708L7.293 8 3.646 4.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
    </div>
  );
}
