// Announcement bar — Wix CMS-driven (melania §5 Q3).
// Phase 1: static stub shape matches future Wix `Announcements` collection row:
//   { message: string, ctaLabel?: string, ctaHref?: string }
// Phase 3 (rennala) will swap the inline props for a server-side fetch.

type AnnouncementBarProps = {
  message?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function AnnouncementBar({
  message = "Free white-glove delivery on orders over $1,500",
  ctaLabel,
  ctaHref,
}: AnnouncementBarProps) {
  return (
    <div
      data-slot="announcement-bar"
      role="region"
      aria-label="Site announcement"
      className="flex h-[44px] items-center justify-center bg-cf-navy px-4 text-center text-sm font-medium text-cf-cream"
    >
      <p className="inline-flex items-center gap-2">
        <span aria-live="polite" aria-atomic="true">{message}</span>
        {ctaLabel && ctaHref ? (
          <a
            href={ctaHref}
            className="underline underline-offset-4 decoration-cf-cream/60 hover:decoration-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cream rounded-sm"
          >
            {ctaLabel}
          </a>
        ) : null}
      </p>
    </div>
  );
}
