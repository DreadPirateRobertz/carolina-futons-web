"use client";

// cfw-kg3: client-side FAQ search + category filter. Wraps the existing
// grouped-accordion render in a controlled input + button-bar surface
// so visitors can narrow the question set instead of scrolling the
// whole page.
//
// WHY client component: filter + search are user interactions that
// can't happen at SSR. The matching is pure JS over an in-memory list
// (the dataset is small — Wix FAQ collection rarely exceeds 50 rows),
// so this stays cheap to ship alongside the existing server-rendered
// schema markup (which is unaffected by this component — it lives in
// the page above).

import { useId, useMemo, useState } from "react";

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqGroup = {
  category: string;
  items: readonly FaqItem[];
};

export type FaqBrowserProps = {
  /**
   * Server-grouped FAQ rows from `listFaqs` → `groupFaqsByCategory`.
   * Component does not re-fetch; treats the prop as immutable for the
   * lifetime of the page (`readonly` matches the upstream return type).
   */
  groups: readonly FaqGroup[];
};

const ALL_LABEL = "All";

/**
 * Slugify for stable heading + region ids.
 */
function slugify(input: string): string {
  return input
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * /faq client renderer with search + category filter.
 *
 * @param props.groups The deduped category groups, server-rendered upstream.
 * @returns A search bar, a category-button row, and the filtered
 *   accordion. Empty groups (after filter) are hidden; an inline
 *   empty-state message renders when nothing matches.
 *
 * WHY visibility-by-omission (vs. greying-out): collapsing the
 * non-matching groups keeps the page concise — scanning is the primary
 * use case here. The aria-pressed attribute on the buttons signals the
 * active state for AT users without leaning on visual styling alone.
 */
export function FaqBrowser({ groups }: FaqBrowserProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_LABEL);
  const searchId = useId();

  const filtered = useMemo<FaqGroup[]>(() => {
    const q = query.trim().toLocaleLowerCase();
    const isAll = category === ALL_LABEL;

    return groups
      .filter((g) => isAll || g.category === category)
      .map((g) => {
        if (!q) return g;
        const items = g.items.filter((it) => {
          const haystack = `${it.question} ${it.answer}`.toLocaleLowerCase();
          return haystack.includes(q);
        });
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, query, category]);

  const empty = filtered.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor={searchId}
          className="block text-sm font-medium text-cf-ink"
        >
          Search
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. shipping, mattress, warranty…"
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div
        role="group"
        aria-label="Filter by category"
        className="flex flex-wrap gap-2"
      >
        <CategoryButton
          label={ALL_LABEL}
          active={category === ALL_LABEL}
          onClick={() => setCategory(ALL_LABEL)}
        />
        {groups.map((g) => (
          <CategoryButton
            key={g.category}
            label={g.category}
            active={category === g.category}
            onClick={() => setCategory(g.category)}
          />
        ))}
      </div>

      {empty ? (
        <p className="text-base text-cf-muted">
          No questions match — try a different search or category.
        </p>
      ) : (
        <div className="space-y-10">
          {filtered.map((group) => (
            <section
              key={group.category}
              aria-labelledby={`faq-cat-${slugify(group.category)}`}
              className="space-y-3"
            >
              <h2
                id={`faq-cat-${slugify(group.category)}`}
                className="font-playfair text-2xl font-semibold tracking-tight"
              >
                {group.category}
              </h2>
              <ul className="space-y-2">
                {group.items.map((item, i) => (
                  <li key={`${group.category}-${i}-${item.question}`} role="group">
                    <details className="group rounded-md border border-cf-divider bg-white dark:bg-cf-cream dark:border-cf-ink/30 px-4 py-3 transition-colors open:border-cf-cta/40 open:bg-cf-cream">
                      <summary className="cursor-pointer list-none text-base font-medium text-cf-ink marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <span className="flex items-center justify-between gap-3">
                          <span>{item.question}</span>
                          <span
                            aria-hidden="true"
                            className="shrink-0 text-cf-muted transition-transform group-open:rotate-45"
                          >
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-3 text-base leading-relaxed text-cf-charcoal/85">
                        {item.answer}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-cf-cta bg-cf-cta px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white"
          : "rounded-full border border-cf-divider bg-white px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-cf-ink hover:border-cf-cta hover:text-cf-cta"
      }
    >
      {label}
    </button>
  );
}
