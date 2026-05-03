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

// trackTime: enable the ~60Hz RAF loop that increments `time`.
// Only components that drive sub-second animations (VintageSunRays, StargazingHero)
// need it. Pass false (the default) to skip the RAF entirely and save ~60 setState
// calls per second.
export function useTimeOfDay({ trackTime = false }: { trackTime?: boolean } = {}): TimeOfDayState {
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

    const startRaf = (startTime: number) => {
      const tick = (now: number) => {
        setTime((now - startTime) / 1000);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (trackTime && !mq.matches) startRaf(performance.now());

    const onMotion = () => {
      setReduceMotion(mq.matches);
      if (!trackTime) return;
      if (mq.matches) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!rafRef.current) {
        startRaf(performance.now());
      }
    };
    mq.addEventListener("change", onMotion);

    const id = setInterval(() => {
      setPhase(getPhase(new Date().getHours()));
    }, 60_000);

    return () => {
      clearInterval(id);
      mq.removeEventListener("change", onMotion);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [trackTime]);

  return { phase, time, reduceMotion, mounted };
}
