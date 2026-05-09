// Wix media URLs include a `/v1/<mode>/<params>/file.<ext>` slot where the
// transformation is requested. cfw stores raw product URLs in
// `media.mainMedia.image.url` exactly as Wix Stores returns them, which can
// be the original 3000×2000 source. Without rewriting, every <img src> for
// these requests the full original — Kingston PDP shipped 2.4 MB of product
// imagery for that reason (cf-3qt.8 P0-1).
//
// `wixImageUrl(url, w, h)` rewrites the params slot to a sane bound. Targets
// 2× the rendered CSS pixels so retina displays still look sharp; quality is
// 85 by default which is indistinguishable from 90 at this scale.
//
// Non-Wix URLs are returned unchanged so callers can pass anything safely.

const WIX_MEDIA_HOST = "static.wixstatic.com";

export type WixImageOptions = {
  /** Quality 1-100. Default 85 — visually indistinguishable from 90 at retail sizes. */
  quality?: number;
  /** Transform mode. `fit` preserves aspect ratio inside the box; `fill` crops to fill. */
  mode?: "fit" | "fill";
};

/**
 * Constrain a Wix media URL to a target render size. Pass the CSS pixel size;
 * the helper doubles it for retina. Returns the input unchanged for non-Wix
 * URLs and for inputs that don't match the `/v1/<mode>/<params>/<file>` shape.
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
  // Retina target: 2× CSS pixels capped at the original-source ceiling Wix
  // serves (Wix's own examples top out around 4000px). Ints only — Wix
  // rejects fractional w/h params.
  const w = Math.min(4000, Math.max(16, Math.round(cssWidth * 2)));
  const h = Math.min(4000, Math.max(16, Math.round(cssHeight * 2)));

  // Match the existing /v1/<mode>/<params>/<file> segment regardless of what
  // sizing was originally requested.
  const re = /\/v1\/(fit|fill|crop)\/[^/]*\/([^/?#]+)/;
  const replacement = `/v1/${mode}/w_${w},h_${h},q_${quality}/$2`;
  if (re.test(url)) return url.replace(re, replacement);

  // Some Wix URLs come without the /v1/ slot at all (e.g. the bare
  // /media/<id>~mv2.jpg form). Insert the params before the filename.
  const bareRe = /(\/media\/[^/]+~mv2\.[a-zA-Z0-9]+)$/;
  if (bareRe.test(url)) {
    return url.replace(
      bareRe,
      `$1/v1/${mode}/w_${w},h_${h},q_${quality}/file.${extOf(url)}`,
    );
  }

  return url;
}

function clampQuality(q: number): number {
  if (!Number.isFinite(q)) return 85;
  return Math.min(100, Math.max(1, Math.round(q)));
}

function extOf(url: string): string {
  const m = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  return (m?.[1] ?? "jpg").toLowerCase();
}
