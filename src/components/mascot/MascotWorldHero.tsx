"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { V3_PAL as c } from "./MascotPalette";
import { Bear, Deer, Heron, Hummingbird, Pine, Cloud } from "./MascotCharacters";

export function MascotWorldHero() {
  const ref = useRef<SVGSVGElement>(null);
  const [eyes, setEyes] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.45;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy) || 1;
      setEyes({ x: (dx / d) * 2.5, y: (dy / d) * 1.8 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const blinkLoop = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
      timer = setTimeout(blinkLoop, 2400 + Math.random() * 2800);
    };
    timer = setTimeout(blinkLoop, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      setTime((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 1920 800"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%" }}
      data-slot="mascot-world-hero"
      aria-label="Blue Ridge sunset with a sitting bear, deer, heron, and hummingbird"
    >
      <defs>
        <linearGradient id="mwh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.sky2} />
          <stop offset="50%" stopColor={c.sky1} />
          <stop offset="100%" stopColor={c.sunGlow} />
        </linearGradient>
        <radialGradient id="mwh-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c.cream} stopOpacity="1" />
          <stop offset="50%" stopColor={c.sun} stopOpacity="0.6" />
          <stop offset="100%" stopColor={c.sun} stopOpacity="0" />
        </radialGradient>
        <filter id="mwh-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={3} />
          <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.10  0 0 0 0 0.06  0 0 0 0.18 0" />
        </filter>
      </defs>

      <rect width="1920" height="800" fill="url(#mwh-sky)" />

      {/* Sun — floats gently, enters with a slow fade-scale */}
      <motion.g
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
      >
        <g transform={`translate(1380 ${260 + Math.sin(time * 0.4) * 4})`}>
          <circle r="220" fill="url(#mwh-sun)" />
          <circle r="78" fill={c.cream} />
          <circle r="78" fill={c.sun} opacity="0.6" />
        </g>
      </motion.g>

      {/* Hummingbird */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
      >
        <g transform={`translate(${1100 + Math.sin(time * 0.6) * 30} ${200 + Math.cos(time * 0.7) * 20})`}>
          <Hummingbird scale={1.6} />
        </g>
      </motion.g>

      {/* Ridges — staggered entrance from bottom */}
      <motion.g
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
      >
        <path d="M 0 360 Q 240 330 480 345 Q 720 360 960 320 Q 1200 280 1440 335 Q 1680 390 1920 350 L 1920 800 L 0 800 Z" fill={c.ridge5} opacity="0.85" />
        <path d="M 0 420 Q 200 380 400 405 Q 600 430 800 390 Q 1040 350 1240 410 Q 1480 470 1680 420 L 1920 415 L 1920 800 L 0 800 Z" fill={c.ridge4} />
        <rect x="0" y="418" width="1920" height="20" fill={c.cream} opacity="0.18" />
      </motion.g>
      <motion.g
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.35 }}
      >
        <path d="M 0 480 Q 240 440 480 460 Q 720 480 960 445 Q 1200 410 1440 465 Q 1680 525 1920 485 L 1920 800 L 0 800 Z" fill={c.ridge3} />
        <path d="M 0 540 Q 200 510 400 525 Q 600 540 800 510 Q 1040 475 1240 525 Q 1480 575 1680 540 L 1920 535 L 1920 800 L 0 800 Z" fill={c.ridge2} />
      </motion.g>
      <motion.g
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.5 }}
      >
        <path d="M 0 640 Q 240 600 480 615 Q 720 630 960 595 Q 1200 565 1440 615 Q 1680 660 1920 625 L 1920 800 L 0 800 Z" fill={c.ridge1} />
        <g transform="translate(0 580)">
          {[80, 240, 380, 1320, 1500, 1680, 1820].map((x, i) => (
            <g key={i} transform={`translate(${x} ${Math.sin(i * 1.4) * 8})`}>
              <Pine scale={0.9 + (i % 3) * 0.2} />
            </g>
          ))}
        </g>
        <g transform="translate(220 500) scale(0.6)" opacity="0.75">
          <Deer />
        </g>
        <g transform="translate(1620 540)">
          <Heron scale={1} />
        </g>
      </motion.g>

      {/* The bear — slides up from below, then eyes track cursor */}
      <motion.g
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.7 }}
      >
        <g transform="translate(960 670)">
          <Bear pose="sitting" scale={2.4} eyesTrack={eyes} blink={blink} />
        </g>
      </motion.g>

      {/* Drifting clouds */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      >
        <g transform={`translate(${((time * 15) % 2200) - 200} 130)`}>
          <Cloud scale={1.2} />
        </g>
        <g transform={`translate(${((time * 10 + 600) % 2200) - 200} 200)`} opacity="0.82">
          <Cloud scale={0.9} />
        </g>
        <g transform={`translate(${((time * 8 + 1200) % 2200) - 200} 90)`} opacity="0.7">
          <Cloud scale={0.7} />
        </g>
      </motion.g>

      {/* Birds */}
      <g stroke={c.ink} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7">
        <path d={`M ${480 + Math.sin(time * 0.5) * 4} 180 Q 490 174 500 180 Q 510 174 520 180`} />
        <path d={`M 540 210 Q 548 204 556 210 Q 564 204 572 210`} />
      </g>

      <rect
        width="1920"
        height="800"
        filter="url(#mwh-grain)"
        opacity="0.4"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
