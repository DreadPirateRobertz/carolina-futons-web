"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { V3_PAL as c } from "./MascotPalette";
import { Bear } from "./MascotCharacters";

const DISCOUNT_CODE = "BEAR10";

export function EasterEggBear() {
  const [found, setFound] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleDismiss() {
    try {
      await navigator.clipboard.writeText(DISCOUNT_CODE);
      setCopied(true);
    } catch {
      // clipboard denied — dismiss silently
    }
    setClaimed(true);
  }

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

      <AnimatePresence>
        {found && !claimed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{
              position: "fixed",
              bottom: 120,
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(320px, 90vw)",
              background: c.paperWarm,
              border: `1.5px solid ${c.ink}`,
              borderRadius: 10,
              padding: "12px 16px",
              fontFamily: "var(--font-source-sans)",
              fontSize: 13,
              color: c.ink,
              zIndex: 9999,
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
              onClick={handleDismiss}
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
              Copy &amp; dismiss
            </button>
          </motion.div>
        )}
        {claimed && copied && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              bottom: 120,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-source-sans)",
              fontSize: 12,
              color: c.ink,
              opacity: 0.6,
            }}
          >
            Copied to clipboard ✓
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
