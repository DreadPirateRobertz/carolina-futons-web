import { Skeleton } from "@/components/ui/skeleton";

// Rendered by Next while the PDP server component resolves (getProductBySlug
// two-step fetch + variant/option parsing). Layout mirrors the real PDP:
// gallery on the left, info/buy-box column on the right. Keeps the LCP
// region stable so the real content slides in without layout shift.
export default function PdpLoading() {
  return (
    <main
      data-slot="pdp-loading"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-6xl px-4 py-10"
    >
      <div className="text-sm text-zinc-500">
        <Skeleton className="inline-block h-3 w-48 rounded" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div data-slot="pdp-loading-gallery">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-square w-full rounded-md"
              />
            ))}
          </div>
        </div>

        <div data-slot="pdp-loading-info" className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-5 w-1/3 rounded" />
          <Skeleton className="mt-2 h-4 w-full rounded" />
          <Skeleton className="h-4 w-11/12 rounded" />
          <Skeleton className="h-4 w-10/12 rounded" />
          <Skeleton className="mt-4 h-12 w-full rounded-md" />
        </div>
      </div>
    </main>
  );
}
