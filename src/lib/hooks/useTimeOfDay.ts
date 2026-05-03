"use client";

import { useEffect, useRef, useState } from "react";

export type Phase = "night" | "dawn" | "day" | "dusk";

export function getPhase(h: number): Phase {
  if (h < 5 || h >= 20) return "night";
  if (h < 7) return "dawn";
  if (h < 17) return "day";
  return "dusk";
}

export type TimeOfDayState = {
  phase: Phase;
  time: number;
  reduceMotion: boolean;
  mounted: boolean;
};

export function useTimeOfDay(): TimeOfDayState {
  const [phase, setPhase] = useState<Phase>("day");
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client seed
    setPhase(getPhase(new Date().getHours()));
    setMounted(true);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client seed
    setReduceMotion(mq.matches);
    const onMotion = () => setReduceMotion(mq.matches);
    mq.addEventListener?.("change", onMotion);

    const id = setInterval(() => {
      setPhase(getPhase(new Date().getHours()));
    }, 60_000);

    if (!mq.matches) {
      const start = performance.now();
      const tick = (now: number) => {
        setTime((now - start) / 1000);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      clearInterval(id);
      mq.removeEventListener?.("change", onMotion);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { phase, time, reduceMotion, mounted };
}
