import { V3_PAL as c } from "./MascotPalette";

type EyesOffset = { x: number; y: number };

// ── Bear ───────────────────────────────────────────────────────
type BearPose = "sitting" | "peeking" | "sleeping";
type BearProps = {
  pose?: BearPose;
  scale?: number;
  flip?: boolean;
  eyesTrack?: EyesOffset | null;
  blink?: boolean;
};

export function Bear({
  pose = "sitting",
  scale = 1,
  flip = false,
  eyesTrack = null,
  blink = false,
}: BearProps) {
  const eyeDX = eyesTrack ? Math.max(-2, Math.min(2, eyesTrack.x)) : 0;
  const eyeDY = eyesTrack ? Math.max(-1.5, Math.min(1.5, eyesTrack.y)) : 0;

  if (pose === "sitting") {
    return (
      <g transform={`scale(${flip ? -scale : scale} ${scale})`}>
        <ellipse cx="0" cy="62" rx="48" ry="6" fill={c.ink} opacity="0.18" />
        <ellipse cx="0" cy="30" rx="38" ry="34" fill={c.bearFur} />
        <ellipse cx="0" cy="40" rx="22" ry="20" fill={c.bearFurLight} opacity="0.6" />
        <ellipse cx="-22" cy="55" rx="14" ry="10" fill={c.bearFur} />
        <ellipse cx="22" cy="55" rx="14" ry="10" fill={c.bearFur} />
        <ellipse cx="-22" cy="58" rx="8" ry="4" fill={c.bearMuzzle} opacity="0.5" />
        <ellipse cx="22" cy="58" rx="8" ry="4" fill={c.bearMuzzle} opacity="0.5" />
        <ellipse cx="-30" cy="20" rx="10" ry="22" fill={c.bearFur} transform="rotate(-15 -30 20)" />
        <ellipse cx="30" cy="20" rx="10" ry="22" fill={c.bearFur} transform="rotate(15 30 20)" />
        <ellipse cx="0" cy="-12" rx="28" ry="26" fill={c.bearFur} />
        <circle cx="-22" cy="-30" r="9" fill={c.bearFur} />
        <circle cx="22" cy="-30" r="9" fill={c.bearFur} />
        <circle cx="-22" cy="-30" r="5" fill={c.bearMuzzle} opacity="0.7" />
        <circle cx="22" cy="-30" r="5" fill={c.bearMuzzle} opacity="0.7" />
        <ellipse cx="0" cy="-2" rx="14" ry="11" fill={c.bearMuzzle} />
        <ellipse cx="0" cy="-8" rx="4" ry="3" fill={c.bearNose} />
        <path d="M -4 -3 Q 0 0 4 -3" fill="none" stroke={c.bearNose} strokeWidth="1.5" strokeLinecap="round" />
        {blink ? (
          <>
            <path d="M -14 -16 q 4 0 6 -1" fill="none" stroke={c.bearNose} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 14 -16 q -4 0 -6 -1" fill="none" stroke={c.bearNose} strokeWidth="1.6" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx={-11 + eyeDX} cy={-16 + eyeDY} r="2.8" fill={c.bearNose} />
            <circle cx={11 + eyeDX} cy={-16 + eyeDY} r="2.8" fill={c.bearNose} />
            <circle cx={-10 + eyeDX} cy={-17 + eyeDY} r="0.8" fill={c.cream} />
            <circle cx={12 + eyeDX} cy={-17 + eyeDY} r="0.8" fill={c.cream} />
          </>
        )}
      </g>
    );
  }
  if (pose === "peeking") {
    return (
      <g transform={`scale(${flip ? -scale : scale} ${scale})`}>
        <ellipse cx="0" cy="20" rx="40" ry="18" fill={c.bearFur} />
        <ellipse cx="0" cy="0" rx="32" ry="28" fill={c.bearFur} />
        <circle cx="-26" cy="-18" r="10" fill={c.bearFur} />
        <circle cx="26" cy="-18" r="10" fill={c.bearFur} />
        <circle cx="-26" cy="-18" r="5" fill={c.bearMuzzle} opacity="0.7" />
        <circle cx="26" cy="-18" r="5" fill={c.bearMuzzle} opacity="0.7" />
        <ellipse cx="0" cy="10" rx="16" ry="13" fill={c.bearMuzzle} />
        <ellipse cx="0" cy="3" rx="5" ry="4" fill={c.bearNose} />
        {blink ? (
          <>
            <path d="M -16 -6 q 5 0 7 -1" fill="none" stroke={c.bearNose} strokeWidth="2" strokeLinecap="round" />
            <path d="M 16 -6 q -5 0 -7 -1" fill="none" stroke={c.bearNose} strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx={-13 + eyeDX} cy={-6 + eyeDY} r="3.2" fill={c.bearNose} />
            <circle cx={13 + eyeDX} cy={-6 + eyeDY} r="3.2" fill={c.bearNose} />
            <circle cx={-12 + eyeDX} cy={-7 + eyeDY} r="1" fill={c.cream} />
            <circle cx={14 + eyeDX} cy={-7 + eyeDY} r="1" fill={c.cream} />
          </>
        )}
      </g>
    );
  }
  if (pose === "sleeping") {
    return (
      <g transform={`scale(${flip ? -scale : scale} ${scale})`}>
        <ellipse cx="0" cy="20" rx="58" ry="22" fill={c.bearFur} />
        <ellipse cx="-50" cy="6" rx="22" ry="18" fill={c.bearFur} />
        <circle cx="-66" cy="-8" r="7" fill={c.bearFur} />
        <ellipse cx="-50" cy="14" rx="10" ry="6" fill={c.bearMuzzle} />
        <ellipse cx="-58" cy="10" rx="3" ry="2" fill={c.bearNose} />
        <path d="M -56 0 q 4 0 6 -1" fill="none" stroke={c.bearNose} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M -42 -2 q 4 0 6 -1" fill="none" stroke={c.bearNose} strokeWidth="1.5" strokeLinecap="round" />
        <text x="20" y="-20" fontFamily="Playfair Display, serif" fontSize="14" fontWeight="700" fill={c.bearNose} opacity="0.7">z</text>
        <text x="32" y="-30" fontFamily="Playfair Display, serif" fontSize="18" fontWeight="700" fill={c.bearNose} opacity="0.6">z</text>
        <text x="48" y="-44" fontFamily="Playfair Display, serif" fontSize="22" fontWeight="700" fill={c.bearNose} opacity="0.5">Z</text>
      </g>
    );
  }
  return null;
}

// ── Deer ────────────────────────────────────────────────────────
export function Deer({ scale = 1, flip = false }: { scale?: number; flip?: boolean }) {
  return (
    <g transform={`scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx="0" cy="35" rx="3" ry="3" fill={c.ink} opacity="0.2" />
      <ellipse cx="22" cy="35" rx="3" ry="3" fill={c.ink} opacity="0.2" />
      <ellipse cx="10" cy="0" rx="28" ry="16" fill={c.deer} />
      <circle cx="2" cy="-4" r="2" fill={c.deerSpot} opacity="0.6" />
      <circle cx="14" cy="-2" r="1.8" fill={c.deerSpot} opacity="0.6" />
      <circle cx="22" cy="-6" r="2" fill={c.deerSpot} opacity="0.6" />
      <circle cx="8" cy="4" r="1.5" fill={c.deerSpot} opacity="0.6" />
      <rect x="-8" y="10" width="3" height="22" fill={c.deer} />
      <rect x="0" y="10" width="3" height="22" fill={c.deer} />
      <rect x="20" y="10" width="3" height="22" fill={c.deer} />
      <rect x="28" y="10" width="3" height="22" fill={c.deer} />
      <ellipse cx="-18" cy="-2" rx="4" ry="3" fill={c.deerSpot} />
      <path d="M 30 -8 Q 38 -22 42 -28 L 38 -28 Q 32 -18 24 -10 Z" fill={c.deer} />
      <ellipse cx="42" cy="-30" rx="9" ry="6" fill={c.deer} />
      <ellipse cx="48" cy="-29" rx="3" ry="2" fill={c.bearMuzzle} />
      <ellipse cx="38" cy="-36" rx="2.5" ry="5" fill={c.deer} transform="rotate(-20 38 -36)" />
      <circle cx="44" cy="-31" r="1" fill={c.ink} />
      <path d="M 40 -36 L 38 -44 M 38 -44 L 36 -42 M 38 -44 L 40 -42" stroke={c.bearMuzzle} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M 44 -36 L 46 -44 M 46 -44 L 48 -42 M 46 -44 L 44 -42" stroke={c.bearMuzzle} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

// ── Fox ─────────────────────────────────────────────────────────
export function Fox({ scale = 1, flip = false }: { scale?: number; flip?: boolean }) {
  return (
    <g transform={`scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx="0" cy="22" rx="32" ry="4" fill={c.ink} opacity="0.18" />
      <path d="M -22 5 Q -42 -2 -50 -18 Q -42 -8 -28 0 Z" fill={c.fox} />
      <path d="M -42 -10 Q -48 -16 -50 -18 L -46 -12 Z" fill={c.foxWhite} />
      <ellipse cx="0" cy="5" rx="22" ry="14" fill={c.fox} />
      <ellipse cx="0" cy="14" rx="14" ry="6" fill={c.foxWhite} />
      <rect x="-10" y="14" width="3" height="10" fill={c.foxDark} />
      <rect x="-2" y="14" width="3" height="10" fill={c.foxDark} />
      <rect x="8" y="14" width="3" height="10" fill={c.foxDark} />
      <rect x="14" y="14" width="3" height="10" fill={c.foxDark} />
      <path d="M 16 0 Q 30 -8 40 -2 Q 38 6 30 10 Q 22 8 16 4 Z" fill={c.fox} />
      <path d="M 30 0 Q 36 2 40 -2 Q 36 -1 32 0 Z" fill={c.foxWhite} />
      <polygon points="20,-8 24,-2 18,-2" fill={c.fox} />
      <polygon points="20,-8 23,-4 19.5,-4" fill={c.foxDark} />
      <polygon points="32,-10 36,-4 30,-4" fill={c.fox} />
      <polygon points="32,-10 35,-6 31.5,-6" fill={c.foxDark} />
      <circle cx="28" cy="0" r="1.5" fill={c.foxDark} />
      <circle cx="40" cy="-1" r="1.5" fill={c.foxDark} />
    </g>
  );
}

// ── Owl ─────────────────────────────────────────────────────────
type OwlProps = { scale?: number; blink?: boolean; eyesTrack?: EyesOffset | null };
export function Owl({ scale = 1, blink = false, eyesTrack = null }: OwlProps) {
  const eyeDX = eyesTrack ? Math.max(-1.5, Math.min(1.5, eyesTrack.x)) : 0;
  const eyeDY = eyesTrack ? Math.max(-1, Math.min(1, eyesTrack.y)) : 0;
  return (
    <g transform={`scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="20" ry="24" fill={c.owl} />
      <path d="M -12 0 q 6 4 12 0 q -6 -4 -12 0 Z" fill={c.owlLight} />
      <path d="M -10 8 q 5 3 10 0 q -5 -3 -10 0 Z" fill={c.owlLight} />
      <path d="M -8 16 q 4 2 8 0 q -4 -2 -8 0 Z" fill={c.owlLight} />
      <ellipse cx="-16" cy="2" rx="6" ry="14" fill={c.owl} transform="rotate(-15 -16 2)" />
      <ellipse cx="16" cy="2" rx="6" ry="14" fill={c.owl} transform="rotate(15 16 2)" />
      <polygon points="-12,-22 -16,-30 -8,-26" fill={c.owl} />
      <polygon points="12,-22 16,-30 8,-26" fill={c.owl} />
      <circle cx="-7" cy="-12" r="9" fill={c.owlLight} />
      <circle cx="7" cy="-12" r="9" fill={c.owlLight} />
      {blink ? (
        <>
          <path d="M -11 -12 q 4 1 8 0" fill="none" stroke={c.ink} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 3 -12 q 4 1 8 0" fill="none" stroke={c.ink} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="-7" cy="-12" r="5" fill={c.owlEye} />
          <circle cx="7" cy="-12" r="5" fill={c.owlEye} />
          <circle cx={-7 + eyeDX} cy={-12 + eyeDY} r="2.5" fill={c.ink} />
          <circle cx={7 + eyeDX} cy={-12 + eyeDY} r="2.5" fill={c.ink} />
          <circle cx={-6 + eyeDX} cy={-13 + eyeDY} r="0.8" fill={c.cream} />
          <circle cx={8 + eyeDX} cy={-13 + eyeDY} r="0.8" fill={c.cream} />
        </>
      )}
      <polygon points="0,-6 -3,-2 3,-2" fill={c.bearMuzzle} />
      <path d="M -4 22 v 4 m -2 -1 h 4 M 4 22 v 4 m -2 -1 h 4" stroke={c.bearMuzzle} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

// ── Heron ────────────────────────────────────────────────────────
export function Heron({ scale = 1, flip = false }: { scale?: number; flip?: boolean }) {
  return (
    <g transform={`scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx="0" cy="48" rx="14" ry="3" fill={c.ink} opacity="0.2" />
      <line x1="-2" y1="20" x2="-4" y2="48" stroke={c.bearMuzzle} strokeWidth="1.5" />
      <line x1="4" y1="20" x2="2" y2="48" stroke={c.bearMuzzle} strokeWidth="1.5" />
      <path d="M -4 48 l -3 0 m 3 0 l 3 0" stroke={c.bearMuzzle} strokeWidth="1.5" />
      <path d="M 2 48 l -3 0 m 3 0 l 3 0" stroke={c.bearMuzzle} strokeWidth="1.5" />
      <ellipse cx="0" cy="14" rx="14" ry="10" fill={c.heron} />
      <ellipse cx="-4" cy="16" rx="10" ry="6" fill={c.heronLight} />
      <path d="M -2 8 Q 8 4 14 12 Q 6 16 -2 14 Z" fill={c.heron} stroke={c.ridge1} strokeWidth="0.4" />
      <path d="M 6 8 Q 10 -2 6 -10 Q 2 -18 8 -26" fill="none" stroke={c.heron} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="9" cy="-28" rx="4" ry="3" fill={c.heron} />
      <line x1="11" y1="-28" x2="20" y2="-28" stroke={c.heronBeak} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="-28" r="0.8" fill={c.ink} />
      <path d="M 7 -32 Q 4 -36 2 -34" fill="none" stroke={c.heron} strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

// ── Hummingbird ──────────────────────────────────────────────────
export function Hummingbird({ scale = 1, flip = false }: { scale?: number; flip?: boolean }) {
  return (
    <g transform={`scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx="-2" cy="-2" rx="14" ry="5" fill={c.heron} opacity="0.35">
        <animate attributeName="ry" values="5;3;5" dur="0.18s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="-2" cy="-2" rx="12" ry="3" fill={c.heronLight} opacity="0.5">
        <animate attributeName="ry" values="3;1.5;3" dur="0.18s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="2" cy="2" rx="6" ry="3.5" fill={c.pine} />
      <ellipse cx="0" cy="2.5" rx="3" ry="1.6" fill={c.coral} />
      <circle cx="6" cy="0" r="2.4" fill={c.pine} />
      <line x1="8" y1="0" x2="14" y2="-1" stroke={c.ink} strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="6.5" cy="-0.5" r="0.5" fill={c.cream} />
      <polygon points="-3,2 -8,1 -8,3" fill={c.pine} />
    </g>
  );
}

// ── Pine tree ────────────────────────────────────────────────────
export function Pine({ scale = 1, snowy = false }: { scale?: number; snowy?: boolean }) {
  return (
    <g transform={`scale(${scale})`}>
      <rect x="-2" y="0" width="4" height="10" fill={c.inkSoft} />
      <polygon points="0,-50 -16,-26 16,-26" fill={c.pine} />
      <polygon points="0,-32 -18,-8 18,-8" fill={c.pine} />
      <polygon points="0,-14 -20,8 20,8" fill={c.pine} />
      {snowy && (
        <>
          <polygon points="0,-50 -8,-38 8,-38" fill={c.cream} opacity="0.85" />
          <polygon points="0,-32 -10,-20 10,-20" fill={c.cream} opacity="0.7" />
          <polygon points="0,-14 -12,-2 12,-2" fill={c.cream} opacity="0.55" />
        </>
      )}
    </g>
  );
}

// ── Cloud ────────────────────────────────────────────────────────
export function Cloud({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="28" ry="10" fill={c.cream} />
      <ellipse cx="-12" cy="-4" rx="14" ry="9" fill={c.cream} />
      <ellipse cx="14" cy="-3" rx="12" ry="8" fill={c.cream} />
    </g>
  );
}
