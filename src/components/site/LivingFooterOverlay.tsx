"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  computeLivingSky,
  totalMinutesNow,
} from "@/lib/illustrations/living-sky";

type Atmosphere = {
  gradTop: string;
  gradBottom: string;
  starOpacity: number;
};

function derive(): Atmosphere {
  const s = computeLivingSky(totalMinutesNow());
  return {
    gradTop: s.skyColors[1],
    gradBottom: s.skyColors[3],
    starOpacity: s.starOpacity,
  };
}

// Deterministic star positions scattered across the footer.
const STARS: Array<{ x: string; y: string }> = [
  { x: "8%",  y: "20%" }, { x: "23%", y: "65%" }, { x: "41%", y: "15%" },
  { x: "55%", y: "75%" }, { x: "70%", y: "30%" }, { x: "84%", y: "55%" },
  { x: "34%", y: "48%" }, { x: "62%", y: "8%"  }, { x: "90%", y: "72%" },
  { x: "17%", y: "38%" }, { x: "78%", y: "88%" }, { x: "48%", y: "82%" },
];

export function LivingFooterOverlay() {
  const reduceMotion = useReducedMotion();
  const [atmos, setAtmos] = useState<Atmosphere | null>(null);

  useEffect(() => {
    setAtmos(derive());
    const id = setInterval(() => setAtmos(derive()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!atmos) return null;

  return (
    <>
      {/* Sky tint — 30% opacity over the dark footer bg keeps cream text legible */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${atmos.gradTop}, ${atmos.gradBottom})`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 3, ease: "easeOut" }}
        aria-hidden="true"
      />

      {/* Star field — only visible at dusk/night */}
      {atmos.starOpacity > 0.15 && !reduceMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: atmos.starOpacity * 0.45 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          aria-hidden="true"
        >
          {STARS.map(({ x, y }, i) => (
            <motion.span
              key={i}
              className="absolute inline-block h-0.5 w-0.5 rounded-full bg-white"
              style={{ left: x, top: y }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 2.5 + (i % 4) * 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.25,
              }}
            />
          ))}
        </motion.div>
      )}
    </>
  );
}
