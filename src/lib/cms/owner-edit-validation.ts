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
// Scope: (a) key naming convention, (b) lightweight value sanitization —
// control-byte strip + dangerous URL scheme rejection. The heavier
// HTML-sanitization variant (DOMPurify / rehype-sanitize) is deferred:
// SiteContent values are rendered today via JSX `{value}` interpolation
// which auto-escapes, so a vetted-lib HTML pass is appropriate only when
// a caller starts using `dangerouslySetInnerHTML` (no caller does
// today). The lighter-weight checks here cover (1) Wix RICH_TEXT
// hygiene and (2) the href-shaped keys (e.g.
// `announcement.rotation.3.cta-href`) where React doesn't pre-block
// `javascript:` schemes before render.

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

// 4 KiB matches the route handler's existing MAX_VALUE_LENGTH; kept here
// as the canonical limit so any future caller stays in sync.
export const MAX_OWNER_EDIT_VALUE_LENGTH = 4096;

export type OwnerEditValueError =
  | "missing"
  | "too_long"
  | "dangerous_url_scheme";

export type OwnerEditValueValidation =
  | { ok: true; value: string }
  | { ok: false; reason: OwnerEditValueError; message: string };

// Strip ASCII control bytes that have no place in owner-edited copy:
// NUL through US (0x00–0x1F) excluding the three whitespace bytes owners
// might legitimately paste — \t (0x09), \n (0x0A), \r (0x0D) — plus DEL
// (0x7F). Wix RICH_TEXT accepts these without complaint, but they slip
// past higher-level encoders and make downstream consumers behave oddly.
const CONTROL_BYTE_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// URL schemes we never want to land in a SiteContent row. Several
// existing keys end up rendered as `<a href={value}>` (e.g.
// `announcement.rotation.3.cta-href`); React doesn't pre-block
// `javascript:` hrefs before render-time, only emits a dev warning, so
// we reject these at the write boundary. Case-insensitive, allows
// leading whitespace (the trim happens elsewhere; we still want the
// pattern to defend against an accidental leading space sneaking past).
const DANGEROUS_URL_SCHEME_PATTERN =
  /^\s*(?:javascript|vbscript|data)\s*:/i;

/**
 * Validate + lightly sanitize a SiteContent value for an owner edit.
 *
 * Order of operations:
 *   1. Reject non-string input.
 *   2. Strip control bytes (silent — Brenda doesn't intend NULs).
 *   3. Reject over MAX_OWNER_EDIT_VALUE_LENGTH (4 KiB).
 *   4. Reject dangerous URL schemes (`javascript:` / `vbscript:` /
 *      `data:`) — these are the only realistic stored-XSS vectors given
 *      the current rendering model (`{value}` JSX, which auto-escapes).
 *
 * Empty strings are allowed — clearing a key is a valid owner edit
 * (e.g. blanking out the announcement bar between sales).
 *
 * Returns the sanitized value on success — caller writes that, not the
 * raw input.
 */
export function sanitizeOwnerEditValue(
  raw: unknown,
): OwnerEditValueValidation {
  if (typeof raw !== "string") {
    return {
      ok: false,
      reason: "missing",
      message: "Field 'value' is required and must be a string.",
    };
  }

  const stripped = raw.replace(CONTROL_BYTE_PATTERN, "");

  if (stripped.length > MAX_OWNER_EDIT_VALUE_LENGTH) {
    return {
      ok: false,
      reason: "too_long",
      message: `Field 'value' exceeds ${MAX_OWNER_EDIT_VALUE_LENGTH} chars.`,
    };
  }
  // URL-scheme check runs only on non-empty values; an empty string can't
  // be a dangerous URL.
  if (stripped.length > 0 && DANGEROUS_URL_SCHEME_PATTERN.test(stripped)) {
    return {
      ok: false,
      reason: "dangerous_url_scheme",
      message:
        "Field 'value' cannot start with a javascript:, vbscript:, or data: URL scheme.",
    };
  }

  return { ok: true, value: stripped };
}
