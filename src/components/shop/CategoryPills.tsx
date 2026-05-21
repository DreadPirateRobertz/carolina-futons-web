import Link from "next/link";
import type { Subcategory } from "@/lib/shop/categories";

const BASE_CLS =
  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-1";
const ACTIVE_CLS = "border-cf-navy bg-cf-navy text-white dark:border-cf-navy";
const IDLE_CLS =
  "border-zinc-300 text-zinc-700 hover:border-cf-navy hover:text-cf-navy dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-cf-navy dark:hover:text-white";

export function CategoryPills({
  subcategories,
  activeSub,
  categorySlug,
}: {
  subcategories: readonly Subcategory[];
  activeSub: string | undefined;
  categorySlug: string;
}) {
  const basePath = `/shop/${categorySlug}`;
  return (
    <nav aria-label="Sub-category filter" className="mt-4 flex flex-wrap gap-2">
      <Link
        href={basePath}
        aria-current={activeSub === undefined ? "page" : undefined}
        className={`${BASE_CLS} ${activeSub === undefined ? ACTIVE_CLS : IDLE_CLS}`}
      >
        All
      </Link>
      {subcategories.map((sub) => (
        <Link
          key={sub.slug}
          href={`${basePath}?sub=${sub.slug}`}
          aria-current={activeSub === sub.slug ? "page" : undefined}
          className={`${BASE_CLS} ${activeSub === sub.slug ? ACTIVE_CLS : IDLE_CLS}`}
        >
          {sub.name}
        </Link>
      ))}
    </nav>
  );
}
