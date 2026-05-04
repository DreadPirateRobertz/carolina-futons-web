"use client";

import { useEffect, useRef, useState } from "react";

import { LIVING_SKY_SVG_BODY } from "@/lib/illustrations/living-sky-svg";
import {
  MIDNIGHT_MINUTES,
  NOON_MINUTES,
  totalMinutesNow,
  computeLivingSky,
  type LivingSkyState,
} from "@/lib/illustrations/living-sky";

// cf-93rb-livingsky-dynamic.
//
// Mounts the inline Living Sky SVG body and wires the time-of-day engine
// to the SVG element IDs at runtime. Mirrors the postMessage handler in
// cfutons/src/public/living-sky-component.html — same setStop/setOpacity/
// setPos/setAttr/setFill helpers, scoped to the component's own subtree
// so multiple instances on the same page can't collide on element IDs.
//
// Lifecycle:
// 1. SSR + first paint → SVG renders with its midday default attrs.
// 2. On mount → applyState(computeLivingSky(now)) immediately so first
//    visible state matches the wall clock.
// 3. setInterval(60s) → re-apply with the new minute. 60s is enough
//    for the 16-keyframe schedule to feel live without burning frames.
// 4. prefers-reduced-motion → skip the interval, freeze on the noon
//    state matching the SSR baseline (no surprise jumps for users with
//    motion sensitivity, no flicker on mount).
// 5. cf-wzl3: dark mode → freeze on midnight regardless of wall clock so
//    the sky always shows night sky when the site dark theme is active.
//    A MutationObserver on <html>.classList re-triggers the effect when
//    the user toggles the theme toggle in the header.
//
// We deliberately use document.getElementById-style queries scoped to
// the container ref rather than React refs per element — the SVG body
// has ~80 dynamic elements and a ref per element would balloon the
// component. Subtree querying matches the original Velo behavior and
// keeps the JSX trivial.

const TICK_INTERVAL_MS = 60_000;

function applyState(root: HTMLElement | SVGElement, s: LivingSkyState): void {
  const setStop = (id: string, color: string) => {
    const el = root.querySelector(`#${id}`);
    if (el) el.setAttribute("stop-color", color);
  };
  const setOpacity = (id: string, opacity: number) => {
    const el = root.querySelector(`#${id}`);
    if (el) el.setAttribute("opacity", String(opacity));
  };
  const setPos = (id: string, cx: number, cy: number) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.setAttribute("cx", String(cx));
    el.setAttribute("cy", String(cy));
  };
  const setAttr = (id: string, attr: string, val: number | string) => {
    const el = root.querySelector(`#${id}`);
    if (el) el.setAttribute(attr, String(val));
  };
  const setFill = (id: string, color: string) => {
    const el = root.querySelector(`#${id}`);
    if (el) el.setAttribute("fill", color);
  };

  setStop("sky-stop-0", s.skyColors[0]);
  setStop("sky-stop-1", s.skyColors[1]);
  setStop("sky-stop-2", s.skyColors[2]);
  setStop("sky-stop-3", s.skyColors[3]);

  setStop("sg-0", s.glowColors[0]);
  setStop("sg-1", s.glowColors[1]);

  const r = s.ridgeColors;
  setStop("r4-stop-0", r.r4); setStop("r4-stop-1", r.r4);
  setStop("r3-stop-0", r.r3); setStop("r3-stop-1", r.r3);
  setStop("r2-stop-0", r.r2); setStop("r2-stop-1", r.r2);
  setStop("r1-stop-0", r.r1); setStop("r1-stop-1", r.r1);
  setFill("tree-line", r.tree);
  setFill("deciduous-trees", r.tree);

  const sp = s.sunPos;
  setPos("sun-disc",       sp.cx, sp.cy);
  setPos("sun-halo-inner", sp.cx, sp.cy);
  setPos("sun-halo-outer", sp.cx, sp.cy);
  setAttr("sun-disc",       "r", sp.r);
  setAttr("sun-halo-inner", "r", sp.r * 1.7);
  setAttr("sun-halo-outer", "r", sp.r * 2.8);
  setOpacity("sun-disc",       sp.opacity);
  setOpacity("sun-halo-inner", sp.opacity * 0.25);
  setOpacity("sun-halo-outer", sp.opacity * 0.15);

  const mp = s.moonPos;
  setOpacity("moon-group", mp.opacity);
  setPos("moon-disc",      mp.cx, mp.cy);
  setPos("moon-glow-ring", mp.cx, mp.cy);
  setPos(
    "moon-phase-shadow",
    mp.cx + mp.shadowOffset.dx,
    mp.cy + mp.shadowOffset.dy,
  );

  setOpacity("stars",         s.starOpacity);
  setOpacity("clouds",        s.cloudOpacity);
  setOpacity("bird-group",    s.birdOpacity);
  setOpacity("vulture-group", s.birdOpacity);
  setOpacity("owl-sweep",     s.owlOpacity);
  setOpacity("owl-perch",     s.owlOpacity);
  setOpacity("firefly-group", s.fireflyOpacity);
  setOpacity("fog",           s.precipitationOpacity);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function LivingSkyClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Track reduced-motion as state so a user toggle in OS settings is
  // picked up on next render without a full reload. The init function
  // seeds from the current matchMedia value so the first render after
  // hydration is already correct — no setState-in-effect needed for the
  // initial value.
  const [reduced, setReduced] = useState<boolean>(prefersReducedMotion);
  // cf-wzl3: track dark mode so the sky freezes on night state when
  // the user has the dark theme active. Seeds from current DOM state
  // so hydration matches server render intent.
  const [dark, setDark] = useState<boolean>(isDarkMode);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // cf-wzl3: watch <html> classList changes so toggling the theme
  // toggle in the header re-runs the sky effect immediately.
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const svg = root.querySelector("svg") as SVGSVGElement | null;

    if (reduced) {
      applyState(root, computeLivingSky(NOON_MINUTES));
      svg?.pauseAnimations?.();
      return;
    }

    if (dark) {
      // Dark mode: freeze on midnight — full stars, fireflies, owl, moon.
      applyState(root, computeLivingSky(MIDNIGHT_MINUTES));
      svg?.pauseAnimations?.();
      return;
    }

    svg?.unpauseAnimations?.();
    const tick = () => applyState(root, computeLivingSky(totalMinutesNow()));
    tick();
    const id = window.setInterval(tick, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduced, dark]);

  return (
    <div
      ref={containerRef}
      data-slot="living-sky-svg"
      className="pointer-events-none h-full w-full select-none leading-none"
      // The SVG body comes from a TS string constant lifted verbatim
      // from the Velo source; it is fully developer-controlled, no user
      // input flows into it.
      dangerouslySetInnerHTML={{ __html: LIVING_SKY_SVG_BODY }}
    />
  );
}
