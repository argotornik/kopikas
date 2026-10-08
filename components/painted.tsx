"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { wobblyCircle, wobblyRect, type Mood } from "@/components/goofy";

// The painted look: flat matte shapes with gently uneven edges, faces of two
// dots and a curve, fine blue dashes in the air. After the user's friend KAIA
// (@saiakuubik), as a sketch to compare against the goofy look, not a final one.

// Roll colours, one per category by its place in the list.
export const PAINTED_WRAPPERS = [
  "#6C8EEA", // cornflower
  "#E2553B", // tomato
  "#F0A3B4", // pink
  "#3F9A55", // grass
  "#6B4630", // brown
  "#A9C8F5", // sky
  "#D9E85A", // lime
  "#8C6BD9", // lavender
  "#F2C14E", // yolk
  "#B8B8B8", // grey
  "#C7432F", // brick
  "#8FCB9B", // mint
  "#E8A15C", // apricot
];
export const PAINTED_CONFETTI = ["#5B7FE0", "#5B7FE0", "#5B7FE0", "#E2553B", "#F0A3B4", "var(--painted-ink)"];
const BROWN = "#3A2A20";
// Limbs and dark marks: dark brown on the light ground, a warm light tone on
// the dark one, so feet and confetti never vanish.
export const LIMB = "var(--painted-limb)";
const BLUE = "#4C6FE0";

// A face painted on: the colour that reads on its ground.
export function faceInk(ground: string): string {
  if (ground === "#6B4630") return "#8FB0FF";
  const n = parseInt(ground.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? "#2E3A8C" : "#F6F2EA";
}

// Theme tokens for limbs and dark marks. Edges stay vector-smooth: the
// handmade feel comes from each shape's own gentle wobble, never a filter.
export function PaintedDefs() {
  return (
    <style>{`
      :root { --painted-limb: #3A2A20; --painted-ink: #2B2B2B; --painted-shadow: rgb(0 0 0 / 0.12); --painted-stage-ink: #2E3A8C; --painted-foot-to: #16171C; --painted-foot-keep: 65%; }
      .dark { --painted-limb: #D9C7B4; --painted-ink: #ECE6DC; --painted-shadow: rgb(0 0 0 / 0.35); --painted-stage-ink: #F6F2EA; --painted-foot-to: #F3F2EE; --painted-foot-keep: 75%; }
    `}</style>
  );
}

// A roll grows through stages as coins go in (DESIGN.md, Rolls). The lines are in
// px of body: below the floor nothing is drawn smaller; from FACE_FROM the body holds
// the full face; under it only the eyes show. A bar lies down, so its lines differ.
export const ROLL_FLOOR = 4;
export const BAR_FLOOR = 8;
export const FACE_FROM = 32;
export const BAR_FACE_FROM = 26;
export const BAR_EYES_FROM = 14;
// Where the face box sits under the body's top: 9 px from 51 px up, centred below that.
export function faceOffset(v: number): number {
  return Math.min(9, v / 2 - 16.5);
}
// Marks drawn on the stage rather than on a wrapper take the stage's ink.
const STAGE_INK = "var(--painted-stage-ink)";

// The two eyes of every painted face, in a 40 by 28 box.
export function PaintedEyes({ ink, blink = 0 }: { ink: string; blink?: number }) {
  return (
    <g className="goofy-blink" style={{ animationDelay: `${-blink}s` }}>
      <ellipse cx="14" cy="10.4" rx="2.6" ry="3" style={{ fill: ink }} />
      <ellipse cx="26" cy="9.8" rx="2.4" ry="2.8" style={{ fill: ink }} />
    </g>
  );
}

// Asleep: two flat shut eyes where the eyes would be, and one small z above the right one.
export function PaintedSleep({ ink }: { ink: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: ink }}>
      <path d="M10.5 10.5 H17.5" strokeWidth="2.4" />
      <path d="M22.5 10 H29.5" strokeWidth="2.4" />
      <path d="M32 -3.5 H37.5 L32 2 H37.5" strokeWidth="2" />
    </g>
  );
}

// Two dots and a curve in a 40 by 28 box. Glad opens the smile, wow rounds it.
export function PaintedFace({ ink, mood = "happy", blink = 0 }: { ink: string; mood?: Mood; blink?: number }) {
  return (
    <g>
      <PaintedEyes ink={ink} blink={blink} />
      {mood === "wow" ? (
        <ellipse cx="20" cy="20" rx="2.6" ry="3.2" fill={ink} />
      ) : mood === "glad" ? (
        <path d="M12.5 16.5 Q20 27 27.5 16 Z" fill={ink} />
      ) : (
        <path d="M13 17.5 Q20 24.5 27 17" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

const PAINTED_METALS = {
  copper: { body: "#C9773F", edge: "#9A5A2E", ring: "#E7A06A" },
  brass: { body: "#E3B341", edge: "#B98A22", ring: "#F4D27A" },
  nickel: { body: "#BDBDBD", edge: "#8F8F8F", ring: "#DADADA" },
} as const;

export function PaintedCoin({
  size = 36,
  metal = "copper",
  mood = "happy",
  face = true,
  seed = 1,
}: {
  size?: number;
  metal?: keyof typeof PAINTED_METALS;
  mood?: Mood;
  face?: boolean;
  seed?: number;
}) {
  const m = PAINTED_METALS[metal];
  const shape = useMemo(() => ({ edge: wobblyCircle(22, 20, 16.5, seed * 31, 0.75), face: wobblyCircle(19.6, 20, 16.5, seed * 17, 0.75) }), [seed]);
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="block overflow-visible">
      <g>
        <path d={shape.edge} fill={m.edge} />
        <path d={shape.face} fill={m.body} />
        <circle cx="19.6" cy="20" r="12.8" fill="none" stroke={m.ring} strokeWidth="1.6" />
      </g>
      {face && (
        <g transform="translate(8.6 10.5) scale(0.55)">
          <PaintedFace ink={metal === "copper" ? "#2E3A8C" : BROWN} mood={mood} blink={seed * 1.37} />
        </g>
      )}
    </svg>
  );
}

// A roll, painted: a soft block in its colour on two stubby legs, a face of
// two dots and a curve. Past its limit, a pink block stacks on top. Its
// height springs to what it holds; the first render already stands at it.
// Its height is the amount, never less: a body too short for the face shows
// only the eyes above it, and a category with nothing filed sleeps on a
// dashed footprint until the first coin wakes it.
export function PaintedRoll({
  index,
  colour,
  body,
  extra,
  budget,
  over,
  gulping,
  height: H,
  width: RW,
  pad: PAD = 12,
  delay,
}: {
  index: number;
  colour: string;
  body: number;
  extra: number;
  budget: number | null;
  over: boolean;
  gulping: boolean;
  height: number;
  width: number;
  pad?: number;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const FOOT = 10;
  const asleep = body <= 0;
  const target = asleep ? 0 : Math.max(ROLL_FLOOR, body);
  const grown = target >= FACE_FROM;
  const hv = useSpring(target, { stiffness: 200, damping: 20 });
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      if (reduce) return;
      hv.jump(0);
      const t = setTimeout(() => hv.set(target), delay * 1000);
      return () => clearTimeout(t);
    }
    hv.set(target);
  }, [hv, target, reduce, delay]);
  const ev = useSpring(extra, { stiffness: 200, damping: 20 });
  useEffect(() => ev.set(extra), [ev, extra]);

  const seed = index * 613 + 29;
  const d = useTransform(hv, (v) => (v > 0 ? wobblyRect(PAD, H - FOOT - v, RW, v, 12, seed, 0.8, 32) : ""));
  const dExtra = useTransform([hv, ev], ([v, e]: number[]) =>
    e > 0 ? wobblyRect(PAD + 6, H - FOOT - v - e + 3, RW - 12, e, 8, seed + 3, 0.6, 28) : ""
  );
  // The face box follows the body's top: inside it when grown, 4 px clear above it as a hatchling.
  const faceY = useTransform(hv, (v) => H - FOOT - v + (grown ? faceOffset(v) : -17.5));
  const ink = faceInk(colour);
  const mood: Mood = gulping ? "glad" : over ? "wow" : "happy";
  const faceX = PAD + RW / 2 - 20;
  return (
    <svg width={RW + PAD * 2} height={H} viewBox={`0 0 ${RW + PAD * 2} ${H}`} aria-hidden className="block overflow-visible">
      {budget != null && !over && (
        <path
          d={wobblyRect(PAD, H - FOOT - budget, RW, budget, 12, seed + 7, 0.6, 32)}
          fill="none"
          stroke={BLUE}
          strokeWidth="2.2"
          strokeDasharray="3 7"
          strokeLinecap="round"

        />
      )}
      {asleep ? (
        <g>
          <path
            d={wobblyRect(PAD, H - FOOT + 1, RW, 7, 4, seed + 7, 0.6, 32)}
            fill="none"
            strokeWidth="2"
            strokeDasharray="3 4"
            strokeLinecap="round"
            style={{ stroke: `color-mix(in srgb, ${colour} var(--painted-foot-keep), var(--painted-foot-to))` }}
          />
          <g transform={`translate(${faceX} ${H - 25})`}>
            <PaintedSleep ink={STAGE_INK} />
          </g>
        </g>
      ) : (
        <>
          <g>
            <rect x={PAD + RW * 0.24} y={H - FOOT - 2} width="7" height={FOOT} rx="3" style={{ fill: LIMB }} />
            <rect x={PAD + RW * 0.76 - 7} y={H - FOOT - 2} width="7" height={FOOT} rx="3" style={{ fill: LIMB }} />
          </g>
          <motion.g style={{ originY: 1 }} animate={gulping && !reduce ? { scaleY: [1, 0.9, 1.04, 1] } : { scaleY: 1 }} transition={{ duration: 0.6 }}>
            <g>
              <motion.path d={dExtra} fill="#F0A3B4" />
              <motion.path d={d} fill={colour} />
            </g>
            <motion.g style={{ y: faceY }}>
              <g transform={`translate(${faceX} 0)`}>
                {grown ? <PaintedFace ink={ink} mood={mood} blink={index * 0.83 + 0.4} /> : <PaintedEyes ink={STAGE_INK} blink={index * 0.83 + 0.4} />}
              </g>
            </motion.g>
          </motion.g>
        </>
      )}
    </svg>
  );
}

// A sleeper in miniature, for the phone's "Nothing yet" line: its wrapper as a
// small blob with the shut eyes and the z painted on, the name set beside it.
export function PaintedMini({ index, colour }: { index: number; colour: string }) {
  const seed = index * 613 + 29 + 5;
  const d = useMemo(() => wobblyRect(1, 1, 28, 24, 9, seed, 0.6, 24), [seed]);
  const ink = faceInk(colour);
  return (
    <svg width="30" height="26" viewBox="0 0 30 26" aria-hidden className="block shrink-0 overflow-visible">
      <path d={d} fill={colour} />
      <g fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 15 H13" strokeWidth="2.2" />
        <path d="M17 15 H22" strokeWidth="2.2" />
        <path d="M25.5 -1 H30.5 L25.5 3.5 H30.5" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

// A roll lying down, for a phone: the same painted block, its length on the
// shared scale and its face at the end; past its limit a pink block carries on.
// Too short for the face it keeps only its eyes, inside the bar; shorter still
// it is a plain sliver, and the amount beside it does the talking.
export function PaintedBar({
  index,
  colour,
  length,
  extra,
  budget,
  over,
  gulping,
  width: W,
  delay,
}: {
  index: number;
  colour: string;
  length: number;
  extra: number;
  budget: number | null;
  over: boolean;
  gulping: boolean;
  width: number;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const H = 34;
  const Y = 4;
  const BH = 26;
  const target = length > 0 ? Math.max(BAR_FLOOR, length) : 0;
  const grown = target >= BAR_FACE_FROM;
  const eyed = target >= BAR_EYES_FROM;
  const lv = useSpring(target, { stiffness: 200, damping: 22 });
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      if (reduce) return;
      lv.jump(0);
      const t = setTimeout(() => lv.set(target), delay * 1000);
      return () => clearTimeout(t);
    }
    lv.set(target);
  }, [lv, target, reduce, delay]);
  const ev = useSpring(extra, { stiffness: 200, damping: 22 });
  useEffect(() => ev.set(extra), [ev, extra]);

  const seed = index * 613 + 29;
  const d = useTransform(lv, (v) => (v > 0 ? wobblyRect(2, Y, v, BH, 9, seed, 0.7, 34) : ""));
  const dExtra = useTransform([lv, ev], ([v, e]: number[]) => (e > 0 ? wobblyRect(v - 2, Y + 4, e + 2, BH - 8, 6, seed + 3, 0.5, 30) : ""));
  // The face box, at 0.68, is flush with the tip from 33 px; below that it sits centred, as do the eyes alone.
  const faceX = useTransform(lv, (v) => (grown ? Math.min(v - 28, 2 + v / 2 - 13.6) : 2 + v / 2 - 13.5));
  const mood: Mood = gulping ? "glad" : over ? "wow" : "happy";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="block overflow-visible">
      {budget != null && !over && (
        <path
          d={wobblyRect(2, Y, budget, BH, 9, seed + 7, 0.5, 34)}
          fill="none"
          stroke={BLUE}
          strokeWidth="2"
          strokeDasharray="3 7"
          strokeLinecap="round"
         
        />
      )}
      <motion.g style={{ originX: 0 }} animate={gulping && !reduce ? { scaleX: [1, 0.93, 1.03, 1] } : { scaleX: 1 }} transition={{ duration: 0.6 }}>
        <g>
          <motion.path d={dExtra} fill="#F0A3B4" />
          <motion.path d={d} fill={colour} />
        </g>
        {(grown || eyed) && (
          <motion.g style={{ x: faceX }}>
            {grown ? (
              <g transform="translate(0 7) scale(0.68)">
                <PaintedFace ink={faceInk(colour)} mood={mood} blink={index * 0.83 + 0.4} />
              </g>
            ) : (
              <g transform="translate(0 10.1) scale(0.68)">
                <PaintedEyes ink={faceInk(colour)} blink={index * 0.83 + 0.4} />
              </g>
            )}
          </motion.g>
        )}
      </motion.g>
    </svg>
  );
}
