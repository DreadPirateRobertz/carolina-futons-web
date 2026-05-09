import Link from "next/link";

import {
  buildCompareRows,
  buildRemoveSlugUrl,
  COMPARE_MAX,
  type CompareProduct,
} from "@/lib/product/compare";

export type CompareTableProps = {
  products: ReadonlyArray<CompareProduct>;
  slugs: ReadonlyArray<string>;
};

// cf-o6r5: side-by-side comparison table. Each column is one product,
// each row is one attribute. Rows where the values differ get
// data-has-diff so styling (and any future "show only differences"
// toggle) can find them.
export function CompareTable({ products, slugs }: CompareTableProps) {
  const rows = buildCompareRows(products);
  const colCount = products.length;

  return (
    <div
      data-slot="compare-table"
      data-product-count={colCount}
      className="overflow-x-auto"
    >
      <table
        className="w-full min-w-[640px] border-collapse text-sm"
        aria-label="Product comparison"
      >
        <caption className="sr-only">
          Side-by-side comparison of {colCount} products. Rows highlighted
          where values differ.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-32 p-3 text-left font-medium text-cf-muted">
              Product
            </th>
            {products.map((p, i) => {
              const slug = p.slug ?? "";
              const productHref = slug ? `/products/${slug}` : "#";
              return (
                <th
                  key={`col-${slug || i}`}
                  scope="col"
                  data-slot="compare-column-head"
                  className="min-w-[12rem] p-3 text-left align-top"
                >
                  {p.media?.mainMedia?.image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.media.mainMedia.image.url}
                      alt=""
                      className="mb-2 h-32 w-full rounded object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="mb-2 h-32 w-full rounded bg-cf-cream"
                    />
                  )}
                  <Link
                    href={productHref}
                    className="block font-medium text-cf-ink hover:underline"
                  >
                    {p.name ?? "Product"}
                  </Link>
                  {slug ? (
                    <Link
                      href={buildRemoveSlugUrl(slugs, slug)}
                      data-slot="compare-remove"
                      className="mt-2 inline-block text-xs text-cf-muted underline-offset-2 hover:text-cf-ink hover:underline"
                    >
                      Remove
                    </Link>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              data-slot="compare-row"
              data-attr={row.key}
              data-has-diff={row.hasDiff ? "true" : "false"}
              className="border-t border-cf-divider data-[has-diff=true]:bg-cf-cream/30"
            >
              <th
                scope="row"
                className="p-3 text-left align-top font-medium text-cf-muted"
              >
                {row.label}
              </th>
              {row.values.map((value, i) => (
                <td
                  key={`${row.key}-${i}`}
                  className="p-3 align-top text-cf-ink"
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {colCount < COMPARE_MAX ? (
        <p className="mt-4 text-xs text-cf-muted">
          Add up to {COMPARE_MAX} products by appending more slugs to the
          URL: <code>?slugs=a,b,c,d</code>.
        </p>
      ) : null}
    </div>
  );
}
