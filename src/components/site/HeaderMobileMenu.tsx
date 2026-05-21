"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// cf-mobile-hamburger-portal (Stilgar P0, third flag): the drawer
// render originally lived inline next to the trigger button, which
// meant the Header's stacking context (sticky + transform on scroll-
// shrink + the gradient backdrop) was clipping or under-layering the
// drawer on iOS Safari at 390×844. Portaling to document.body escapes
// every ancestor stacking context so `z-50` actually wins. The
// `mounted` gate keeps SSR from touching `document` (which would
// crash the App Router server pass).

const PRIMARY_NAV = [
  { label: "Futon Frames", href: "/shop/futon-frames" },
  { label: "Murphy Cabinet Beds", href: "/shop/murphy-cabinet-beds" },
  { label: "Platform Beds", href: "/shop/platform-beds" },
  { label: "Mattresses", href: "/shop/mattresses" },
  { label: "Sale", href: "/shop/mattresses-sale" },
] as const;

const SUB_NAV = [
  { label: "Design a Room", href: "/design-a-room" },
  { label: "Guides", href: "/guides" },
  { label: "Reviews", href: "/reviews" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Visit Us", href: "/visit" },
  { label: "Contact", href: "/contact" },
] as const;

// All focusable elements we cycle through inside the drawer.
const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Returns false on the server, true on the client — no setState in an effect.
const emptySubscribe = () => () => {};

export function HeaderMobileMenu() {
  const [open, setOpen] = useState(false);
  // useSyncExternalStore: false on SSR, true after hydration — avoids the
  // setState-in-effect pattern that triggers the react-compiler lint rule.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
      // Focus trap — Tab / Shift+Tab cycles within the drawer
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move focus into drawer on open
  useEffect(() => {
    if (!open || !drawerRef.current) return;
    const first = drawerRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
    first?.focus();
  }, [open]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger trigger — visible only below md breakpoint */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden"
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
      </button>

      {mounted &&
        createPortal(
          <DrawerTree
            open={open}
            drawerRef={drawerRef}
            triggerRef={triggerRef}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

function DrawerTree({
  open,
  drawerRef,
  triggerRef,
  onClose,
}: {
  open: boolean;
  drawerRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[55] bg-cf-charcoal/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Drawer */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        data-state={open ? "open" : "closed"}
        className={[
          "fixed inset-y-0 left-0 z-[56] flex w-80 flex-col bg-gradient-to-b from-cf-header-start to-cf-header-end shadow-xl transition-transform duration-200 sm:w-72 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Drawer header — cf-jo07: brand mark + wordmark match the site
            header lockup so the drawer feels continuous with the chrome
            it slid out of. Logo at size-9 fits the cf-header-main row. */}
        <div className="flex h-cf-header-main items-center justify-between border-b border-cf-divider/60 px-4">
          <Link
            href="/"
            onClick={onClose}
            aria-label="Carolina Futons — home"
            className="flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src="/brand/cf-logo-square.png"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-sm"
            />
            <span className="font-heading text-xl font-semibold tracking-tight text-cf-navy">
              Carolina Futons
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => {
              onClose();
              triggerRef.current?.focus();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-cf-charcoal hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Primary nav */}
        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-1" role="list">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block rounded-md px-3 py-2.5 text-base font-medium text-cf-charcoal transition-colors hover:bg-cf-sand hover:text-cf-cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="my-4 border-t border-cf-divider/60" aria-hidden="true" />

          {/* Sub-nav */}
          <ul className="space-y-1" role="list">
            {SUB_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wider text-cf-charcoal/80 transition-colors hover:bg-cf-sand hover:text-cf-cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
