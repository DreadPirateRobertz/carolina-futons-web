import Link from "next/link";

// cf-76a (cf-ruhm.1): type-filter tabs for /search. Mirrors Wix Studio
// prod's "All / Products / Pages / Blog" tabs.
//
// WHY <nav role="navigation"> instead of role="tablist": each "tab" is
// actually a Next.js <Link> to a different URL (?type=X), not a panel
// switcher that lives on the current page. role=tablist implies an
// interactive widget with arrow-key panel switching; role=navigation is
// the honest semantic for URL-based filters. Screen readers handle the
// aria-current="page" affordance correctly without forcing arrow-key
// JS hydration. PLP's filter chips use the same pattern.

export const SEARCH_TYPES = ["all", "products", "pages", "articles"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/**
 * Type-guard normaliser: accepts arbitrary `?type=` strings from the URL
 * and resolves them to a canonical `SearchType`, defaulting to `"all"`
 * for missing / unrecognised values.
 *
 * @param raw - Raw `?type=` query param (`string | string[] | undefined`).
 * @returns A canonical `SearchType` — never throws on bad input.
 *
 * WHY: keeps the page render code path total; an unknown `?type=foo`
 * renders the All view instead of 404'ing the search page.
 */
export function parseSearchType(
  raw: string | string[] | undefined,
): SearchType {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "all";
  return (SEARCH_TYPES as ReadonlyArray<string>).includes(value)
    ? (value as SearchType)
    : "all";
}

export type SearchTabCounts = Record<SearchType, number>;

const TAB_LABELS: Record<SearchType, string> = {
  all: "All",
  products: "Products",
  pages: "Pages",
  articles: "Articles",
};

export type SearchTabsProps = {
  q: string;
  type: SearchType;
  counts: SearchTabCounts;
};

/**
 * Server-rendered filter strip displayed above /search results.
 *
 * Each tab is a `<Link>` to `/search?q=<q>&type=<X>`. The currently-active
 * tab gets `aria-current="page"` so screen readers announce it as the
 * present view; visual users see a bold underline + filled background.
 *
 * @param props.q - The current search query, preserved across tab links.
 * @param props.type - The currently-active type filter.
 * @param props.counts - Per-tab result counts (rendered inline: "All (41)").
 */
export function SearchTabs({ q, type, counts }: SearchTabsProps) {
  const qEncoded = encodeURIComponent(q);
  return (
    <nav
      aria-label="Filter results by type"
      data-slot="search-tabs"
      className="mt-6 border-b border-cf-divider"
    >
      <ul className="-mb-px flex flex-wrap gap-2 text-sm">
        {SEARCH_TYPES.map((id) => {
          const active = id === type;
          const href = `/search?q=${qEncoded}&type=${id}`;
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                data-slot="search-tab"
                data-active={active ? "true" : "false"}
                className={
                  active
                    ? "inline-flex items-center gap-1 border-b-2 border-cf-cta px-3 py-2 font-medium text-cf-espresso dark:text-cf-cream"
                    : "inline-flex items-center gap-1 border-b-2 border-transparent px-3 py-2 text-cf-muted hover:border-cf-divider hover:text-cf-espresso dark:hover:text-cf-cream"
                }
              >
                {TAB_LABELS[id]}
                <span className="text-xs text-cf-muted">({counts[id]})</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
