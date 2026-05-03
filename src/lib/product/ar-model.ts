export const CDN_GLB_BASE = "https://cdn.carolinafutons.com/models/glb";

export function resolveGlbUrl(slug: string): string | null {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  return `${CDN_GLB_BASE}/${trimmed}.glb`;
}
