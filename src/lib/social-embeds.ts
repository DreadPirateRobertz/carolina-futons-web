// Social embed configuration — cf-l6aj.5
//
// Curated post IDs for the home page social feed section.
// Using platform-native iframe embeds so no API token or paid aggregator
// is required. Update the IDs when the store posts better content.
//
// Consent gate: embeds only load after cf_consent=granted (Consent Mode v2).
// Before consent, a placeholder preserves layout height to avoid CLS.

export type SocialPlatform = "instagram" | "tiktok" | "pinterest";

export type SocialEmbed = {
  platform: SocialPlatform;
  /** Human-readable label for accessibility */
  label: string;
  /** Link to the profile (used in the consent placeholder CTA) */
  profileUrl: string;
  /** Embed iframe src */
  embedUrl: string;
  /** Reserved iframe height in pixels — set to avoid layout shift */
  height: number;
};

// Carolina Futons social handles
const IG_HANDLE = "carolinafutons";
const TT_HANDLE = "@carolinafutons";
const PT_HANDLE = "carolinafutons";

// Curated embed IDs — update these to feature current posts.
// Instagram shortcode: the path segment from /p/<shortcode>/
const IG_POST_SHORTCODE = "C8rFkNfRzAB";
// TikTok video ID: numeric ID from the share URL
const TT_VIDEO_ID = "7374821093847261486";
// Pinterest board: slug after the username
const PT_BOARD_SLUG = "futon-frames";

export const SOCIAL_EMBEDS: readonly SocialEmbed[] = [
  {
    platform: "instagram",
    label: `Carolina Futons on Instagram (${IG_HANDLE})`,
    profileUrl: `https://www.instagram.com/${IG_HANDLE}/`,
    embedUrl: `https://www.instagram.com/p/${IG_POST_SHORTCODE}/embed/captioned/`,
    height: 560,
  },
  {
    platform: "tiktok",
    label: `Carolina Futons on TikTok (${TT_HANDLE})`,
    profileUrl: `https://www.tiktok.com/${TT_HANDLE}/`,
    embedUrl: `https://www.tiktok.com/embed/v2/${TT_VIDEO_ID}`,
    height: 560,
  },
  {
    platform: "pinterest",
    label: `Carolina Futons on Pinterest (${PT_HANDLE})`,
    profileUrl: `https://www.pinterest.com/${PT_HANDLE}/${PT_BOARD_SLUG}/`,
    // Pinterest board widget embed
    embedUrl: `https://assets.pinterest.com/js/pinit.js`,
    // Pinterest uses a script widget, not an iframe — height is reserved for
    // the placeholder; the actual widget renders at natural height.
    height: 400,
  },
];

/** Platform display names for UI labels */
export const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  pinterest: "Pinterest",
};

/** Platform brand colors (used for placeholder accents) */
export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  instagram: "#E1306C",
  tiktok: "#010101",
  pinterest: "#E60023",
};
