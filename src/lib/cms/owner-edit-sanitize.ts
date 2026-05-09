import "server-only";

import DOMPurify, { type Config } from "isomorphic-dompurify";

// cfw-qyy (cfw-6qd.12 follow-up part c): allowlist-based sanitiser for the
// owner SiteContent write path. Brenda's edits are short labels today
// (4 KiB cap enforced upstream in /api/admin/site-content), but the editor
// will eventually expose simple inline rich-text — bold, italic, paragraph
// breaks — so we sanitise on the way in and persist a normalised string.
//
// Strategy:
//   - DOMPurify with an explicit allowlist (b/i/strong/em/a/ul/li/p/br only)
//   - No event handlers, ever (USE_PROFILES.html intentionally NOT set so we
//     control the surface)
//   - <a> kept but href restricted to http(s) and mailto; tel: also OK.
//     javascript:/data:/vbscript: hrefs are stripped by ALLOWED_URI_REGEXP.
//   - All non-allowlisted tags are stripped (their text content is kept)
//   - Whole-document scripts <script>...</script> have their CONTENT
//     dropped (KEEP_CONTENT: false) so payloads like
//     "<script>alert(1)</script>X" sanitise to "X" instead of
//     "alert(1)X".
//
// The allowlist is intentionally narrow: anything beyond simple emphasis +
// links + lists is outside the scope of what the EditableText editor emits.
// Expanding it later requires another security review.

const ALLOWED_TAGS = ["b", "i", "strong", "em", "a", "ul", "li", "p", "br"];

// href schemes Brenda is allowed to link to. Anchors with disallowed schemes
// (javascript:, data:, vbscript:, file:, etc.) have their href stripped by
// DOMPurify; the <a> wrapper itself is preserved without an href so the
// visible text survives.
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel):|[/?#])|^$/i;

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: ["href"],
  ALLOWED_URI_REGEXP,
  // Drop the *content* of script/style/iframe etc. — without this, a payload
  // like "<script>alert(1)</script>" would sanitise to "alert(1)" because
  // DOMPurify's KEEP_CONTENT default surfaces inner text of stripped
  // elements. Plain disallowed wrappers (<div>, <span>) still surrender
  // their text content, which is what we want for "<div>hello</div>" → "hello".
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
  FORBID_CONTENTS: [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "form",
    "noscript",
    "noembed",
    "noframes",
  ],
};

/**
 * Sanitise an owner-submitted SiteContent value to the allowlisted HTML
 * subset. Always returns a string — DOMPurify never throws for normal
 * input. The output may be empty if every input element was disallowed
 * (e.g. a value that was nothing but `<script>` tags).
 */
export function sanitizeOwnerHtml(input: string): string {
  if (!input) return "";
  // DOMPurify is sync in both jsdom (test) and the Node 22 server runtime
  // because isomorphic-dompurify ships its own jsdom for SSR. We don't set
  // RETURN_TRUSTED_TYPE, so the return is always a plain string at runtime;
  // the union TrustedHTML in the type sig is for the trusted-types path.
  return DOMPurify.sanitize(input, SANITIZE_CONFIG) as string;
}
