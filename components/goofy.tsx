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

// A rounded rectangle drawn by hand. Each side has its own seed, so a roll
// growing taller keeps the wobble of its top and corners.
export function wobblyRect(x: number, y: number, w: number, h: number, r: number, seed: number, amp = 1.3): string {
  const rr = Math.min(r, w / 2, h / 2);
  const pts: [number, number][] = [];
  let side = 0;
  const jitter = (px: number, py: number, rand: () => number): [number, number] => [
    px + (rand() - 0.5) * 2 * amp,
    py + (rand() - 0.5) * 2 * amp,
  ];
  const corner = (cx: number, cy: number, a0: number) => {
    const rand = rng(seed * 16 + side++);
    for (let k = 0; k <= 2; k++) {
      const a = a0 + (k / 2) * (Math.PI / 2);
      pts.push(jitter(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rand));
    }
  };
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const rand = rng(seed * 16 + side++);
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14));
    for (let k = 1; k < steps; k++) pts.push(jitter(x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps, rand));
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
