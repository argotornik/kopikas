"use client";

import { useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Board, BoardTx } from "@/lib/board";
import { SAVINGS } from "@/lib/engine";
import { GOOFY_CSS, GoofyFace, INK, PERSONAS, rng, wobblyCircle, wobblyRect, type Mood } from "@/components/goofy";
import { KopikasAnimated } from "@/components/kopikas-animated";
import type { MascotPose } from "@/components/kopikas-mascot";
import type { PaintedPose } from "@/components/kopikas-painted";
import { PAINTED_CONFETTI, PAINTED_WRAPPERS, PaintedBar, PaintedCoin, PaintedDefs, PaintedMini, PaintedRoll } from "@/components/painted";
import { RollingNumber } from "@/components/rolling-number";
import { cn } from "@/lib/utils";

// The coin tray's stage: the month, its total and the loose change in the head, the
// rolls on the floor below. The page that shows it owns the month and decides what
// filing does; the stage picks a coin up, flies it to its roll and hands it over.

export const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });
const eurWhole = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
export const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// Roll wrappers, one bright colour per category by its place in the list, so
// a renamed or added category still gets one and neighbours never match.
const WRAPPERS = [
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
const METALS = {
  copper: ["#B9663A", "#E08A4F", "#F7BC90"],
  brass: ["#C9952C", "#F2C14E", "#FCE39A"],
  nickel: ["#9EA6B1", "#D3D8DF", "#F1F3F6"],
} as const;
type Metal = keyof typeof METALS;
// A coin face is shaded like struck metal, light at the top left; its milled
// edge shows on the right, so it reads as a coin, never a sweet.
const SHADES: Record<Metal, { light: string; mid: string; dark: string; edge: string; reed: string; glint: string }> = {
  copper: { light: "#F9C08F", mid: "#E58C50", dark: "#B85E2C", edge: "#A3552C", reed: "#7A3A1A", glint: "#FFF4E8" },
  brass: { light: "#FDE7A6", mid: "#F2C14E", dark: "#C9952C", edge: "#B3831F", reed: "#7E5C12", glint: "#FFFBEA" },
  nickel: { light: "#F7F9FB", mid: "#D3D8DF", dark: "#9EA6B1", edge: "#8E96A1", reed: "#5E6670", glint: "#FFFFFF" },
};

export const MUTED = "text-[#63666F] dark:text-[#A7A9B4]";
export const PANEL = "rounded-[28px] bg-[#F4F5F7] dark:bg-[#191B22]";
// In Tailwind 4 both outline-none and outline-hidden also cancel a later
// outline's style, so focus sets it back (outline-solid); without that, no
// control showed its focus. outline-hidden keeps a ring in forced colours.
export const FOCUS =
  "outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17181D] dark:focus-visible:outline-[#F3F2EE]";
export const DISPLAY = "coins-display";
const SPRING = { type: "spring" as const, stiffness: 260, damping: 18 };
// Where a default name may break when its roll's column is too narrow for it on one
// line: a soft hyphen, so the break is the same in every browser. Other names rely on
// the browser's own hyphenation, and past that break anywhere rather than overflow.
const HYPHENATED: Record<string, string> = { Subscriptions: "Sub­scrip­tions" };
const breakable = (name: string) => HYPHENATED[name] ?? name;

export const monthOf = (date: string) => date.slice(0, 7);
const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1 + by, 1)).toISOString().slice(0, 7);
};
export const label = (m: string) => monthName.format(new Date(m + "-01T00:00:00Z"));

// What left the account in a month, by category; savings set aside, shared
// costs at full price (the board's Paid out). Unfiled money is loose change.
function paidOut(txs: BoardTx[], month: string) {
  const byCat = new Map<string, number>();
  let loose = 0;
  for (const t of txs) {
    if (t.amount >= 0 || monthOf(t.date) !== month || t.category === SAVINGS) continue;
    if (t.category) byCat.set(t.category, (byCat.get(t.category) ?? 0) - t.amount);
    else loose -= t.amount;
  }
  return { byCat, loose, total: [...byCat.values()].reduce((a, b) => a + b, 0) + loose };
}

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

// Confetti marks: dashes, squiggles, dots and zigzags in the wrappers' colours.
const CONFETTI = ["#3D8BFF", "#FF8BC4", "#FF6B57", "#2FC27A", "#FFB020", "#8E6CFF"];
type MarkKind = "dash" | "squiggle" | "dot" | "zig";
function ConfettiMark({ kind, colour, size, rotate = 0, fine = false }: { kind: MarkKind; colour: string; size: number; rotate?: number; fine?: boolean }) {
  if (fine)
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} style={{ rotate: `${rotate}deg` }} className="block overflow-visible">
        {kind === "dash" && <path d="M4 12 L20 12" style={{ stroke: colour }} strokeWidth="2.6" strokeLinecap="round" />}
        {kind === "squiggle" && <path d="M2 14 Q6 7 10 12 T18 12 T23 9" style={{ stroke: colour }} strokeWidth="2" fill="none" strokeLinecap="round" />}
        {kind === "dot" && <circle cx="12" cy="12" r="4.5" style={{ fill: colour }} />}
        {kind === "zig" && <path d="M3 15 Q8 6 12 13 Q16 19 21 9" style={{ stroke: colour }} strokeWidth="2" fill="none" strokeLinecap="round" />}
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ rotate: `${rotate}deg` }} className="block overflow-visible">
      {kind === "dash" && <rect x="2" y="9.5" width="20" height="5" rx="2.5" fill={colour} />}
      {kind === "squiggle" && <path d="M2 14 Q6 6 10 12 T18 12 T23 9" stroke={colour} strokeWidth="3.2" fill="none" strokeLinecap="round" />}
      {kind === "dot" && <circle cx="12" cy="12" r="9" fill={colour} />}
      {kind === "zig" && <path d="M2 16 L7 8 L12 16 L17 8 L22 16" stroke={colour} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

// What floats behind the stage, top right, out of the way of every number.
const FLOATERS: { kind: MarkKind | "coin"; metal?: Metal; x: number; y: number; s: number; d: number; c?: number; r?: number }[] = [
  { kind: "coin", metal: "brass", x: 60, y: 6, s: 22, d: 7 },
  { kind: "squiggle", x: 69, y: 22, s: 26, d: 9, c: 0, r: -12 },
  { kind: "dash", x: 83, y: 5, s: 16, d: 8, c: 2, r: 35 },
  { kind: "dot", x: 91, y: 18, s: 9, d: 10, c: 1 },
  { kind: "zig", x: 52, y: 3, s: 20, d: 6, c: 3, r: 10 },
  { kind: "dash", x: 76, y: 12, s: 12, d: 7, c: 4, r: -50 },
  { kind: "coin", metal: "copper", x: 96, y: 4, s: 15, d: 11 },
  { kind: "dot", x: 64, y: 30, s: 7, d: 9, c: 2 },
  { kind: "squiggle", x: 88, y: 31, s: 22, d: 8, c: 5, r: 20 },
  { kind: "dash", x: 57, y: 18, s: 10, d: 7, c: 1, r: 70 },
];

// What floats around the loose change on the painted stage, in % of the pile's 120px
// column, clear of every spot a coin can take. Squiggles and dots only: on the painted
// stage a dash means a limit, and a floating coin would read as one more to file.
const AIR: (typeof FLOATERS)[number][] = [
  { kind: "squiggle", x: -82, y: 4, s: 30, d: 9, c: 3, r: -8 },
  { kind: "squiggle", x: -63, y: 62, s: 30, d: 8, c: 0, r: 6 },
  { kind: "dot", x: -18, y: 32, s: 8, d: 10, c: 1 },
  { kind: "dot", x: 109, y: 43, s: 7, d: 9, c: 4 },
];

function Floater({ f, painted, always = false }: { f: (typeof FLOATERS)[number]; painted: boolean; always?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("coins-float pointer-events-none absolute", !always && f.x < 84 && "hidden sm:block")}
      style={{ left: `${f.x}%`, top: `${f.y}%`, animationDuration: `${f.d}s`, animationDelay: `${-f.d / 2}s` }}
    >
      {f.kind === "coin" ? (
        painted ? (
          <PaintedCoin size={f.s} metal={f.metal} face={false} seed={f.d} />
        ) : (
          <Coin size={f.s} metal={f.metal} face={false} seed={f.d} />
        )
      ) : painted ? (
        <ConfettiMark kind={f.kind} colour={PAINTED_CONFETTI[(f.c ?? 0) % PAINTED_CONFETTI.length]} size={f.s} rotate={f.r} fine />
      ) : (
        <ConfettiMark kind={f.kind} colour={CONFETTI[(f.c ?? 0) % CONFETTI.length]} size={f.s} rotate={f.r} />
      )}
    </span>
  );
}

// A roll as a character: a hand-drawn block in its wrapper colour on two
// little feet, the coins sticking out of the top as spiky hair (wilder and
// taller past the limit), a face of its own, and stubby arms that go up when
// there is a coin to catch. Its height springs to what it holds; the first
// render already stands at it, and only then does it rise in.
function GoofyRoll({
  index,
  colour,
  body,
  extra,
  budget,
  over,
  picking,
  gulping,
  height: H,
  width: RW,
  delay,
}: {
  index: number;
  colour: string;
  body: number;
  extra: number;
  budget: number | null;
  over: boolean;
  picking: boolean;
  gulping: boolean;
  height: number;
  width: number;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const PAD = 12;
  const FOOT = 9;
  const target = Math.max(46, body);
  const hv = useSpring(target, { stiffness: 220, damping: 17 });
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

  const seed = index * 977 + 13;
  const d0 = useTransform(hv, (v) => wobblyRect(PAD, H - FOOT - v, RW, v, 15, seed));
  const d1 = useTransform(hv, (v) => wobblyRect(PAD, H - FOOT - v, RW, v, 15, seed + 101));
  const d2 = useTransform(hv, (v) => wobblyRect(PAD, H - FOOT - v, RW, v, 15, seed + 202));
  const top = useTransform(hv, (v) => H - FOOT - v);
  const hair = useMemo(() => {
    const rand = rng(seed + 5);
    const wild = over ? Math.min(12, Math.max(2, Math.round(extra / 8))) : 0;
    return Array.from({ length: 4 + wild }, (_, i) =>
      i < 4
        ? { x: PAD + RW * (0.22 + i * 0.185) + (rand() - 0.5) * 3, y: -3 + rand() * 2, r: -38 + i * 25 + (rand() - 0.5) * 14 }
        : { x: PAD + RW * (0.28 + rand() * 0.44), y: -10 - (i - 4) * 8 - rand() * 3, r: (rand() - 0.5) * 100 }
    );
  }, [seed, over, extra, RW]);
  const persona = PERSONAS[index % PERSONAS.length];
  const mood: Mood = gulping ? "glad" : over ? "wow" : "happy";
  const arm = (side: 1 | -1) => (
    <motion.g
      style={{ originX: side === 1 ? 1 : 0, originY: 0 }}
      animate={{ rotate: picking ? (reduce ? 120 * side : [115 * side, 138 * side, 115 * side]) : 0 }}
      transition={picking && !reduce ? { duration: 0.6, repeat: Infinity } : SPRING}
    >
      {side === 1 ? (
        <>
          <path d={`M${PAD + 1} 30 Q${PAD - 7} 36 ${PAD - 8} 46`} stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <circle cx={PAD - 8} cy={48} r="3.2" fill={INK} />
        </>
      ) : (
        <>
          <path d={`M${PAD + RW - 1} 30 Q${PAD + RW + 7} 36 ${PAD + RW + 8} 46`} stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <circle cx={PAD + RW + 8} cy={48} r="3.2" fill={INK} />
        </>
      )}
    </motion.g>
  );
  return (
    <svg width={RW + PAD * 2} height={H} viewBox={`0 0 ${RW + PAD * 2} ${H}`} aria-hidden className="block overflow-visible">
      {budget != null && !over && (
        <path
          d={wobblyRect(PAD, H - FOOT - budget, RW, budget, 15, seed + 7)}
          fill="none"
          stroke={colour}
          strokeOpacity="0.7"
          strokeWidth="2"
          strokeDasharray="6 5"
          strokeLinecap="round"
        />
      )}
      <ellipse cx={PAD + RW * 0.3} cy={H - 5} rx="7.5" ry="4" fill={INK} />
      <ellipse cx={PAD + RW * 0.7} cy={H - 5} rx="7.5" ry="4" fill={INK} />
      <motion.g style={{ originY: 1 }} animate={gulping && !reduce ? { scaleY: [1, 0.88, 1.06, 1] } : { scaleY: 1 }} transition={{ duration: 0.6 }}>
        <motion.g style={{ y: top }}>
          {hair.map((c, i) => (
            <rect
              key={i}
              x={c.x - 2.8}
              y={c.y - 7.5}
              width="5.6"
              height="15"
              rx="2.8"
              fill={METALS.brass[1]}
              stroke={INK}
              strokeWidth="1.3"
              transform={`rotate(${c.r.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)})`}
            />
          ))}
        </motion.g>
        <g className="goofy-boil">
          {[d0, d1, d2].map((d, k) => (
            <motion.path key={k} d={d} fill={colour} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
          ))}
        </g>
        <motion.g style={{ y: top }}>
          <path d={`M${PAD + RW * 0.2} 12 L${PAD + RW * 0.2} 24`} stroke="#fff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
          {arm(1)}
          {arm(-1)}
          <g transform={`translate(${PAD + RW / 2 - 20} 7)`}>
            <GoofyFace persona={persona} mood={mood} lid={colour} blink={index * 0.7 + 0.2} />
          </g>
        </motion.g>
      </motion.g>
    </svg>
  );
}

// Where the loose coins sit in the pile, from the floor up.
const PILE = [
  { x: 4, y: 0, r: -8 },
  { x: 52, y: 2, r: 7 },
  { x: 100, y: 0, r: -4 },
  { x: 28, y: 44, r: 11 },
  { x: 76, y: 46, r: -6 },
  { x: 52, y: 88, r: 3 },
  { x: 6, y: 86, r: -12 },
];
const PILE_METALS: Metal[] = ["copper", "brass", "nickel"];

// What Kopikas says when clicked: how to read the tray.
const TIPS = [
  "Tap a coin, then the roll it goes in.",
  "A dashed outline is a roll's limit.",
  "Coins piled on top mean a roll went past its limit.",
  "Each roll's height is what it holds. Same scale for all.",
];
const coinCount = (n: number) => `${n} ${n === 1 ? "coin" : "coins"}`;

// Confetti thrown out from Kopikas when everything is sorted.
function Burst({ painted }: { painted: boolean }) {
  const kinds: MarkKind[] = ["dash", "squiggle", "dot", "zig"];
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-[38%]">
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const s = i % 2 ? 14 : 19;
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: -s / 2, top: -s / 2 }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{ x: Math.cos(a) * 96, y: Math.sin(a) * 80, scale: 1, opacity: 0, rotate: 200 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <ConfettiMark
              kind={kinds[i % kinds.length]}
              colour={(painted ? PAINTED_CONFETTI : CONFETTI)[i % (painted ? PAINTED_CONFETTI : CONFETTI).length]}
              size={s}
              fine={painted}
            />
          </motion.span>
        );
      })}
    </span>
  );
}

type Flight = { tx: BoardTx; category: string; from: { x: number; y: number }; dx: number; dy: number };

// The month's unfiled money, newest first: the coins in the pile, and the queue's rows.
export const looseCoins = (txs: BoardTx[], month: string) =>
  txs.filter((t) => t.amount < 0 && !t.category && monthOf(t.date) === month).sort((a, b) => b.date.localeCompare(a.date));

// A category's wrapper colour, by its place in the list.
export const wrapperOf = (categories: { name: string }[], name: string, painted: boolean) => {
  const list = painted ? PAINTED_WRAPPERS : WRAPPERS;
  return list[Math.max(0, categories.findIndex((c) => c.name === name)) % list.length];
};

// What a page can ask of the stage: file a charge from outside it, such as a queue row,
// with the same hop from the row to its roll. False when a coin is already in the air.
export type CoinStageHandle = { file: (tx: BoardTx, category: string, fromQueue?: boolean) => boolean };

export function CoinStage({
  txs,
  categories,
  month,
  months,
  currentMonth,
  onMonthChange,
  onFile,
  look,
  ref,
}: {
  txs: BoardTx[];
  categories: Board["categories"];
  month: string;
  months: string[];
  currentMonth: string;
  onMonthChange: (month: string) => void;
  onFile: (tx: BoardTx, category: string) => void;
  look: "painted" | "goofy";
  ref?: Ref<CoinStageHandle>;
}) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [gulp, setGulp] = useState<{ category: string; n: number } | null>(null);
  const [cheer, setCheer] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [lastFiled, setLastFiled] = useState<{ category: string; n: number } | null>(null);
  const [tip, setTip] = useState<number | null>(null);
  const [waving, setWaving] = useState(false);
  const [lookAt, setLookAt] = useState<{ x: number; y: number } | null>(null);
  // A coin held in one month is put back when another month is shown.
  const [shown, setShown] = useState(month);
  if (shown !== month) {
    setShown(month);
    setPicked(null);
  }
  const [greeting, setGreeting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setGreeting(false), 2600);
    return () => clearTimeout(t);
  }, []);
  const painted = look === "painted";
  // A phone gets a shorter floor, so several rolls fit before it scrolls.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // The phone list's width sets the shared scale for the lying rolls.
  const listRef = useRef<HTMLDivElement>(null);
  const [listW, setListW] = useState(300);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setListW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [narrow, painted]);
  // The floor's width sets the painted columns: 84px while they fit, narrower with the count, down to 60px.
  const floorRef = useRef<HTMLDivElement>(null);
  const [floorW, setFloorW] = useState(0);
  useEffect(() => {
    const el = floorRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFloorW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [narrow, painted]);

  const index = useMemo(() => new Map(categories.map((c, i) => [c.name, i])), [categories]);
  const wrapper = (name: string) => wrapperOf(categories, name, painted);
  const now = paidOut(txs, month);
  const before = paidOut(txs, shiftMonth(month, -1));
  const isCurrent = month === currentMonth;

  // Every category stands on the painted floor, asleep when nothing is filed; the goofy look still hides empties.
  const rolls = categories
    .filter((c) => c.name !== SAVINGS && (painted || (now.byCat.get(c.name) ?? 0) > 0))
    .map((c) => ({ name: c.name, total: now.byCat.get(c.name) ?? 0, budget: c.budget }));
  const sleeping = rolls.filter((r) => r.total <= 0);
  // A limit is set in whole euros as a rule, so it shows without cents unless it has them.
  const limitText = (b: number) => (Number.isInteger(b) ? eurWhole : eur).format(b);
  // How a roll's limit reads to a screen reader.
  const limitNote = (r: { total: number; budget?: number | null }) =>
    r.budget == null ? "" : r.total > r.budget ? `, ${eur.format(r.total - r.budget)} over its ${limitText(r.budget)} limit` : ` of a ${limitText(r.budget)} limit`;
  // Column width from the count: the full 84px while every roll fits in one row, else narrower, never under 60px,
  // then a tighter gap; only past that does the floor wrap to a second row on the same scale. It never scrolls.
  const colMax = narrow ? 70 : 84;
  const n = rolls.length;
  const fitsAt = (col: number, gap: number) => floorW === 0 || n * col + gap * (n - 1) <= floorW;
  const colAt = (gap: number) => Math.max(60, Math.min(colMax, Math.floor((floorW - gap * (n - 1)) / n)));
  let floorGap = narrow ? 16 : 20;
  let colW = colMax;
  if (!fitsAt(colMax, floorGap)) {
    colW = colAt(floorGap);
    if (!fitsAt(colW, floorGap)) {
      floorGap = 12;
      colW = colAt(floorGap);
    }
  }
  const floorFits = fitsAt(colW, floorGap);
  const loose = looseCoins(txs, month);
  const pickedTx = loose.find((t) => t.id === picked) ?? null;

  // One shared scale: a euro is the same height on every roll. A sleeper's limit
  // waits for its first coin, so it stretches nothing.
  const tallest = Math.max(1, ...rolls.map((r) => Math.max(r.total, r.total > 0 ? (r.budget ?? 0) : 0)));
  // The painted floor has the stage's full width, and in one row the height to match: the floor is the
  // picture. A floor that wraps keeps the shorter stage, so its second shelf isn't mostly air.
  const tall = painted && !narrow && floorFits;
  const MAX = narrow ? 112 : tall ? 280 : 200;
  const px = (v: number) => (v / tallest) * MAX;

  // What Kopikas says and does, from the state of the tray.
  const pose: MascotPose = pickedTx ? "point" : celebrating || lastFiled ? "cheer" : waving ? "wave" : "idle";
  // The painted Kopikas has a pose for each moment of the board.
  const paintedPose: PaintedPose = pickedTx
    ? "budgeting"
    : celebrating
      ? "excited"
      : lastFiled
        ? "jump"
        : waving
          ? "friendly"
          : greeting
            ? "hello"
            : loose.length > 0
              ? "saving"
              : !isCurrent && before.total > 0 && now.total < before.total
                ? "proud"
                : "resting";
  let said: string;
  let bubbleKey: string;
  let bubble: React.ReactNode;
  if (pickedTx) {
    said = `Tap the roll ${pickedTx.name} goes in.`;
    bubbleKey = `picked-${pickedTx.id}`;
    bubble = (
      <>
        Tap the roll <span className="font-semibold">{pickedTx.name}</span> goes in.{" "}
        <button type="button" onClick={() => setPicked(null)} className={cn("underline underline-offset-2", MUTED, FOCUS)}>
          Put it back
        </button>
      </>
    );
  } else if (celebrating || (lastFiled && loose.length === 0)) {
    said = "All sorted! Every coin is in its roll.";
    bubbleKey = `sorted-${cheer}`;
    bubble = <span className="font-semibold">{said}</span>;
  } else if (lastFiled) {
    said = `In it goes! ${coinCount(loose.length)} to go.`;
    bubbleKey = `filed-${lastFiled.n}`;
    bubble = said;
  } else if (tip !== null) {
    said = TIPS[tip];
    bubbleKey = `tip-${tip}`;
    bubble = said;
  } else {
    said = loose.length ? `Hi! ${coinCount(loose.length)} to sort in ${label(month)}.` : `All sorted for ${label(month)}. Nice work.`;
    bubbleKey = `hello-${month}-${loose.length}`;
    bubble = said;
  }

  const bubbleEl = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={bubbleKey}
        initial={reduce ? false : { opacity: 0, scale: 0.85, x: narrow ? 0 : 12, y: narrow ? -6 : 0 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
        transition={SPRING}
        style={narrow ? { originX: 0.9, originY: 0 } : { originX: 1, originY: 0.3 }}
        className={cn(
          "relative rounded-2xl bg-white px-4 py-3 text-[15px] leading-snug shadow-[0_10px_30px_-14px_rgb(0_0_0/0.3)] dark:bg-[#23252E]",
          narrow ? "w-full" : "mt-5 max-w-[260px]"
        )}
      >
        {bubble}
        <span
          aria-hidden
          className={cn("absolute size-3 rotate-45 bg-white dark:bg-[#23252E]", narrow ? "-top-1.5 right-9" : "-right-1.5 top-6")}
        />
      </motion.div>
    </AnimatePresence>
  );
  const mascotEl = (
    <div className={cn("z-10 shrink-0", narrow ? "absolute right-3 top-3" : "relative")}>
      <button
        type="button"
        aria-label="Kopikas: show a tip"
        onClick={() => setTip((t) => ((t ?? -1) + 1) % TIPS.length)}
        onMouseEnter={() => setWaving(true)}
        onMouseLeave={() => setWaving(false)}
        className={cn("rounded-3xl", FOCUS)}
      >
        <KopikasAnimated
          look={look}
          pose={pose}
          paintedPose={paintedPose}
          mood={celebrating || lastFiled ? "glad" : "happy"}
          lookAt={lookAt}
          jump={painted ? 0 : cheer}
          size={narrow ? 62 : 112}
        />
      </button>
      {celebrating && !reduce && <Burst key={cheer} painted={painted} />}
    </div>
  );
  // The loose change: a pile of coins to pick up, and its count. The painted stage keeps it in
  // its head, top right, at 40px a coin; the goofy one stands it on the floor's row.
  const pileScale = painted ? 0.8 : narrow ? 0.72 : 1;
  const pileCoin = painted ? 40 : narrow ? 38 : 50;
  const pileBox = (
    <div className={cn("relative", painted ? "size-[120px]" : "h-[112px] w-[112px] sm:h-[150px] sm:w-[150px]")} role="group" aria-label={`Loose change: ${loose.length} to file`}>
      {loose.slice(0, PILE.length).map((t, i) => {
        const spot = PILE[i];
        const isPicked = picked === t.id;
        return (
          <motion.button
            key={t.id}
            type="button"
            data-coin={t.id}
            aria-pressed={isPicked}
            aria-label={`${t.name}, ${eur.format(Math.abs(t.amount))}, ${shortDate.format(new Date(t.date + "T00:00:00Z"))}. Pick up to file`}
            onClick={() => setPicked(isPicked ? null : t.id)}
            className={cn("absolute rounded-full", FOCUS, flight?.tx.id === t.id && "opacity-0")}
            style={{ left: spot.x * pileScale, bottom: spot.y * pileScale, zIndex: isPicked ? 20 : 10 - i }}
            initial={reduce ? false : { y: -28 }}
            animate={
              isPicked
                ? { y: -16, scale: 1.18, rotate: [spot.r, spot.r - 10, spot.r + 10, spot.r] }
                : { y: 0, scale: 1, rotate: spot.r }
            }
            transition={isPicked ? { ...SPRING, rotate: { duration: 0.5 } } : { ...SPRING, delay: reduce ? 0 : 0.2 + i * 0.05 }}
            whileHover={{ y: isPicked ? -18 : -4 }}
          >
            {painted ? (
              <PaintedCoin size={pileCoin} metal={PILE_METALS[i % PILE_METALS.length]} mood={isPicked ? "glad" : "happy"} seed={i + 2} />
            ) : (
              <Coin size={pileCoin} metal={PILE_METALS[i % PILE_METALS.length]} mood={isPicked ? "glad" : "happy"} blink={i * 0.9} seed={i + 2} />
            )}
          </motion.button>
        );
      })}
      {loose.length === 0 && (
        <div className="absolute inset-x-6 bottom-0 flex justify-center">
          {painted ? <PaintedCoin size={36} mood="glad" seed={5} /> : <Coin size={42} metal="copper" mood="glad" blink={0.4} />}
        </div>
      )}
    </div>
  );
  const pileLabel = (
    <div className="mt-3 text-center">
      <div className={cn(DISPLAY, "text-[16px] font-semibold")}>Loose change</div>
      <div className={cn("text-[13px] tabular-nums", MUTED)}>
        {loose.length === 0 ? "nothing to file" : `${loose.length} to file${loose.length > PILE.length ? ` · ${PILE.length} shown` : ""}`}
      </div>
    </div>
  );

  const monthHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!gulp) return;
    const t = setTimeout(() => setGulp(null), 1100);
    return () => clearTimeout(t);
  }, [gulp]);
  useEffect(() => {
    if (!cheer) return;
    setCelebrating(true);
    const t = setTimeout(() => setCelebrating(false), 2600);
    return () => clearTimeout(t);
  }, [cheer]);
  useEffect(() => {
    if (!lastFiled) return;
    const t = setTimeout(() => setLastFiled(null), 2200);
    return () => clearTimeout(t);
  }, [lastFiled]);
  useEffect(() => {
    if (tip === null) return;
    const t = setTimeout(() => setTip(null), 4500);
    return () => clearTimeout(t);
  }, [tip]);
  // Kopikas looks at the coin you are holding, then at the roll it landed in;
  // the rest of the time its eyes follow the pointer.
  useEffect(() => {
    const at = (sel: string) => {
      const r = document.querySelector(sel)?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    };
    if (picked) setLookAt(at(`[data-coin="${picked}"]`));
    else if (lastFiled) setLookAt(at(`[data-roll="${CSS.escape(lastFiled.category)}"]`));
    else setLookAt(null);
  }, [picked, lastFiled]);
  useEffect(() => {
    if (!picked) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked]);

  const commit = (tx: BoardTx, category: string) => {
    const last = loose.length === 1 && loose[0].id === tx.id;
    onFile(tx, category);
    setGulp((g) => ({ category, n: (g?.n ?? 0) + 1 }));
    setLastFiled((f) => ({ category, n: (f?.n ?? 0) + 1 }));
    setTip(null);
    if (last) setCheer((c) => c + 1);
  };

  // A coin hops from where it lies to the top of its roll; the change lands
  // when the coin does. With reduced motion, or no roll to aim at, it lands at once.
  // A queue row is outside the stage, so its page keeps its focus.
  const file = (tx: BoardTx, category: string, fromQueue = false) => {
    if (!category || flight) return false;
    setPicked(null);
    if (!fromQueue) {
      // Filing on the stage disables the rolls, so the roll just pressed would
      // drop focus to the page: hand it to the next loose coin, or the month.
      const next = [...document.querySelectorAll<HTMLElement>("[data-coin]")].find((el) => el.dataset.coin !== tx.id && el.getBoundingClientRect().width > 0);
      (next ?? monthHeading.current)?.focus();
    }
    const src = document.querySelector(`[data-coin="${tx.id}"]`) ?? document.querySelector(`[data-queue="${tx.id}"]`);
    const dst = document.querySelector(`[data-roll="${CSS.escape(category)}"]`);
    if (reduce || !src || !dst) {
      commit(tx, category);
      return true;
    }
    const a = src.getBoundingClientRect();
    const b = dst.getBoundingClientRect();
    setFlight({
      tx,
      category,
      from: { x: a.left + a.width / 2 - 20, y: a.top + a.height / 2 - 20 },
      dx: b.left + b.width / 2 - (a.left + a.width / 2),
      dy: b.top - 6 - (a.top + a.height / 2),
    });
    return true;
  };
  useImperativeHandle(ref, () => ({ file }));

  return (
    <>
      <PaintedDefs />
      <style>{`
        .coins-display { font-family: var(--font-coins-display), ui-rounded, system-ui, sans-serif; }
        @keyframes coins-float { from { transform: translateY(-7px) rotate(-7deg); } to { transform: translateY(7px) rotate(7deg); } }
        .coins-float { animation: coins-float ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .coins-float { animation: none; } }
        ${GOOFY_CSS}
      `}</style>
      {/* The stage: the month's rolls on one floor, the loose change beside them. */}
      <section
        aria-labelledby="month-heading"
        className={cn(PANEL, "relative overflow-hidden px-5 pb-6 pt-6 sm:px-8 sm:pt-8", painted && "bg-[#EFEBE3] dark:bg-[#1F1D22]")}
      >
        {/* The painted phone keeps only the marks up by the month: lower ones would land on the list. */}
        {(!painted || narrow) &&
          FLOATERS.filter((f) => !painted || f.y < 25).map((f, i) => (
            <Floater key={i} f={f} painted={painted} />
          ))}

        <div className="relative flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                disabled={month <= months[0]}
                onClick={() => onMonthChange(shiftMonth(month, -1))}
                className={cn("-ml-2 rounded-full p-1.5 hover:bg-white disabled:opacity-30 dark:hover:bg-white/10", FOCUS)}
              >
                <ChevronLeftIcon className="size-5" aria-hidden />
              </button>
              <h2 id="month-heading" ref={monthHeading} tabIndex={-1} className={cn(DISPLAY, "rounded-xl text-[34px] font-semibold leading-none sm:text-[40px]", FOCUS)}>
                {label(month)}
              </h2>
              <button
                type="button"
                aria-label="Next month"
                disabled={month >= (months.at(-1) ?? month)}
                onClick={() => onMonthChange(shiftMonth(month, 1))}
                className={cn("rounded-full p-1.5 hover:bg-white disabled:opacity-30 dark:hover:bg-white/10", FOCUS)}
              >
                <ChevronRightIcon className="size-5" aria-hidden />
              </button>
            </div>
            <p className={cn("mt-3 text-[15px]", MUTED)}>{isCurrent ? "Paid out so far" : `Paid out in ${label(month)}`}</p>
            <p className={cn(DISPLAY, "text-[44px] font-semibold leading-tight tabular-nums sm:text-[52px]")}>
              <RollingNumber value={now.total} format={(n) => eur.format(n)} />
            </p>
            {before.total > 0 && (
              <p className={cn("text-[15px]", MUTED)}>
                {label(shiftMonth(month, -1))} ended at <span className="tabular-nums">{eur.format(before.total)}</span>
              </p>
            )}
          </div>
          {!narrow &&
            (painted ? (
              // The loose change, top right: pick a coin up here, drop it on a roll below.
              <div className="relative ml-auto flex w-[120px] flex-col items-center">
                {AIR.map((f, i) => (
                  <Floater key={i} f={f} painted always />
                ))}
                {pileBox}
                {pileLabel}
              </div>
            ) : (
              <div className="flex items-start gap-3">
                {bubbleEl}
                {mascotEl}
              </div>
            ))}
        </div>
        {/* Kopikas and his bubble stay on the goofy look only; the painted stage has no narrator. */}
        {narrow && !painted && (
          <>
            {mascotEl}
            <div className="relative mt-4">{bubbleEl}</div>
          </>
        )}
        <p className="sr-only" aria-live="polite">
          {said}
        </p>

        {/* On a phone the rolls lie down: one list, every category in it, on one shared scale. */}
        {narrow && painted ? (
          <div className="relative mt-5 flex flex-col gap-4">
            <div className="flex items-center gap-3" role="group" aria-label={`Loose change: ${loose.length} to file`}>
              <div className="flex items-center -space-x-1.5">
                {loose.length === 0 ? (
                  <PaintedCoin size={40} mood="glad" seed={5} />
                ) : (
                  loose.slice(0, 6).map((t, i) => {
                    const isPicked = picked === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        type="button"
                        data-coin={t.id}
                        aria-pressed={isPicked}
                        aria-label={`${t.name}, ${eur.format(Math.abs(t.amount))}, ${shortDate.format(new Date(t.date + "T00:00:00Z"))}. Pick up to file`}
                        onClick={() => setPicked(isPicked ? null : t.id)}
                        className={cn("relative rounded-full", FOCUS, flight?.tx.id === t.id && "opacity-0")}
                        style={{ zIndex: isPicked ? 20 : 10 - i }}
                        animate={isPicked ? { y: -10, scale: 1.15, rotate: [0, -10, 10, 0] } : { y: 0, scale: 1, rotate: 0 }}
                        transition={isPicked ? { ...SPRING, rotate: { duration: 0.5 } } : SPRING}
                      >
                        <PaintedCoin size={40} metal={PILE_METALS[i % PILE_METALS.length]} mood={isPicked ? "glad" : "happy"} seed={i + 2} />
                      </motion.button>
                    );
                  })
                )}
              </div>
              <div>
                <div className={cn(DISPLAY, "text-[16px] font-semibold leading-tight")}>Loose change</div>
                <div className={cn("text-[13px] tabular-nums", MUTED)}>
                  {loose.length === 0 ? "nothing to file" : `${loose.length} to file${loose.length > 6 ? " · 6 shown" : ""}`}
                </div>
              </div>
            </div>
            <div className="h-px bg-[#16171C]/10 dark:bg-white/10" aria-hidden />
            <div ref={listRef} role="group" aria-label={`Where ${label(month)}'s money went`} className="flex flex-col gap-2">
              {rolls.filter((r) => r.total > 0).map((r, i) => {
                const over = r.budget != null && r.total > r.budget;
                const span = Math.max(60, listW - 6);
                const hpx = (v: number) => (v / tallest) * span;
                return (
                  <motion.button
                    key={r.name}
                    type="button"
                    data-roll={r.name}
                    disabled={!pickedTx}
                    onClick={() => pickedTx && file(pickedTx, r.name)}
                    aria-label={`${r.name}: ${eur.format(r.total)}${limitNote(r)}${pickedTx ? `. File ${pickedTx.name} here` : ""}`}
                    className={cn("w-full rounded-xl text-left disabled:cursor-default", FOCUS)}
                    animate={pickedTx && !reduce ? { x: [0, 4, 0] } : { x: 0 }}
                    transition={pickedTx ? { duration: 0.9, repeat: Infinity, delay: i * 0.06 } : SPRING}
                  >
                    <div className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="truncate font-medium">{r.name}</span>
                      <span className="shrink-0 tabular-nums">
                        <span className={over ? "font-medium" : MUTED}>{eur.format(r.total)}</span>
                        {r.budget != null && <span className={MUTED}> of {limitText(r.budget)}</span>}
                      </span>
                    </div>
                    <PaintedBar
                      index={index.get(r.name) ?? i}
                      colour={wrapper(r.name)}
                      length={hpx(over ? (r.budget as number) : r.total)}
                      extra={over ? hpx(r.total - (r.budget as number)) : 0}
                      budget={r.budget != null ? hpx(r.budget) : null}
                      over={over}
                      gulping={gulp?.category === r.name}
                      width={listW}
                      delay={0.15 + i * 0.05}
                    />
                  </motion.button>
                );
              })}
            </div>
            {/* The categories with nothing filed yet sleep in one line after the list, each still a place to file. */}
            {sleeping.length > 0 && (
              <div role="group" aria-label="Categories with nothing filed yet" className="flex flex-col gap-2">
                <div className={cn("text-[14px] font-medium", MUTED)}>Nothing yet</div>
                <div className="flex flex-wrap gap-x-[18px] gap-y-1.5">
                  {sleeping.map((r) => (
                    <button
                      key={r.name}
                      type="button"
                      data-roll={r.name}
                      disabled={!pickedTx}
                      onClick={() => pickedTx && file(pickedTx, r.name)}
                      aria-label={`${r.name}: nothing filed yet${pickedTx ? `. File ${pickedTx.name} here` : ""}`}
                      className={cn("flex min-h-11 items-center gap-2 rounded-full pr-1 text-[13px] font-medium disabled:cursor-default", FOCUS)}
                    >
                      <PaintedMini index={index.get(r.name) ?? 0} colour={wrapper(r.name)} />
                      <span>{r.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
        <div className="relative mt-6 flex items-end gap-6 overflow-x-auto pb-1 sm:gap-8 lg:overflow-visible">
          {!painted && (
            <>
              <div className="flex shrink-0 flex-col items-center">
                {pileBox}
                {pileLabel}
              </div>
              <div className="w-px shrink-0 self-stretch bg-[#16171C]/10 dark:bg-white/10" aria-hidden />
            </>
          )}

          <div
            ref={floorRef}
            role="group"
            aria-label={`Where ${label(month)}'s money went`}
            className={cn("flex flex-1 gap-y-6", painted ? "flex-wrap items-start" : "min-w-max items-end", floorFits ? "justify-between" : "justify-start")}
            style={{ columnGap: floorGap }}
          >
            {rolls.map((r, i) => {
              const over = r.budget != null && r.total > r.budget;
              const colour = wrapper(r.name);
              // A narrower column gives up its side padding before its body: the body stays 44px or wider.
              const RW = painted ? Math.max(44, Math.min(60, colW - 24)) : narrow ? 46 : 60;
              const pad = painted ? (colW - RW) / 2 : 12;
              const H = narrow ? 150 : tall ? 310 : 230;
              return (
                <div key={r.name} className="flex shrink-0 flex-col items-center" style={{ width: RW + pad * 2 }}>
                  <motion.button
                    type="button"
                    data-roll={r.name}
                    disabled={!pickedTx}
                    onClick={() => pickedTx && file(pickedTx, r.name)}
                    aria-label={`${r.name}: ${eur.format(r.total)}${limitNote(r)}${pickedTx ? `. File ${pickedTx.name} here` : ""}`}
                    className={cn("relative flex w-full items-end justify-center rounded-[22px] disabled:cursor-default", FOCUS)}
                    style={{ height: H }}
                    animate={pickedTx && !reduce ? { y: [0, -5, 0] } : { y: 0 }}
                    transition={pickedTx ? { duration: 0.9, repeat: Infinity, delay: i * 0.08 } : SPRING}
                    whileHover={pickedTx ? { scale: 1.06, rotate: -2 } : undefined}
                  >
                    {painted ? (
                      <PaintedRoll
                        key={`p-${RW}-${H}`}
                        index={index.get(r.name) ?? i}
                        colour={colour}
                        body={px(over ? (r.budget as number) : r.total)}
                        extra={over ? px(r.total - (r.budget as number)) : 0}
                        budget={r.budget != null ? px(r.budget) : null}
                        over={over}
                        gulping={gulp?.category === r.name}
                        height={H}
                        width={RW}
                        pad={pad}
                        delay={0.15 + i * 0.05}
                      />
                    ) : (
                    <GoofyRoll
                      key={`g-${RW}-${H}`}
                      index={index.get(r.name) ?? i}
                      colour={colour}
                      body={px(over ? (r.budget as number) : r.total)}
                      extra={over ? px(r.total - (r.budget as number)) : 0}
                      budget={r.budget != null ? px(r.budget) : null}
                      over={over}
                      picking={!!pickedTx}
                      gulping={gulp?.category === r.name}
                      height={H}
                      width={RW}
                      delay={0.15 + i * 0.05}
                    />
                    )}
                  </motion.button>
                  {/* A painted name may use the gap on either side and run to two lines, hyphenated where the
                      browser can; two lines are kept for every name, so the floor stays level when one wraps. */}
                  <div
                    className={cn("mt-3 text-center", !painted && "w-[68px] sm:w-[84px] lg:w-[100px]")}
                    style={painted ? { width: RW + pad * 2 + floorGap, marginInline: -floorGap / 2 } : undefined}
                  >
                    <div
                      className={cn("text-[13px] font-medium", painted ? "flex min-h-[2lh] flex-col justify-end leading-tight hyphens-auto wrap-anywhere" : "truncate")}
                    >
                      <span className={cn(painted && "line-clamp-2")}>{painted ? breakable(r.name) : r.name}</span>
                    </div>
                    <div className={cn("truncate text-[13px] tabular-nums", over ? "font-medium" : MUTED)}>{eur.format(r.total)}</div>
                    {painted && r.budget != null && <div className={cn("truncate text-[12px] tabular-nums", MUTED)}>of {limitText(r.budget)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </section>

      {flight && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed z-50"
          style={{ left: flight.from.x, top: flight.from.y }}
          initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            x: [0, flight.dx * 0.55, flight.dx],
            y: [0, Math.min(flight.dy, 0) - 110, flight.dy],
            rotate: [0, 200, 360],
            scale: [1, 1.15, 0.75],
          }}
          transition={{ duration: 0.7, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] }}
          onAnimationComplete={() => {
            commit(flight.tx, flight.category);
            setFlight(null);
          }}
        >
          {painted ? <PaintedCoin size={40} mood="glad" seed={9} /> : <Coin size={40} mood="glad" />}
        </motion.div>
      )}
    </>
  );
}
