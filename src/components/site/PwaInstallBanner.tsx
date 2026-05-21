"use client";

import { useEffect, useState } from "react";

import { logWarn } from "@/lib/observability/log";

// BeforeInstallPromptEvent is not in lib.dom — Chromium-only API. Declare the
// minimal shape we use so the rest of the file is strongly typed.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_STORAGE_KEY = "cf-pwa-install-dismissed-at";
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    // localStorage access can throw when storage is partitioned or disabled
    // (Lockdown Mode, ITP-partitioned 3rd-party contexts, embedded WebViews).
    // Treat as not-dismissed so the banner can still surface.
    return false;
  }
}

function markDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
  } catch (err) {
    // Storage blocked — banner will re-appear next session. Log so we can spot
    // a persistently-broken session in production rather than guessing from
    // support tickets.
    logWarn("PwaInstallBanner", "markDismissed: localStorage write failed", err);
  }
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // Safari iOS reports installed PWA via this non-standard `navigator.standalone`.
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return navStandalone === true;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (isDismissed()) return;

    const onBeforeInstallPrompt = (e: Event) => {
      // Suppress Chrome's automatic mini-infobar so we control the surface.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "dismissed") {
      // Treat a declined install the same as a banner-dismiss to avoid nagging.
      markDismissed();
    }
  };

  const handleDismiss = () => {
    markDismissed();
    setDeferredPrompt(null);
  };

  if (!deferredPrompt) return null;

  return (
    <div
      data-slot="pwa-install-banner"
      role="region"
      aria-label="Install Carolina Futons app"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-t-lg border border-cf-divider bg-cf-cream px-4 py-3 shadow-lg sm:bottom-4 sm:rounded-lg"
    >
      <div className="flex-1 text-sm">
        <p className="font-medium text-cf-ink">Install Carolina Futons</p>
        <p className="text-cf-muted">
          Add the app to your home screen for faster shopping.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md px-3 py-1.5 text-sm text-cf-muted hover:text-cf-ink"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-md bg-cf-cta px-3 py-1.5 text-sm font-medium text-white hover:bg-cf-cta/90"
        >
          Install
        </button>
      </div>
    </div>
  );
}
