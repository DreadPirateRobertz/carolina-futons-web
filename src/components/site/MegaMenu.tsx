"use client";

// Mega-menu hover/focus panel for desktop primary nav (cf-l6aj.11).
//
// Accessibility contract:
//   - Each trigger is a <button> with aria-expanded + aria-controls pointing
//     at the panel. When expanded, focus can Tab into the panel (sub-links +
//     featured image are tabbable). Escape closes from anywhere inside.
//   - The panel is role="region" with an aria-label matching the trigger text,
//     so screen readers announce "Futon Frames region" when it opens.
//   - Mouse: panel opens on mouseenter trigger, closes on mouseleave of the
//     entire group (trigger + panel together).
//   - Keyboard: Enter/Space on trigger opens; Tab forward eventually leaves
//     the panel (no focus trap — mega-menus are not dialogs); Escape closes.
//   - Mobile: not rendered (hidden md:hidden on parent) — HeaderMobileMenu
//     handles mobile nav.

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { MEGA_MENU_DATA, type MegaMenuPanel } from "@/lib/nav/mega-menu-data";

export type MegaMenuItemProps = {
  label: string;
  href: string;
};

export function MegaMenuItem({ label, href }: MegaMenuItemProps) {
  const panel: MegaMenuPanel | undefined = MEGA_MENU_DATA[href];
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  // Close on Escape from anywhere inside the group.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Close when focus leaves the group entirely (Tab past last link).
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!groupRef.current?.contains(e.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  if (!panel) {
    // No panel data → plain link, no button wrapper.
    return (
      <Link
        href={href}
        className="text-sm font-medium text-cf-charcoal transition-colors hover:text-cf-cta focus-visible:outline-none focus-visible:text-cf-cta"
      >
        {label}
      </Link>
    );
  }

  return (
    <div
      ref={groupRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={handleBlur}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1 text-sm font-medium text-cf-charcoal transition-colors hover:text-cf-cta focus-visible:outline-none focus-visible:text-cf-cta"
      >
        {label}
        <svg
          aria-hidden="true"
          className={`size-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={label}
          data-slot="mega-menu-panel"
          className="absolute left-0 top-full z-50 mt-1 flex w-72 overflow-hidden rounded-lg border border-cf-divider bg-white shadow-lg"
        >
          {/* Featured image */}
          <Link
            href={href}
            tabIndex={-1}
            aria-hidden="true"
            className="block w-28 shrink-0"
          >
            <Image
              src={panel.image}
              alt={panel.imageAlt}
              width={112}
              height={150}
              className="h-full w-full object-cover"
            />
          </Link>

          {/* Sub-links */}
          <ul className="flex flex-col gap-0.5 p-3">
            {panel.subLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded px-2 py-1.5 text-sm text-cf-charcoal transition-colors hover:bg-cf-sand/60 hover:text-cf-cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
