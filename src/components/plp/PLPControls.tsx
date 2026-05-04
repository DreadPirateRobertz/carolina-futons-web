"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { PlpSort } from "@/lib/wix/plp";

const SORT_OPTIONS: { value: PlpSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "name-desc", label: "Name: Z–A" },
  { value: "newest", label: "Newest" },
];

type Props = {
  sort: PlpSort;
  priceMin?: number;
  priceMax?: number;
  inStockOnly: boolean;
  totalFiltered: number;
};

export function PLPControls({
  sort,
  priceMin,
  priceMax,
  inStockOnly,
  totalFiltered,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    // Reset to page 1 on filter/sort change
    params.delete("page");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function onSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildUrl({ sort: e.target.value }));
  }

  function onApplyFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    router.push(
      buildUrl({
        priceMin: (data.get("priceMin") as string) || undefined,
        priceMax: (data.get("priceMax") as string) || undefined,
        inStock: data.get("inStock") === "on" ? "1" : undefined,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-end sm:gap-6 dark:border-zinc-700 dark:bg-zinc-800">
      {/* Sort */}
      <div className="flex flex-col gap-1">
        <label htmlFor="plp-sort" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Sort by
        </label>
        <select
          id="plp-sort"
          value={sort}
          onChange={onSortChange}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:ring-zinc-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Price + stock filters */}
      <form
        onSubmit={onApplyFilters}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="plp-priceMin"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Min price ($)
          </label>
          <input
            id="plp-priceMin"
            name="priceMin"
            type="number"
            min={0}
            step={1}
            defaultValue={priceMin ?? ""}
            placeholder="0"
            className="w-24 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="plp-priceMax"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Max price ($)
          </label>
          <input
            id="plp-priceMax"
            name="priceMax"
            type="number"
            min={0}
            step={1}
            defaultValue={priceMax ?? ""}
            placeholder="any"
            className="w-24 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
          />
        </div>

        <div className="flex items-center gap-2 pb-1.5">
          <input
            id="plp-inStock"
            name="inStock"
            type="checkbox"
            defaultChecked={inStockOnly}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 dark:bg-zinc-700 dark:accent-zinc-300"
          />
          <label
            htmlFor="plp-inStock"
            className="select-none text-sm text-zinc-700 dark:text-zinc-200"
          >
            In stock only
          </label>
        </div>

        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Apply
        </button>
      </form>

      <p className="ml-auto text-sm text-zinc-600 sm:self-end dark:text-zinc-400">
        {totalFiltered} {totalFiltered === 1 ? "product" : "products"}
      </p>
    </div>
  );
}
