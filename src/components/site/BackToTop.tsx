"use client";

import { AnimatePresence, m } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

// Button appears after the user scrolls past this threshold. 400px matches
// a one-viewport scroll on most desktop sizes and is far enough down on
// mobile that the button isn't visible until the user actually needs it.
const SHOW_AFTER_PX = 400;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }
    // Prime state on mount in case the user lands deep-scrolled (hash link,
    // restored scroll).
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <AnimatePresence>
      {visible && (
        <m.button
          key="back-to-top"
          type="button"
          data-slot="back-to-top"
          aria-label="Back to top"
          onClick={scrollToTop}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-cf-cta text-cf-cream shadow-lg transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
          <span className="sr-only">Back to top</span>
        </m.button>
      )}
    </AnimatePresence>
  );
}
