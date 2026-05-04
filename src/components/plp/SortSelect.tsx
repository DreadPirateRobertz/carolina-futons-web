"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { PlpSort } from "@/lib/wix/plp";

const SORT_LABELS: Record<PlpSort, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "name-asc": "Name: A–Z",
  "name-desc": "Name: Z–A",
  newest: "Newest",
};

export function SortSelect({ sort }: { sort: PlpSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <label htmlFor="sort-select" className="sr-only">
        Sort by
      </label>
      <select
        id="sort-select"
        value={sort}
        onChange={handleChange}
        className="rounded border border-cf-divider bg-white px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-cf-cta/50"
      >
        {(Object.keys(SORT_LABELS) as PlpSort[]).map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
