import Link from "next/link";

type Props = {
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
};

export function buildPageUrl(
  basePath: string,
  searchParams: Record<string, string | string[] | undefined>,
  targetPage: number,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "page") continue;
    if (Array.isArray(v)) {
      if (v[0] !== undefined) params.set(k, v[0]);
    } else if (v !== undefined) {
      params.set(k, v);
    }
  }
  if (targetPage > 1) params.set("page", String(targetPage));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function PLPPagination({
  page,
  hasNext,
  hasPrev,
  basePath,
  searchParams,
}: Props) {
  if (!hasNext && !hasPrev) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-4"
    >
      {hasPrev ? (
        <Link
          href={buildPageUrl(basePath, searchParams, page - 1)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ← Previous
        </Link>
      ) : (
        <span className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-300">
          ← Previous
        </span>
      )}

      <span className="text-sm text-zinc-500">Page {page}</span>

      {hasNext ? (
        <Link
          href={buildPageUrl(basePath, searchParams, page + 1)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Next →
        </Link>
      ) : (
        <span className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-300">
          Next →
        </span>
      )}
    </nav>
  );
}
