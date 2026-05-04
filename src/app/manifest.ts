import type { MetadataRoute } from "next";

// Web App Manifest — drives the beforeinstallprompt flow on Chromium and the
// "Add to Home Screen" sheet on Safari. Next.js auto-serves this from
// /manifest.webmanifest at build time.
//
// Icon-size note: only a 256px square logo is currently in public/brand/.
// Chrome requires both a >=192px and a >=512px icon for full install
// eligibility — see follow-on bead for generating the missing 512px asset.
// Until then the banner will render but Chromium may not surface the install
// prompt on every device. Safari "Add to Home Screen" works at 256px.
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
