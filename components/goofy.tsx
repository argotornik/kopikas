// The coin tray's hand: nothing is a perfect circle or a true rectangle, and
// every character has a face with a personality. Shapes are seeded, so a
// character keeps its own wobble from render to render; three seeds shown in
// turn make the line boil like a hand-drawn animation (the .goofy-boil rule).

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

// The faces' moods; puzzled is a coin still looking for its roll.
export type Mood = "happy" | "glad" | "wow" | "puzzled";

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
