"use client";

import { motion, useReducedMotion } from "motion/react";
import { BLUE } from "@/components/painted";

// The demo's tips are written on the paper in crayon, like the marks on the stage: a ring round
// the thing to do (a line under words too wide to ring) and an arrow to it, their edges wobbling in the path (never a filter). They draw
// themselves in once, from the pen's start; with reduced motion they are simply there.

type Point = [number, number];
const d = (pts: Point[]) => "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
const DRAW = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

// Placed by transform, not left and top: a tip following a growing roll moves without a layout.
function Stroke({ path, box, delay = 0, duration = DRAW.duration }: { path: string; box: { x: number; y: number; w: number; h: number }; delay?: number; duration?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      style={{ width: box.w, height: box.h, transform: `translate3d(${box.x}px, ${box.y}px, 0)` }}
    >
      <motion.path
        d={path}
        fill="none"
        stroke={BLUE}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ ...DRAW, duration, delay }}
      />
    </svg>
  );
}

// How far a ring reaches from the middle of the box it goes round (a tip keeps its words clear of
// it). A big box needs less room round it than a pill does to read as circled.
export function ringSize(w: number, h: number) {
  const pad = Math.max(w, h) > 120 ? 4 : 12;
  return { rx: w / 2 + pad, ry: h / 2 + pad - 2 };
}

// A loop round a box, a little past where it started, as a hand closes a circle.
export function CrayonRing({ x, y, w, h, seed = 0.7 }: { x: number; y: number; w: number; h: number; seed?: number }) {
  const { rx, ry } = ringSize(w, h);
  const cx = rx + 6, cy = ry + 6;
  const pts: Point[] = [];
  for (let i = 0, n = 84, a0 = -2.3 + seed; i <= n; i++) {
    const t = a0 + ((2 * Math.PI + 0.6) * i) / n;
    const k = 1 + 0.03 * Math.sin(3 * t + seed * 2) + 0.06 * (i / n);
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  return <Stroke path={d(pts)} box={{ x: x + w / 2 - cx, y: y + h / 2 - cy, w: cx * 2, h: cy * 2 }} />;
}

// A line under words too wide to ring, left to right, wavering a little and rising to its end as a
// hand's does.
export function CrayonUnderline({ x, y, w, h, seed = 0.7 }: { x: number; y: number; w: number; h: number; seed?: number }) {
  const pts: Point[] = [];
  for (let i = 0, n = 40; i <= n; i++) {
    const t = i / n;
    pts.push([6 + t * (w + 4), 6 + 1.2 * Math.sin(7 * t + seed * 3) - 2 * t]);
  }
  return <Stroke path={d(pts)} box={{ x: x - 8, y: y + h - 2, w: w + 16, h: 12 }} />;
}

// A gently bent arrow from one point to another, its head in two strokes.
export function CrayonArrow({ from, to, bend = -14 }: { from: Point; to: Point; bend?: number }) {
  const [x0, y0] = from, [x1, y1] = to;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const cx = (x0 + x1) / 2 - ((y1 - y0) / len) * bend, cy = (y0 + y1) / 2 + ((x1 - x0) / len) * bend;
  const pts: Point[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push([(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1]);
  }
  const [px, py] = pts[21];
  const a = Math.atan2(y1 - py, x1 - px);
  const head = (s: number): Point[] => [[x1 - 12 * Math.cos(a + s), y1 - 12 * Math.sin(a + s)], [x1, y1]];
  const left = Math.min(x0, x1, cx) - 16, top = Math.min(y0, y1, cy) - 16;
  const shift = (p: Point[]) => p.map(([x, y]) => [x - left, y - top] as Point);
  const box = { x: left, y: top, w: Math.max(x0, x1, cx) + 16 - left, h: Math.max(y0, y1, cy) + 16 - top };
  // The shaft is drawn, then the head flicked on as it lands, the way a hand finishes an arrow.
  return (
    <>
      <Stroke path={d(shift(pts))} box={box} delay={0.15} />
      <Stroke path={d(shift(head(0.5))) + " " + d(shift(head(-0.5)))} box={box} delay={0.15 + DRAW.duration - 0.04} duration={0.2} />
    </>
  );
}
