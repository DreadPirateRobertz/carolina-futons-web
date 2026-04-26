"use client";

import { useTransition, useState } from "react";

import { setConsentMap } from "@/app/actions/consent";
import {
  type ConsentGrantMap,
  ALL_CONSENT_KEYS,
} from "@/lib/consent/consent-state";

// Human-readable labels for each gtag consent signal.
const SIGNAL_LABELS: Record<keyof ConsentGrantMap, { title: string; description: string }> = {
  analytics_storage: {
    title: "Analytics",
    description: "Allows us to measure how visitors use the site (Google Analytics 4).",
  },
  ad_storage: {
    title: "Advertising cookies",
    description: "Allows ad platforms to store identifiers for ad targeting and attribution.",
  },
  ad_user_data: {
    title: "Ad personalization data",
    description: "Allows sending user data to ad platforms to build personalized audiences.",
  },
  ad_personalization: {
    title: "Ad personalization",
    description: "Allows ad platforms to show ads personalized to your interests.",
  },
};

type Props = {
  initialMap: ConsentGrantMap;
};

export function ConsentPreferences({ initialMap }: Props) {
  const [map, setMap] = useState<ConsentGrantMap>(initialMap);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof ConsentGrantMap) {
    setSaved(false);
    setSaveError(false);
    setMap((prev) => ({
      ...prev,
      [key]: prev[key] === "granted" ? "denied" : "granted",
    }));
  }

  function save() {
    if (pending) return;
    startTransition(async () => {
      try {
        const result = await setConsentMap(map);
        if (!result.ok) { setSaveError(true); return; }
        setSaved(true);
        setSaveError(false);
        // Update live pixels on the current page without a reload.
        const w = window as unknown as {
          gtag?: (cmd: "consent", action: "update", map: Record<string, string>) => void;
        };
        w.gtag?.("consent", "update", map);
      } catch {
        setSaveError(true);
      }
    });
  }

  function grantAll() {
    setSaved(false);
    setSaveError(false);
    setMap({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  }

  function denyAll() {
    setSaved(false);
    setSaveError(false);
    setMap({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }

  return (
    <section
      aria-label="Cookie preferences"
      data-testid="consent-preferences"
      className="rounded-lg border border-cf-divider bg-cf-cream/40 p-6"
    >
      <h2 className="font-playfair text-2xl font-semibold tracking-tight text-cf-ink">
        Cookie preferences
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-cf-muted">
        Choose which types of cookies you allow. Your choice is saved and
        applied on every subsequent visit.
      </p>

      <ul className="mt-5 divide-y divide-cf-divider">
        {ALL_CONSENT_KEYS.map((key) => {
          const { title, description } = SIGNAL_LABELS[key];
          const granted = map[key] === "granted";
          const switchId = `consent-${key}`;
          const descId = `${switchId}-desc`;
          return (
            <li key={key} className="flex items-start gap-4 py-4">
              <div className="flex-1">
                {/* Plain text — htmlFor doesn't work for <button>, aria-label on the switch is the a11y hook */}
                <p className="font-medium text-cf-ink">{title}</p>
                <p id={descId} className="mt-0.5 text-sm text-cf-muted">{description}</p>
              </div>
              {/* Toggle switch */}
              <button
                id={switchId}
                role="switch"
                aria-checked={granted}
                aria-label={`${title}: ${granted ? "on" : "off"}`}
                aria-describedby={descId}
                type="button"
                onClick={() => toggle(key)}
                className={[
                  "relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
                  granted ? "bg-cf-cta" : "bg-cf-muted/40",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                    granted ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-9 items-center rounded-md bg-cf-cta px-5 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save preferences"}
        </button>
        <button
          type="button"
          onClick={grantAll}
          disabled={pending}
          className="inline-flex h-9 items-center rounded-md border border-cf-divider px-4 text-sm font-medium text-cf-ink transition-colors hover:bg-cf-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 disabled:opacity-60"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={denyAll}
          disabled={pending}
          className="inline-flex h-9 items-center rounded-md border border-cf-divider px-4 text-sm font-medium text-cf-ink transition-colors hover:bg-cf-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 disabled:opacity-60"
        >
          Reject all
        </button>
        {saved ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm font-medium text-green-700"
          >
            Preferences saved.
          </p>
        ) : null}
        {saveError ? (
          <p
            role="alert"
            aria-live="assertive"
            className="text-sm font-medium text-red-700"
          >
            Could not save preferences. Please try again.
          </p>
        ) : null}
      </div>
    </section>
  );
}
