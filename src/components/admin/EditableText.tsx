import { getSiteContent } from "@/lib/cms/site-content";
import { getOwnerSession } from "@/lib/auth/owner";
import { EditableTextEditor } from "./EditableTextEditor";

// cfw-v5w (cfw-6qd.2): server-component wrapper that reads a SiteContent
// string and conditionally renders an inline edit affordance for owners.
//
// Non-owners: renders as a plain element. Byte-for-byte identical to a
// `<span>{await getSiteContent(key, fallback)}</span>` so swapping a
// hardcoded string for <EditableText> has no SEO/perf/markup impact for
// the 99.9% of visitors who aren't Brenda.
//
// Owners: renders the value plus a hover-revealed pencil that opens the
// inline editor. The editor (EditableTextEditor) is a client component so
// it can manage popover state and POST to /api/admin/site-content (sub-bead
// 3, will 404 until that lands — the editor surfaces the error inline so
// landing this slice without #3 is non-fatal).

const VALID_TAGS = [
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "li",
] as const;

type TagName = (typeof VALID_TAGS)[number];

export type EditableTextProps = {
  /** SiteContent dotted-path key, e.g. "visit.hours.sun-tue". */
  contentKey: string;
  /** Fallback rendered when the key is missing or Wix is unreachable. */
  fallback: string;
  /** Element tag to render. Defaults to <span>. */
  as?: TagName;
  /** className applied to the rendered element. */
  className?: string;
};

export async function EditableText({
  contentKey,
  fallback,
  as = "span",
  className,
}: EditableTextProps) {
  const [value, owner] = await Promise.all([
    getSiteContent(contentKey, fallback),
    getOwnerSession(),
  ]);

  const Tag = as;

  if (!owner) {
    return (
      <Tag
        className={className}
        data-slot="editable-text"
        data-key={contentKey}
      >
        {value}
      </Tag>
    );
  }

  // Owner mode — wrap the value so the pencil button has a stable parent
  // for `group-hover` detection. The `relative` positioning context lets
  // the editor's popover anchor to this element.
  return (
    <Tag
      className={`${className ?? ""} group relative`.trim()}
      data-slot="editable-text"
      data-key={contentKey}
      data-owner-mode="1"
    >
      <span data-slot="editable-text-value">{value}</span>
      <EditableTextEditor contentKey={contentKey} initialValue={value} />
    </Tag>
  );
}
