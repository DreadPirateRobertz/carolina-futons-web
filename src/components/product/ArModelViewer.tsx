"use client";

import { useEffect } from "react";

export interface ArModelViewerProps {
  glbUrl: string;
  productName?: string;
}

export function ArModelViewer({ glbUrl, productName }: ArModelViewerProps) {
  useEffect(() => {
    import("@google/model-viewer").catch(() => {});
  }, []);

  const altText = productName
    ? `3D model of ${productName} — view in augmented reality`
    : "3D product model — view in augmented reality";

  return (
    <section
      role="region"
      aria-label="View in your room"
      className="md:hidden mt-6"
    >
      <model-viewer
        src={glbUrl}
        ar=""
        ar-modes="webxr scene-viewer quick-look"
        camera-controls=""
        auto-rotate=""
        alt={altText}
        style={{ width: "100%", height: "320px", borderRadius: "8px" }}
      >
        <button
          slot="ar-button"
          type="button"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-cf-espresso px-5 py-2 text-sm font-semibold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso"
        >
          View in your room
        </button>
      </model-viewer>

      <section
        role="region"
        aria-label="Download our app"
        className="mt-4 rounded-lg border border-cf-espresso/10 bg-cf-sand/30 px-4 py-3 text-center"
      >
        <p className="text-sm font-medium text-cf-espresso">
          Download our app for the best AR experience
        </p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <a
            href="#"
            aria-label="Download on the App Store"
            className="rounded-full bg-cf-espresso px-4 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso"
          >
            App Store
          </a>
          <a
            href="#"
            aria-label="Get it on Google Play"
            className="rounded-full bg-cf-espresso px-4 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso"
          >
            Google Play
          </a>
        </div>
      </section>
    </section>
  );
}
