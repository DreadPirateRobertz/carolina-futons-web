"use client";

import { m, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";


// App Router gives us usePathname() which updates once navigation commits —
// there's no router.events to observe the start edge. So we animate the bar
// as a "flash" triggered by pathname change: scaleX 0→1 then fade out. Users
// perceive the bar during the re-render/hydration window that follows a
// route commit, which is exactly the span where a progress indicator helps.
//
// Respects prefers-reduced-motion by rendering the bar but skipping the
// animation entirely — aria-hidden and an invisible transform keep the
// indicator silent for users who opted out of motion.
const ANIMATION_DURATION_SECONDS = 0.5;
const FADE_OUT_DELAY_MS = 500;

export function RouteProgressBar() {
  // usePathname() can momentarily be null during SSR / error boundaries —
  // coerce so the data attribute and animation key stay stable.
  const pathname = usePathname() ?? "";
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // React's recommended pattern for "reset state when input changes":
  // compare during render and call setState, which replaces re-renders
  // inside an effect (see react.dev/learn/you-might-not-need-an-effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (!prefersReducedMotion) setVisible(true);
  }

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(
      () => setVisible(false),
      FADE_OUT_DELAY_MS + ANIMATION_DURATION_SECONDS * 1000,
    );
    return () => window.clearTimeout(id);
  }, [visible]);

  return (
    <div
      data-slot="route-progress-bar"
      data-pathname={pathname}
      data-state={visible ? "animating" : "idle"}
      role="progressbar"
      aria-label="Page load progress"
      aria-hidden={!visible}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <m.div
        key={pathname}
        className="h-full origin-left bg-cf-cta"
        initial={{ scaleX: 0, opacity: 1 }}
        animate={
          visible
            ? { scaleX: 1, opacity: 1 }
            : { scaleX: 1, opacity: 0 }
        }
        transition={{
          scaleX: { duration: ANIMATION_DURATION_SECONDS, ease: "easeOut" },
          opacity: { duration: 0.2, delay: visible ? 0 : 0 },
        }}
      />
    </div>
  );
}
