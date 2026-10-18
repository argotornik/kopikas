// The coin tray's hand: nothing is a perfect circle or a true rectangle, and
// every character has a face with a personality. Shapes are seeded, so a
// character keeps its own wobble from render to render; three seeds shown in
// turn make the line boil like a hand-drawn animation (the .goofy-boil rule).

import { useId, useMemo } from "react";

export const INK = "#17181D";

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A closed curve through the points, smoothed (Catmull-Rom as cubic Béziers).
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

export function wobblyCircle(cx: number, cy: number, r: number, seed: number, amp = r * 0.045): string {
  const rand = rng(seed);
  const n = Math.max(10, Math.round(r / 2.4));
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + (rand() - 0.5) * 2 * amp;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return smoothClosed(pts);
}

// A rounded rectangle drawn by hand. Points sit evenly about every 6 units,
// so the smoothing never kinks; the hand lives in a gentle in-and-out offset
// on each side, eased between random heights `step` units apart and zero at
// the corners, so edges bend in long waves and corners stay round. Each side
// has its own seed, so a roll growing taller keeps its top and corners.
export function wobblyRect(x: number, y: number, w: number, h: number, r: number, seed: number, amp = 1.3, step = 14): string {
  const rr = Math.min(r, w / 2, h / 2);
  const pts: [number, number][] = [];
  let side = 0;
  const SPACING = 6;
  const corner = (cx: number, cy: number, a0: number) => {
    const rand = rng(seed * 16 + side++);
    const n = Math.max(2, Math.round((rr * Math.PI) / 2 / SPACING));
    for (let k = 0; k <= n; k++) {
      const a = a0 + (k / n) * (Math.PI / 2);
      const rk = rr + (rand() - 0.5) * amp * 0.25;
      pts.push([cx + Math.cos(a) * rk, cy + Math.sin(a) * rk]);
    }
  };
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const rand = rng(seed * 16 + side++);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const m = Math.max(1, Math.round(len / step));
    const heights = Array.from({ length: m + 1 }, (_, i) => (i === 0 || i === m ? 0 : (rand() - 0.5) * 2 * amp));
    const n = Math.max(1, Math.round(len / SPACING));
    const horizontal = y0 === y1;
    for (let k = 1; k < n; k++) {
      const t = (k / n) * m;
      const i = Math.min(m - 1, Math.floor(t));
      const ease = (1 - Math.cos((t - i) * Math.PI)) / 2;
      const off = heights[i] * (1 - ease) + heights[i + 1] * ease;
      const px = x0 + ((x1 - x0) * k) / n;
      const py = y0 + ((y1 - y0) * k) / n;
      pts.push(horizontal ? [px, py + off] : [px + off, py]);
    }
  };
  corner(x + rr, y + rr, Math.PI);
  edge(x + rr, y, x + w - rr, y);
  corner(x + w - rr, y + rr, 1.5 * Math.PI);
  edge(x + w, y + rr, x + w, y + h - rr);
  corner(x + w - rr, y + h - rr, 0);
  edge(x + w - rr, y + h, x + rr, y + h);
  corner(x + rr, y + h - rr, 0.5 * Math.PI);
  edge(x, y + h - rr, x, y + rr);
  return smoothClosed(pts);
}

export type Mood = "happy" | "glad" | "wow";
export type Persona = { eyes: "googly" | "dots" | "sleepy" | "odd"; mouth: "crooked" | "grin" | "o" | "tongue" | "wavy" };
// Every roll and coin gets one of these by its place, so each has its own face.
export const PERSONAS: Persona[] = [
  { eyes: "googly", mouth: "crooked" },
  { eyes: "dots", mouth: "tongue" },
  { eyes: "odd", mouth: "grin" },
  { eyes: "sleepy", mouth: "wavy" },
  { eyes: "googly", mouth: "o" },
  { eyes: "dots", mouth: "crooked" },
  { eyes: "odd", mouth: "tongue" },
  { eyes: "googly", mouth: "grin" },
];

function Eye({ cx, cy, r, look = [0.4, 0.7], blink }: { cx: number; cy: number; r: number; look?: [number, number]; blink: number }) {
  return (
    <g className="goofy-blink" style={{ animationDelay: `${-blink}s` }}>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth="1.4" />
      <circle cx={cx + look[0]} cy={cy + look[1]} r={r * 0.46} fill={INK} />
    </g>
  );
}

// A face in a 40 by 28 box: eyes on top, mouth beneath. `lid` is the colour
// of whatever wears it, for sleepy eyelids.
export function GoofyFace({ persona, mood = "happy", lid = "#E58C50", blink = 0 }: { persona: Persona; mood?: Mood; lid?: string; blink?: number }) {
  const eyes = mood === "wow" ? "googly" : mood === "glad" && persona.eyes === "sleepy" ? "googly" : persona.eyes;
  const mouth = mood === "wow" ? "o" : mood === "glad" ? "grin" : persona.mouth;
  return (
    <g>
      {eyes === "googly" && (
        <>
          <Eye cx={13} cy={9} r={mood === "wow" ? 6.4 : 5.8} look={[0.8, 0.8]} blink={blink} />
          <Eye cx={27} cy={9.6} r={mood === "wow" ? 5.6 : 4.8} look={[-0.6, 0.9]} blink={blink + 1.7} />
        </>
      )}
      {eyes === "odd" && (
        <>
          <Eye cx={12.5} cy={8.6} r={6.8} look={[1.2, 1]} blink={blink} />
          <Eye cx={27.5} cy={11} r={3.6} look={[0.3, 0.4]} blink={blink + 2.3} />
        </>
      )}
      {eyes === "dots" && (
        <g className="goofy-blink" style={{ animationDelay: `${-blink}s` }}>
          <circle cx={14} cy={10.4} r={2.5} fill={INK} />
          <circle cx={26} cy={9.2} r={2.9} fill={INK} />
        </g>
      )}
      {eyes === "sleepy" && (
        <>
          {[
            [13.5, 10, 5],
            [26.5, 10.4, 4.6],
          ].map(([cx, cy, r], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth="1.4" />
              <circle cx={cx + 0.4} cy={cy + 1.8} r={r * 0.45} fill={INK} />
              <path d={`M${cx - r - 0.7} ${cy + 0.6} A${r + 0.7} ${r + 0.7} 0 0 1 ${cx + r + 0.7} ${cy + 0.6} Z`} fill={lid} />
              <path d={`M${cx - r - 0.5} ${cy + 0.6} L${cx + r + 0.5} ${cy + 0.6}`} stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
            </g>
          ))}
        </>
      )}

      {mouth === "crooked" && <path d="M13 18.5 Q19.5 24.5 27.5 17" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {mouth === "grin" && (
        <>
          <path d="M11.5 17 Q20 29 28.5 16.5 Z" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <rect x="16.4" y="17" width="3.6" height="3.2" rx="0.6" fill="#fff" />
          <ellipse cx="22" cy="22.6" rx="3.2" ry="1.9" fill="#FF7A8A" />
        </>
      )}
      {mouth === "o" && <ellipse cx="20" cy="20.5" rx="2.7" ry="3.4" fill={INK} />}
      {mouth === "tongue" && (
        <>
          <ellipse cx="22.8" cy="21.4" rx="3" ry="2.6" fill="#FF7A8A" stroke={INK} strokeWidth="1" />
          <path d="M13.5 18.2 Q20 23.6 27 18" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )}
      {mouth === "wavy" && <path d="M12.5 19.5 Q15.5 16.8 18.5 19.5 T24.5 19.5 T28.5 18.5" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />}
    </g>
  );
}

// The boil and the blink, shared by every character. Reduced motion stills both.
export const GOOFY_CSS = `
  @keyframes goofy-boil { 0%, 33.3% { opacity: 1; } 33.4%, 100% { opacity: 0; } }
  .goofy-boil > * { animation: goofy-boil 0.72s steps(1, end) infinite; }
  .goofy-boil > :nth-child(2) { animation-delay: -0.24s; }
  .goofy-boil > :nth-child(3) { animation-delay: -0.48s; }
  @keyframes goofy-blink { 0%, 93%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
  .goofy-blink { transform-box: fill-box; transform-origin: center; animation: goofy-blink 5.2s infinite; }
  @media (prefers-reduced-motion: reduce) {
    .goofy-boil > * { animation: none; opacity: 0; }
    .goofy-boil > :first-child { opacity: 1; }
    .goofy-blink { animation: none; }
  }
`;

// The goofy look's roll wrappers, one bright colour per category by its place in the
// list (the painted look's are PAINTED_WRAPPERS in painted.tsx).
export const GOOFY_WRAPPERS = [
  "#FF6B57", // coral
  "#FFB020", // sun
  "#3D8BFF", // blue
  "#8E6CFF", // violet
  "#2FC27A", // green
  "#FF8BC4", // pink
  "#19C2D6", // cyan
  "#FF4F8B", // raspberry
  "#A3D93A", // lime
  "#FF8A3D", // orange
  "#8C97A6", // nickel
  "#F2C14E", // brass
  "#B98B5E", // tan
];
export const GOOFY_METALS = {
  copper: ["#B9663A", "#E08A4F", "#F7BC90"],
  brass: ["#C9952C", "#F2C14E", "#FCE39A"],
  nickel: ["#9EA6B1", "#D3D8DF", "#F1F3F6"],
} as const;
type Metal = keyof typeof GOOFY_METALS;
// A coin face is shaded like struck metal, light at the top left; its milled
// edge shows on the right, so it reads as a coin, never a sweet.
const SHADES: Record<Metal, { light: string; mid: string; dark: string; edge: string; reed: string; glint: string }> = {
  copper: { light: "#F9C08F", mid: "#E58C50", dark: "#B85E2C", edge: "#A3552C", reed: "#7A3A1A", glint: "#FFF4E8" },
  brass: { light: "#FDE7A6", mid: "#F2C14E", dark: "#C9952C", edge: "#B3831F", reed: "#7E5C12", glint: "#FFFBEA" },
  nickel: { light: "#F7F9FB", mid: "#D3D8DF", dark: "#9EA6B1", edge: "#8E96A1", reed: "#5E6670", glint: "#FFFFFF" },
};

// A coin, drawn by hand: struck metal shaded light at the top left, its
// milled edge showing on the right so it reads as a coin, a face of its own.
export function Coin({
  size = 36,
  metal = "copper",
  mood = "happy",
  face = true,
  blink = 0,
  seed = 1,
}: {
  size?: number;
  metal?: Metal;
  mood?: Mood;
  face?: boolean;
  blink?: number;
  seed?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const m = SHADES[metal];
  const takes = useMemo(
    () => [0, 1, 2].map((k) => ({ edge: wobblyCircle(22.4, 20, 16.5, seed * 31 + k * 7, 0.6), face: wobblyCircle(19.6, 20, 16.5, seed * 17 + k * 5, 0.6) })),
    [seed]
  );
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="block overflow-visible">
      <defs>
        <linearGradient id={`${uid}-face`} x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor={m.light} />
          <stop offset="0.45" stopColor={m.mid} />
          <stop offset="1" stopColor={m.dark} />
        </linearGradient>
        <linearGradient id={`${uid}-rim`} x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor={m.dark} />
          <stop offset="1" stopColor={m.light} />
        </linearGradient>
        <pattern id={`${uid}-reed`} width="1.6" height="4" patternUnits="userSpaceOnUse">
          <rect width="0.75" height="4" fill={m.reed} opacity="0.55" />
        </pattern>
      </defs>
      <g className="goofy-boil">
        {takes.map((t, k) => (
          <g key={k}>
            <path d={t.edge} fill={m.edge} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
            <path d={t.edge} fill={`url(#${uid}-reed)`} />
            <path d={t.face} fill={`url(#${uid}-face)`} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          </g>
        ))}
      </g>
      <circle cx="19.6" cy="20" r="13.8" fill="none" stroke={`url(#${uid}-rim)`} strokeWidth="1.2" />
      <path d="M7.6 17 Q9.6 10.6 15.2 7.8" stroke={m.glint} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />
      {face && (
        <g transform="translate(8.6 11) scale(0.55)">
          <GoofyFace persona={PERSONAS[seed % PERSONAS.length]} mood={mood} lid={m.mid} blink={blink} />
        </g>
      )}
    </svg>
  );
}

// Confetti in the goofy look's wrapper colours.
export const GOOFY_CONFETTI = ["#3D8BFF", "#FF8BC4", "#FF6B57", "#2FC27A", "#FFB020", "#8E6CFF"];
