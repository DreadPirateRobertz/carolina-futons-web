// cfw-6qd.12: defense-in-depth for owner edits to the SiteContent collection.
// Lives next to the reader (site-content.ts) and the seed (scripts/
// provision-site-content/) so the three pieces share a single notion of
// what a valid SiteContent key looks like.
//
// Used by /api/admin/site-content (cfw-6qd.3) to reject malformed payloads
// before they reach Wix Data. Wix collection writes are otherwise loosely
// typed — without app-level validation, a typo'd key (e.g. "Footer.Tagline"
// or "footer..tagline") would silently land a row that no reader can see,
// and Brenda's edit would appear to succeed yet not show up on the site.
//
// Scope today: (a) key naming convention. HTML sanitisation (the bead's
// part c) needs a vetted lib (DOMPurify / rehype-sanitize) — tracked as a
// follow-up since adding a dep is a coordinator decision and the endpoint
// already enforces a 4 KiB length cap that limits the blast radius.

// Lowercase, dotted-path, hyphenated segments. Matches the seed convention
// pinned in src/__tests__/site-content-seed.test.ts (cfw-roi/cf-atze) and
// documented in docs/design/cfw-66o-footer-announce-specs.md §2:
//
//   "footer.tagline"                        ✓
//   "footer.showroom-hours.label"           ✓
//   "announcement.rotation.0.message"       ✓
//   "Footer.Tagline"                        ✗  (capitals)
//   "footer.showroomHours"                  ✗  (camelCase segment)
//   "footer..tagline"                       ✗  (empty segment)
//   "footer"                                ✗  (single segment — needs >= 2)
//   "footer.tagline!"                       ✗  (special char)
export const SITE_CONTENT_KEY_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export type OwnerEditKeyError =
  | "empty"
  | "too_long"
  | "bad_pattern";

export type OwnerEditKeyValidation =
  | { ok: true; key: string }
  | { ok: false; reason: OwnerEditKeyError; message: string };

// 256 chars matches the endpoint's existing MAX_KEY_LENGTH; kept here as
// the canonical limit so /api/admin/site-content and any future callers
// stay in sync.
export const MAX_OWNER_EDIT_KEY_LENGTH = 256;

/**
 * Validate a SiteContent key for an owner edit.
 *
 * Trims whitespace, then enforces:
 *   - non-empty after trim
 *   - length ≤ MAX_OWNER_EDIT_KEY_LENGTH
 *   - matches SITE_CONTENT_KEY_PATTERN (lowercase dotted-path, ≥ 2 segments)
 *
 * Returns the trimmed key on success so callers don't need to re-trim.
 */
export function validateOwnerEditKey(
  raw: unknown,
): OwnerEditKeyValidation {
  if (typeof raw !== "string") {
    return {
      ok: false,
      reason: "empty",
      message: "Field 'key' is required and must be a string.",
    };
  }
  const key = raw.trim();
  if (key.length === 0) {
    return {
      ok: false,
      reason: "empty",
      message: "Field 'key' cannot be empty.",
    };
  }
  if (key.length > MAX_OWNER_EDIT_KEY_LENGTH) {
    return {
      ok: false,
      reason: "too_long",
      message: `Field 'key' exceeds ${MAX_OWNER_EDIT_KEY_LENGTH} chars.`,
    };
  }
  if (!SITE_CONTENT_KEY_PATTERN.test(key)) {
    return {
      ok: false,
      reason: "bad_pattern",
      message:
        "Field 'key' must be lowercase dotted-path with hyphenated segments (e.g. 'footer.tagline' or 'footer.showroom-hours.label').",
    };
  }
  return { ok: true, key };
}
