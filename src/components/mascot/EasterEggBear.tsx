"use client";
import { useSyncExternalStore, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { V3_PAL as c } from "./MascotPalette";
import { Bear } from "./MascotCharacters";

const DISCOUNT_CODE = "BEAR10";
const emptySubscribe = () => () => {};

// Shared positioning: fixed, centered, above mobile browser chrome + safe area.
// Portal to document.body so position:fixed escapes any CSS-transformed ancestor
// in the page tree (transforms create a new containing block for fixed elements).
const PORTAL_BASE: React.CSSProperties = {
  position: "fixed",
  // 80px ≈ mobile browser chrome height; safe-area-inset-bottom handles notch.
  bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
  left: "50%",
  width: "min(320px, 90vw)",
  zIndex: 9999,
};

export function EasterEggBear() {
  const [found, setFound] = useState(false);
  const [claimed, setClaimed] = useState(false);
  // false on SSR (document undefined), true after hydration — portal is client-only.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      aria-label="Hidden bear — click to claim 10% off"
    >
      <button
        onClick={() => setFound(true)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "block",
        }}
        aria-label="Peek-a-boo bear"
      >
        <svg
          viewBox="-80 -20 160 120"
          style={{ width: 80, display: "block" }}
          aria-hidden="true"
        >
          <Bear pose="peeking" scale={1} />
        </svg>
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {found && !claimed && (
            <motion.div
              key="bear-modal"
              // x stays constant at -50% to center over left:50% without
              // conflicting with framer-motion's own transform compositor.
              initial={{ x: "-50%", opacity: 0, scale: 0.8, y: 12 }}
              animate={{ x: "-50%", opacity: 1, scale: 1, y: 0 }}
              exit={{ x: "-50%", opacity: 0, scale: 0.8, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{
                ...PORTAL_BASE,
                background: c.paperWarm,
                border: `1.5px solid ${c.ink}`,
                borderRadius: 10,
                padding: "12px 16px",
                fontFamily: "var(--font-source-sans)",
                fontSize: 13,
                color: c.ink,
                boxShadow: "0 8px 32px rgba(58,37,24,.22)",
              }}
            >
              <p style={{ fontWeight: 700, marginBottom: 4 }}>You found the bear! 🐻</p>
              <p style={{ opacity: 0.75, marginBottom: 8 }}>10% off your order:</p>
              <code
                style={{
                  display: "block",
                  background: c.ink,
                  color: c.cream,
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontFamily: "monospace",
                  letterSpacing: ".08em",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {DISCOUNT_CODE}
              </code>
              <button
                type="button"
                onClick={() => setClaimed(true)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  opacity: 0.5,
                  fontFamily: "var(--font-source-sans)",
                }}
              >
                Dismiss
              </button>
            </motion.div>
          )}
          {claimed && (
            <motion.div
              key="bear-confirmed"
              initial={{ x: "-50%", opacity: 0 }}
              animate={{ x: "-50%", opacity: 0.6 }}
              exit={{ x: "-50%", opacity: 0 }}
              style={{
                ...PORTAL_BASE,
                width: "auto",
                fontFamily: "var(--font-source-sans)",
                fontSize: 12,
                color: c.ink,
              }}
            >
              Code saved ✓
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
