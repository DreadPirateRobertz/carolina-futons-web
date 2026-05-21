/**
 * Strip HTML tags and decode the common named entities from a string,
 * yielding plain text.
 *
 * WHY: Wix Stores returns `product.description` (and similar CMS fields) as
 * HTML. Several server surfaces need a plain-text form of it — the PDP body
 * copy, `<meta name="description">`, and the `Product` JSON-LD `description`.
 * Keeping one shared implementation means those surfaces never drift (a
 * mismatch between the rendered description and the JSON-LD one is the kind
 * of thing Search Console flags). This is a deliberate placeholder: rich-HTML
 * rendering with a real sanitizer (DOMPurify / sanitize-html) is a later
 * slice — until then, tag-stripping is the safe, escaping-free option.
 *
 * @param input - Raw HTML string (e.g. a Wix `description` field).
 * @returns The tag-free, entity-decoded, trimmed plain-text equivalent.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
