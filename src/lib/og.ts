// Single source of truth for the default Open Graph image used by the root
// layout and as a fallback when a page has no specific image.
// width/height MUST match the w_/h_ transform params in the CDN URL — keeping
// them in sync prevents crawlers from receiving incorrect declared dimensions.
export const DEFAULT_OG_IMAGE = {
  url: "https://static.wixstatic.com/media/e04e89_72d82110638045c39e0f6274363c15f8~mv2.jpg/v1/fill/w_1920,h_1080,q_90/file.jpg",
  width: 1920,
  height: 1080,
  alt: "Monterey mission-style hardwood futon in a sunlit living room",
} as const;
