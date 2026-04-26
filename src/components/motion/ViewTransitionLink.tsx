"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";

type Props = ComponentPropsWithoutRef<typeof Link>;

// Wraps Next.js <Link> to intercept plain clicks and run the navigation inside
// document.startViewTransition when available. Modified clicks (cmd/ctrl/shift)
// are passed through unmodified so browser defaults (new tab, download) work.
// Falls back to router.push when the API is absent or reduced-motion is on.
export function ViewTransitionLink({ href, onClick, children, ...rest }: Props) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion() ?? false;

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      onClick?.(e);
      return;
    }
    e.preventDefault();
    onClick?.(e);

    const target = String(href);
    if (
      prefersReducedMotion ||
      typeof document === "undefined" ||
      !("startViewTransition" in document)
    ) {
      router.push(target);
      return;
    }
    document.startViewTransition(() => router.push(target));
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
