"use client";

import { Sun, Moon } from "lucide-react";
import { STORAGE_KEY } from "@/lib/themeInitScript";

// CSS-driven icon visibility (via .dark on <html>) means the correct icon is
// always visible immediately — no JS state needed, no SSR flash.
export function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private browsing / quota) — DOM state still updated
    }
  }

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={toggle}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-cream transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream"
    >
      {/* Sun shown only in dark mode; Moon shown only in light mode */}
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
      <Moon className="size-5 dark:hidden" aria-hidden="true" />
    </button>
  );
}
