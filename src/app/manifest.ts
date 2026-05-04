import type { MetadataRoute } from "next";

// Web App Manifest — drives the beforeinstallprompt flow on Chromium and the
// "Add to Home Screen" sheet on Safari. Next.js auto-serves this from
// /manifest.webmanifest at build time.
//
// Icon-size note: only a 256px square logo is currently in public/brand/.
// Chrome's installability criteria require both a >=192px and a >=512px PNG
// icon (https://web.dev/articles/install-criteria). Until proper sizes are
// generated, Chromium may not fire `beforeinstallprompt` on every device — but
// the banner still renders correctly when it does. Safari "Add to Home Screen"
// works at 256px regardless. Icon generation tracked in cf-l6aj.13.1.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Carolina Futons",
    short_name: "CF",
    description:
      "Family-owned American-made futons, Murphy beds, and mattresses since 1991.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF2DE",
    theme_color: "#3A2518",
    icons: [
      {
        src: "/brand/cf-logo-square.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
