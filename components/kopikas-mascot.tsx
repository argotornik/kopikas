"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { GOOFY_CSS, INK, wobblyCircle } from "@/components/goofy";
import { PaintedKopikas, type PaintedPose } from "@/components/kopikas-painted";
import { cn } from "@/lib/utils";

export type MascotPose = "idle" | "wave" | "point" | "cheer";
export type MascotMood = "happy" | "glad" | "wow";

// The wordmark's k, the same outline the coin mark strikes (components/coin-mark.tsx).
const K =
  "M11.18 23.6 L11.18 8.59 L14.16 8.59 L14.16 16.92 Q14.81 16.48 15.41 15.96 Q16.01 15.45 16.51 14.88 Q17.0 14.32 17.38 13.73 Q17.77 13.14 18.05 12.58 L21.51 12.58 Q21.2 13.37 20.69 14.18 Q20.17 14.99 19.47 15.68 Q18.76 16.36 17.84 16.84 Q16.91 17.32 15.8 17.49 L15.8 17.85 Q17.21 17.59 18.13 17.88 Q19.06 18.18 19.66 18.82 Q20.25 19.46 20.61 20.29 Q20.97 21.12 21.26 21.96 L21.74 23.6 L18.45 23.6 L18.17 22.57 Q17.88 21.54 17.52 20.77 Q17.17 19.99 16.59 19.56 Q16.01 19.13 15.0 19.13 L14.16 19.13 L14.16 23.6 L11.18 23.6 Z";

// Arm angles per pose, in degrees about each shoulder: the left arm swings
// out with positive angles, the right with negative ones. A list is a
// gesture played through; a number is a pose held.
const ARMS: Record<MascotPose, { l: number | number[]; r: number | number[] }> = {
  idle: { l: [0, 7, 0], r: [0, -7, 0] },
  wave: { l: 0, r: [-135, -100, -135, -100, -135] },
  point: { l: 58, r: -12 },
  // Up and out, clear of the coin, with a little shake before it holds.
  cheer: { l: [0, 122, 98, 120, 110], r: [0, -122, -98, -120, -110] },
};

// Kopikas: the coin from the logo, goofy. Googly eyes pop up over its rim,
// the k is its nose, it grins crooked and stands on big shoes. Its eyes
// follow the pointer, or whatever it is told to look at; each change of
// `jump` makes it hop and spin once. The outline boils like a drawing.
export function KopikasMascot({
  pose = "idle",
  mood = "happy",
  lookAt,
  jump = 0,
  size = 112,
  look = "goofy",
  paintedPose = "friendly",
  className,
}: {
  look?: "goofy" | "painted";
  paintedPose?: PaintedPose;
  pose?: MascotPose;
  mood?: MascotMood;
  lookAt?: { x: number; y: number } | null;
  jump?: number;
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, "");
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const ex = useSpring(px, { stiffness: 260, damping: 22 });
  const ey = useSpring(py, { stiffness: 260, damping: 22 });
  const lx = lookAt?.x;
  const ly = lookAt?.y;
  useEffect(() => {
    if (reduce) return;
    const aim = (cx: number, cy: number) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = cx - (r.left + r.width / 2);
      const dy = cy - (r.top + r.height * (look === "painted" ? 0.42 : 0.26));
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, d / 160) * 4;
      px.set((dx / d) * reach);
      py.set((dy / d) * reach);
    };
    if (lx != null && ly != null) {
      aim(lx, ly);
      return;
    }
    const onMove = (e: PointerEvent) => aim(e.clientX, e.clientY);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [lx, ly, reduce, px, py, look]);

  // Three hand-drawn takes of the coin, shown in turn.
  const takes = useMemo(
    () => [0, 1, 2].map((k) => ({ edge: wobblyCircle(66, 74, 38, 40 + k * 7, 1.4), face: wobblyCircle(60, 74, 38, 11 + k * 5, 1.4) })),
    []
  );

  const arms = ARMS[pose];
  const swing = (v: number | number[]) =>
    reduce
      ? { duration: 0 }
      : Array.isArray(v)
        ? { duration: pose === "idle" ? 3.2 : 1.6, repeat: pose === "idle" ? Infinity : 0, ease: "easeInOut" as const }
        : { type: "spring" as const, stiffness: 320, damping: 13 };
  const still = (v: number | number[]) => (reduce && Array.isArray(v) ? v[0] : v);

  return (
    <svg
      ref={ref}
      viewBox="0 0 124 150"
      width={size}
      height={(size * 150) / 124}
      aria-hidden
      className={cn("block overflow-visible", className)}
    >
      <style>{GOOFY_CSS}</style>
      <defs>
        <linearGradient id={`${uid}-face`} x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#F9C08F" />
          <stop offset="0.45" stopColor="#E58C50" />
          <stop offset="1" stopColor="#B85E2C" />
        </linearGradient>
        <linearGradient id={`${uid}-rim`} x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#B85E2C" />
          <stop offset="1" stopColor="#FBD2AC" />
        </linearGradient>
        <pattern id={`${uid}-reed`} width="3.2" height="6" patternUnits="userSpaceOnUse">
          <rect width="1.5" height="6" fill="#7A3A1A" opacity="0.55" />
        </pattern>
      </defs>
      <motion.g
        key={`jump-${jump}`}
        style={{ originX: 0.5, originY: 0.6 }}
        animate={jump && !reduce ? { y: [0, -40, 0], rotate: [0, 200, 360] } : { y: 0, rotate: 0 }}
        transition={{ duration: 0.85, ease: "easeInOut" }}
      >
        <motion.g
          animate={reduce || pose !== "idle" ? { y: 0 } : { y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
{look === "painted" ? (
<PaintedKopikas pose={paintedPose} ex={ex} ey={ey} reduce={!!reduce} />
) : (
<>
          {/* Noodle legs on big shoes. */}
          <path d="M50 108 Q42 120 48 132" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M71 108 Q80 120 73 132" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <ellipse cx="42" cy="136" rx="12.5" ry="6" fill={INK} />
          <ellipse cx="80" cy="136" rx="12.5" ry="6" fill={INK} />
          <ellipse cx="38" cy="133.5" rx="4" ry="1.6" fill="#fff" opacity="0.35" />
          <ellipse cx="76" cy="133.5" rx="4" ry="1.6" fill="#fff" opacity="0.35" />

          <motion.g style={{ originX: 1, originY: 0 }} animate={{ rotate: still(arms.l) }} transition={swing(arms.l)}>
            <path d="M25 84 C14 90 19 100 9 108" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <circle cx="8" cy="110" r="5.5" fill={INK} />
          </motion.g>
          <motion.g style={{ originX: 0, originY: 0 }} animate={{ rotate: still(arms.r) }} transition={swing(arms.r)}>
            <path d="M101 86 C112 92 107 102 116 110" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <circle cx="117" cy="112" r="5.5" fill={INK} />
          </motion.g>

          {/* A struck copper coin, turned a touch so its milled edge shows. */}
          <g className="goofy-boil">
            {takes.map((t, k) => (
              <g key={k}>
                <path d={t.edge} fill="#A3552C" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
                <path d={t.edge} fill={`url(#${uid}-reed)`} />
                <path d={t.face} fill={`url(#${uid}-face)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
              </g>
            ))}
          </g>
          <circle cx="60" cy="74" r="32.5" fill="none" stroke={`url(#${uid}-rim)`} strokeWidth="2.4" />
          <path d="M31 66 Q35 50 47 44" stroke="#FFF4E8" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.85" />
          <path d="M29.5 75 Q29.8 72.5 30.8 70.5" stroke="#FFF4E8" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />

          {/* The k is its nose, struck into the metal. */}
          <path d={K} fill="#FBD2AC" transform="translate(45 55.6) scale(0.95)" />
          <path d={K} fill="#8E4220" transform="translate(44.36 54.7) scale(0.95)" />

          {/* Googly eyes popping up over the rim, each blinking on its own. */}
          <g className="goofy-blink" style={{ animationDelay: "-0.6s" }}>
            <circle cx="45" cy="38" r="12.5" fill="#fff" stroke={INK} strokeWidth="2.4" />
            <motion.circle cx="45" cy="39" r="5.6" fill={INK} style={{ x: ex, y: ey }} />
            <motion.circle cx="47" cy="37" r="1.8" fill="#fff" style={{ x: ex, y: ey }} />
          </g>
          <g className="goofy-blink" style={{ animationDelay: "-2.9s" }}>
            <circle cx="74" cy="41" r="9.5" fill="#fff" stroke={INK} strokeWidth="2.4" />
            <motion.circle cx="74" cy="42" r="4.5" fill={INK} style={{ x: ex, y: ey }} />
            <motion.circle cx="75.6" cy="40.4" r="1.5" fill="#fff" style={{ x: ex, y: ey }} />
          </g>

          {mood === "wow" ? (
            <ellipse cx="60" cy="93" rx="5.5" ry="7" fill={INK} />
          ) : mood === "glad" ? (
            <>
              <path d="M43 86 Q60 108 79 84 Z" fill={INK} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
              <rect x="51" y="86.6" width="5.4" height="4.8" rx="1" fill="#fff" />
              <ellipse cx="64" cy="97" rx="6.5" ry="3.8" fill="#FF7A8A" />
            </>
          ) : (
            <path d="M45 89 Q56 101 76 86" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          )}
</>
)}
        </motion.g>
      </motion.g>
    </svg>
  );
}
