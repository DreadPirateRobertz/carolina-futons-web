"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "cf-theme";

export function ThemeToggle() {
  // null = not yet mounted (avoids hydration mismatch on <html> class)
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      suppressHydrationWarning
      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-charcoal transition-colors hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {dark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
