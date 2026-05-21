import { logWarn } from "@/lib/observability/log";

// Wix media URLs include a `/v1/<mode>/<params>/file.<ext>` slot where the
// transformation is requested. The catalog can store the source at any size
// (3000×2000 originals are common), so rendering `media.mainMedia.image.url`
// directly ships the unconstrained source. This helper rewrites the params
// slot so a bare <img src> requests a sensibly-sized image.
//
// `wixImageUrl(url, cssW, cssH)` doubles the CSS pixel size for retina and
// defaults q=85 — visually indistinguishable from q=90 at retail sizes.
// Non-Wix URLs and inputs the helper can't recognize pass through unchanged
// so callers can pass anything safely.

const WIX_MEDIA_HOST = "static.wixstatic.com";

export type WixImageOptions = {
  /** Quality 1-100. Default 85. */
  quality?: number;
  /** Transform mode. `fit` preserves aspect ratio inside the box; `fill` crops to fill. */
  mode?: "fit" | "fill";
};

/**
 * Constrain a Wix media URL to a target render size. Pass the CSS pixel size;
 * the helper doubles it for retina. Returns the input unchanged for non-Wix
 * URLs and for inputs that don't match the `/v1/<mode>/<params>/<file>` shape.
 *
 * Empty / null / undefined input returns "" so the consumer's `<img src>` ends
 * up empty rather than rendering "null".
 */
export function wixImageUrl(
  url: string | null | undefined,
  cssWidth: number,
  cssHeight: number,
  opts: WixImageOptions = {},
): string {
  if (!url) return "";
  if (!url.includes(WIX_MEDIA_HOST)) return url;

  const mode = opts.mode ?? "fit";
  const quality = clampQuality(opts.quality ?? 85);
  // 2× CSS pixels, clamped to [16, 4000]. Wix rejects fractional w/h params
  // so round; the upper cap matches the largest dimension Wix's own examples
  // request, anything larger is a loss of cache hit rate on the CDN.
  const w = Math.min(4000, Math.max(16, Math.round(cssWidth * 2)));
  const h = Math.min(4000, Math.max(16, Math.round(cssHeight * 2)));

  // Strip query/fragment for the rewrite work and re-attach at the end. Wix
  // signed URLs (used by the Headless Stores SDK) carry `?token=...` and a
  // `$`-anchored regex would skip them entirely, leaving the original
  // unconstrained source URL through — the bug that shipped in the first
  // P0-1 cut (#468).
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const cutIdx =
    hashIdx === -1 ? queryIdx : queryIdx === -1 ? hashIdx : Math.min(hashIdx, queryIdx);
  const base = cutIdx === -1 ? url : url.slice(0, cutIdx);
  const tail = cutIdx === -1 ? "" : url.slice(cutIdx);

  // Match the existing /v1/<mode>/<params>/<file> segment.
  const re = /\/v1\/(fit|fill|crop)\/[^/]*\/([^/]+)$/;
  const replacement = `/v1/${mode}/w_${w},h_${h},q_${quality}/$2`;
  if (re.test(base)) return base.replace(re, replacement) + tail;

  // Bare /media/<id>~mv2.<ext> with no /v1/ slot — synthesize one.
  const bareRe = /(\/media\/[^/]+~mv2\.[a-zA-Z0-9]+)$/;
  if (bareRe.test(base)) {
    return (
      base.replace(
        bareRe,
        `$1/v1/${mode}/w_${w},h_${h},q_${quality}/file.${extOf(base)}`,
      ) + tail
    );
  }

  // Wix host but unrecognized path shape. Surface so a future Wix URL format
  // change doesn't silently ship oversized images. Only the path triggers
  // this branch (other passthroughs return early on the host check), so
  // each unique shape logs once per session at most.
  if (typeof console !== "undefined" && !loggedUnrecognized.has(base)) {
    loggedUnrecognized.add(base);
    logWarn("wix-image", "unrecognized Wix URL shape, passing through", url);
  }
  return url;
}

const loggedUnrecognized = new Set<string>();

function clampQuality(q: number): number {
  if (!Number.isFinite(q)) return 85;
  return Math.min(100, Math.max(1, Math.round(q)));
}

function extOf(url: string): string {
  const m = url.match(/\.([a-zA-Z0-9]+)$/);
  return (m?.[1] ?? "jpg").toLowerCase();
}
