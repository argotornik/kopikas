"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { useDroppable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "motion/react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Board, BoardTx } from "@/lib/board";
import { SAVINGS, matches } from "@/lib/engine";
import { DISPLAY, FOCUS, MUTED, PANEL } from "@/components/coin-look";
// The hand both looks share: the painted faces blink with its keyframes.
import type { Mood } from "@/components/goofy";
import { FACE_FROM, PAINTED_CONFETTI, PAINTED_WRAPPERS, PaintedBar, PaintedCoin, PaintedDefs, PaintedMini, PaintedRoll } from "@/components/painted";
import { RollingNumber } from "@/components/rolling-number";
import { cn, shareLabel } from "@/lib/utils";

// The coin tray's stage, painted: the month, its total and the loose change in the head, the
// rolls on the floor below. The page that shows it owns the month and decides what
// filing does; the stage picks a coin up, flies it to its roll and hands it over.

// Amounts the Estonian way (comma decimals, space thousands), the space from 1 000 up: the
// locale's own default only groups from 10 000, so 1842,16 € would sit beside 10 700,40 €.
export const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR", useGrouping: "always" });
export const eurWhole = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" });
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
export const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// A coin's metal, the same three in both looks.
type Metal = "copper" | "brass" | "nickel";

const SPRING = { type: "spring" as const, stiffness: 260, damping: 18 };
// A roll pressed squashes a little toward where it stands, fast, and springs
// back on SPRING. With reduced motion the press does nothing; what it does
// (choosing the roll, filing the coin) shows at once anyway.
const PRESS = { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const };
// Where a default name may break when its roll's column is too narrow for it on one
// line: a soft hyphen, so the break is the same in every browser. Other names rely on
// the browser's own hyphenation, and past that break anywhere rather than overflow.
const HYPHENATED: Record<string, string> = { Subscriptions: "Sub­scrip­tions" };
export const breakable = (name: string) => HYPHENATED[name] ?? name;

export const monthOf = (date: string) => date.slice(0, 7);
export const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1 + by, 1)).toISOString().slice(0, 7);
};
export const label = (m: string) => monthName.format(new Date(m + "-01T00:00:00Z"));

// What left the account in a month, by category; savings and round-ups set aside,
// shared costs at full price (the board's Paid out). Unfiled money is loose change.
function paidOut(txs: BoardTx[], month: string) {
  const byCat = new Map<string, number>();
  let loose = 0;
  for (const t of txs) {
    if (t.amount >= 0 || t.micro || monthOf(t.date) !== month || t.category === SAVINGS) continue;
    if (t.category) byCat.set(t.category, (byCat.get(t.category) ?? 0) - t.amount);
    else loose -= t.amount;
  }
  return { byCat, loose, total: [...byCat.values()].reduce((a, b) => a + b, 0) + loose };
}

// Marks in the air: squiggles and dots in the painted confetti colours. On the stage a dash
// means a limit, and a floating coin would read as one more to file, so neither floats.
type MarkKind = "squiggle" | "dot";
function ConfettiMark({ kind, colour, size, rotate = 0 }: { kind: MarkKind; colour: string; size: number; rotate?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ rotate: `${rotate}deg` }} className="block overflow-visible">
      {kind === "squiggle" && <path d="M2 14 Q6 7 10 12 T18 12 T23 9" style={{ stroke: colour }} strokeWidth="2" fill="none" strokeLinecap="round" />}
      {kind === "dot" && <circle cx="12" cy="12" r="4.5" style={{ fill: colour }} />}
    </svg>
  );
}

// What floats around the loose change, in % of the pile's 120px column, clear of every
// spot a coin can take.
type Mark = { kind: MarkKind; x: number; y: number; s: number; d: number; c?: number; r?: number };
const AIR: Mark[] = [
  { kind: "squiggle", x: -82, y: 4, s: 30, d: 9, c: 3, r: -8 },
  { kind: "squiggle", x: -63, y: 45, s: 30, d: 8, c: 0, r: 6 },
  { kind: "dot", x: -18, y: 32, s: 8, d: 10, c: 1 },
  { kind: "dot", x: 109, y: 43, s: 7, d: 9, c: 4 },
];

function Floater({ f }: { f: Mark }) {
  return (
    <span
      aria-hidden
      className="coins-float pointer-events-none absolute"
      style={{ left: `${f.x}%`, top: `${f.y}%`, animationDuration: `${f.d}s`, animationDelay: `${-f.d / 2}s` }}
    >
      <ConfettiMark kind={f.kind} colour={PAINTED_CONFETTI[(f.c ?? 0) % PAINTED_CONFETTI.length]} size={f.s} rotate={f.r} />
    </span>
  );
}

// The month sorted: confetti bursts out of the empty pile's glad coin in the rolls' own colours,
// then drifts down and fades by 2 s. Each list keeps its marks in the clear air around its coin,
// never over a word or a number: x and y place a mark's top left in px from the coin's box, s is
// its size and f how far it falls.
export type BurstMark = { kind: MarkKind; x: number; y: number; s: number; r?: number; f: number };
export function ConfettiBurst({ marks, origin: [ox, oy], colours }: { marks: BurstMark[]; origin: [number, number]; colours: string[] }) {
  return marks.map((m, i) => {
    const x = ox - m.x - m.s / 2;
    const y = oy - m.y - m.s / 2;
    return (
      <motion.span
        key={i}
        aria-hidden
        className="pointer-events-none absolute"
        style={{ left: m.x, top: m.y }}
        initial={{ x, y, scale: 0.3, opacity: 0 }}
        animate={{ x: [x, 0, 0], y: [y, 0, m.f], scale: [0.3, 1, 1], opacity: [0, 1, 0], rotate: [0, 0, i % 2 ? 40 : -40] }}
        transition={{ duration: 1.9, times: [0, 0.24, 1], ease: [[0.16, 1, 0.3, 1], [0.55, 0, 0.85, 0.4]], delay: (i % 5) * 0.025 }}
      >
        <ConfettiMark kind={m.kind} colour={colours[i % colours.length]} size={m.s} rotate={m.r} />
      </motion.span>
    );
  });
}
// Around the pile's 120px box, from its glad coin: up into the panel's padding, out over the
// head's middle, and down only left of the words under the pile.
const PILE_BURST: BurstMark[] = [
  { kind: "squiggle", x: -12, y: -22, s: 30, r: -20, f: 30 },
  { kind: "dot", x: 36, y: -24, s: 20, f: 36 },
  { kind: "squiggle", x: 84, y: -17, s: 28, r: 25, f: 30 },
  { kind: "dot", x: 124, y: 10, s: 18, f: 40 },
  { kind: "dot", x: -41, y: 7, s: 20, f: 50 },
  { kind: "squiggle", x: -74, y: -14, s: 32, r: 35, f: 60 },
  { kind: "dot", x: -106, y: 24, s: 22, f: 70 },
  { kind: "squiggle", x: -120, y: 53, s: 30, r: -15, f: 70 },
  { kind: "dot", x: 12, y: 38, s: 18, f: 30 },
  { kind: "squiggle", x: 100, y: 43, s: 28, r: -30, f: 24 },
  { kind: "dot", x: 122, y: 79, s: 18, f: 20 },
  { kind: "dot", x: -55, y: 86, s: 20, f: 60 },
  { kind: "squiggle", x: -115, y: 108, s: 30, r: 50, f: 60 },
  { kind: "dot", x: -78, y: 130, s: 20, f: 40 },
  { kind: "squiggle", x: 48, y: -29, s: 26, r: 10, f: 34 },
  { kind: "dot", x: 70, y: -7, s: 16, f: 40 },
  { kind: "dot", x: -60, y: -19, s: 18, f: 60 },
];
// Around the phone's 40px coin: the row's words start 12px to its right, so the marks keep to
// the coin's left, above and below, short of the figures and the line under the row.
const PHONE_BURST: BurstMark[] = [
  { kind: "squiggle", x: -16, y: -26, s: 22, r: -20, f: 8 },
  { kind: "dot", x: 12, y: -28, s: 14, f: 10 },
  { kind: "squiggle", x: 20, y: -24, s: 24, r: 30, f: 8 },
  { kind: "dot", x: -18, y: 8, s: 14, f: 14 },
  { kind: "squiggle", x: -18, y: 40, s: 22, r: 50, f: 4 },
  { kind: "dot", x: 6, y: 50, s: 14, f: 2 },
  { kind: "dot", x: 30, y: 46, s: 12, f: 6 },
];

// A roll as a place to drop a ledger row dragged onto it, when the page lets rows be dragged.
// A loose coin's charge, shown while it is picked up, hovered or focused: the pill the mouse carries
// when a row is dragged (coin-board.tsx), so a coin is never filed blind. Screen readers hear the same
// from the coin's own name, so this is for the eyes only. Beside the phone's coin row there is no room
// for the day as well; the name and the amount are what tell two coins apart.
function CoinLabel({ pile, day = true, className }: { pile: BoardTx[]; day?: boolean; className?: string }) {
  const tx = pile[0];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full bg-white py-1 pl-3 pr-3.5 text-[13px] font-medium leading-[22px] ring-1 ring-ink/10 dark:bg-card-night dark:ring-white/10",
        className
      )}
    >
      <span className="min-w-0 truncate">{tx.name}</span>
      {pile.length > 1 ? (
        <span className="shrink-0 tabular-nums">
          {pile.length} charges · {eur.format(pile.reduce((sum, t) => sum - t.amount, 0))}
        </span>
      ) : (
        <>
          <span className="shrink-0 tabular-nums">{eur.format(Math.abs(tx.amount))}</span>
          {day && <span className={cn("shrink-0 font-normal", MUTED)}>· {shortDate.format(new Date(tx.date + "T00:00:00Z"))}</span>}
        </>
      )}
    </span>
  );
}

// A roll as a place to drop a ledger row: on the floor, or in the side panel (`side`). `inline`: a
// sleeper in the side panel, which shares its line with the others, as on the phone.
function RollTarget({ name, side = false, inline = false, children }: { name: string; side?: boolean; inline?: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${side ? "side" : "roll"}:${name}` });
  return (
    <div ref={setNodeRef} className={cn(!inline && "w-full", "transition-transform duration-150", isOver && "scale-[1.06]")}>
      {children}
    </div>
  );
}

// The Pooleks jar as a place to drop a ledger row dragged onto it.
function JarTarget({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "jar" });
  return (
    <div ref={setNodeRef} className={cn("transition-transform duration-150", isOver && "scale-[1.08]")}>
      {children}
    </div>
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

const coinCount = (n: number) => `${n} ${n === 1 ? "coin" : "coins"}`;

// Where a coin in the air is going: a roll by its category, or the Pooleks jar (null).
// `size` is the coin's, so it leaves a magnified stage (the board on an ultrawide) at its size there.
// A stack (`many`) flies as its top coin and lands as all of them; `always` is the switch.
type Flight = { tx: BoardTx; to: string | null; from: { x: number; y: number }; dx: number; dy: number; size: number; always: boolean; many?: BoardTx[] };

// Unfiled money, newest first: the coins in the pile, and the queue's rows. One
// month's, or every month's when `month` is null. Round-ups are never loose.
export const looseCoins = (txs: BoardTx[], month: string | null) =>
  txs
    .filter((t) => t.amount < 0 && !t.category && !t.micro && (month === null || monthOf(t.date) === month))
    .sort((a, b) => b.date.localeCompare(a.date));

// Where a shop's charges went last time: the category of its most recent filing, so a backlog
// filed out of order follows what was just decided; filings from before their times were kept
// count as older, and among them the latest charge wins. Null for a shop never filed, which gets
// no guess. The suggestion the queue, the menus and the stage offer first.
export const lastTimeOf = (txs: BoardTx[], tx: BoardTx) => {
  let latest: BoardTx | null = null;
  const later = (a: BoardTx, b: BoardTx) => ((a.filedAt ?? "") !== (b.filedAt ?? "") ? (a.filedAt ?? "") > (b.filedAt ?? "") : a.date > b.date);
  for (const t of txs)
    if (t.category && t.amount < 0 && !t.micro && t.id !== tx.id && t.rulePattern === tx.rulePattern && (!latest || later(t, latest))) latest = t;
  return latest?.category ?? null;
};

// Where a shop's charges have gone, most often first, at most three, the one it went to last
// time marked and first among equals. Empty for a shop never filed. The File menu offers these
// first.
export const usuallyOf = (txs: BoardTx[], tx: BoardTx) => {
  const counts = new Map<string, number>();
  for (const t of txs)
    if (t.category && t.amount < 0 && !t.micro && t.id !== tx.id && t.rulePattern === tx.rulePattern) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  const last = lastTimeOf(txs, tx);
  return [...counts]
    .sort(([a, n], [b, m]) => m - n || Number(b === last) - Number(a === last))
    .slice(0, 3)
    .map(([category, count]) => ({ category, count, last: category === last }));
};

// Whether a category's name answers what was typed: from its start, or from the start of one of
// its words ("out" finds Eating out), never from the middle of one ("ho" isn't Shopping).
export const nameMatches = (name: string, typed: string) => {
  const n = name.toLowerCase();
  return n.startsWith(typed) || n.split(/\s+/).some((w) => w.startsWith(typed));
};

// What Always takes, said under its switch while it is on, the same on the stage, in the queue
// and in the menus: the charges in hand, the shop's other loose ones and where they wait, and
// the ones to come.
export const alwaysTakes = (here: number, others: BoardTx[]) => {
  const these = here > 1 ? `These ${here}` : "This one";
  if (others.length === 0) return `${these} and every one to come`;
  const months = [...new Set(others.map((t) => monthOf(t.date)))].sort().map(label);
  const where = months.length > 2 ? `from ${months[0]} to ${months.at(-1)}` : `in ${months.join(" and ")}`;
  return `${these}, ${others.length} more ${where}, and every one to come`;
};

// A category's roll as it stands on screen: the floor's, or with the stage scrolled away the
// side panel's bar beside the list, so a coin always lands where it can be seen.
export const rollOnScreen = (category: string) => {
  const all = [...document.querySelectorAll(`[data-roll="${CSS.escape(category)}"]`)];
  const seen = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  };
  return all.find(seen) ?? all.find((el) => el.getBoundingClientRect().width > 0) ?? null;
};

// A category's wrapper colour, by its place in the list.
export const wrapperOf = (categories: { name: string }[], name: string) =>
  PAINTED_WRAPPERS[Math.max(0, categories.findIndex((c) => c.name === name)) % PAINTED_WRAPPERS.length];

// What a page can ask of the stage: file a charge from outside it, such as a queue or
// ledger row, with the coin hopping from that row to its roll. False when a coin is
// already in the air.
export type CoinStageHandle = {
  // `always` files every loose charge from the shop and teaches the rule.
  file: (tx: BoardTx, category: string, from?: Element | null, always?: boolean) => boolean;
  split: (tx: BoardTx, from?: Element | null) => boolean;
};

export function CoinStage({
  txs,
  categories,
  month,
  months,
  currentMonth,
  onMonthChange,
  onFile,
  onFileMany,
  selected = null,
  onSelect,
  figures,
  jar,
  actions,
  side = null,
  ref,
}: {
  txs: BoardTx[];
  categories: Board["categories"];
  month: string;
  months: string[];
  currentMonth: string;
  onMonthChange: (month: string) => void;
  onFile: (tx: BoardTx, category: string, always?: boolean) => Promise<boolean>;
  // A shop's stack of coins at once; with `always`, every one to come too.
  onFileMany: (txs: BoardTx[], category: string, always: boolean) => Promise<boolean>;
  // The category the page is showing on its own, marked on its roll.
  selected?: string | null;
  // With no coin in hand, a roll picks its category for the page to show.
  onSelect?: (category: string) => void;
  // More of the month in words, under the total: what the page knows beyond the rolls.
  figures?: ReactNode;
  // The page's own controls for the floor, under it on the right.
  actions?: ReactNode;
  // The Pooleks jar beside the loose change, when the household has a partner: a coin
  // dropped in is split with them. Its drawing (glad as it takes a coin) and the caption
  // under it are the page's.
  jar?: { partner: string; draw: (mood: Mood) => ReactNode; caption: ReactNode; onSplit: (tx: BoardTx) => void };
  // Where the month's rolls also stand as bars, beside the backlog on a laptop, so a row filed
  // from the list lands in a roll on screen once the stage has scrolled away.
  side?: HTMLElement | null;
  ref?: Ref<CoinStageHandle>;
}) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  // The coin under the pointer or the keyboard's focus: its label shows until it is let go.
  const [peek, setPeek] = useState<string | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [gulp, setGulp] = useState<{ category: string; n: number } | null>(null);
  const [jarGulp, setJarGulp] = useState(0);
  const [cheer, setCheer] = useState(0);
  // The month whose last loose coin just landed: it celebrates for 2.6 s, and only while it is shown.
  const [party, setParty] = useState<string | null>(null);
  const celebrating = party === month;
  const [lastFiled, setLastFiled] = useState<{ category: string; n: number } | null>(null);
  // A coin held in one month is put back when another month is shown.
  const [shown, setShown] = useState(month);
  if (shown !== month) {
    setShown(month);
    setPicked(null);
  }
  // A phone gets a shorter floor, so several rolls fit before it scrolls.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // The window's height sets the floor's, so in a short window (a laptop's) the charges' head shows under the stage.
  const [vh, setVh] = useState(1000);
  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
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
  }, [narrow]);
  // So does the side panel's, when the page gives the stage one.
  const sideRef = useRef<HTMLDivElement>(null);
  const [sideW, setSideW] = useState(300);
  useEffect(() => {
    const el = sideRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSideW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [side]);
  // The floor's width sets the columns: 84px while they fit, narrower with the count, down to 60px.
  const floorRef = useRef<HTMLDivElement>(null);
  const [floorW, setFloorW] = useState(0);
  useEffect(() => {
    const el = floorRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFloorW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [narrow]);

  const index = useMemo(() => new Map(categories.map((c, i) => [c.name, i])), [categories]);
  const wrapper = (name: string) => wrapperOf(categories, name);
  const now = paidOut(txs, month);
  const before = paidOut(txs, shiftMonth(month, -1));
  const isCurrent = month === currentMonth;

  // Every category stands on the floor, asleep when nothing is filed.
  const rolls = categories
    .filter((c) => c.name !== SAVINGS)
    .map((c) => ({ name: c.name, total: now.byCat.get(c.name) ?? 0, budget: c.budget }));
  const sleeping = rolls.filter((r) => r.total <= 0);
  // The month sorted, the rolls with money take their turns, left to right (top to bottom on a
  // phone), 70 ms apart, and the confetti takes their colours.
  const awake = rolls.filter((r) => r.total > 0);
  const cheerOf = (name: string) => {
    const k = awake.findIndex((r) => r.name === name);
    return celebrating && k >= 0 ? 0.15 + k * 0.07 : null;
  };
  const partyColours = awake.map((r) => wrapper(r.name));
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
  // The tray is one month's picture, so a coin always lands in a roll you can see
  // grow; coins from other months wait there, and the way to them is under the pile.
  const elsewhere = looseCoins(txs, null).filter((t) => monthOf(t.date) !== month);
  const elsewhereMonth = elsewhere.map((t) => monthOf(t.date)).sort().at(-1);
  const oneMonth = elsewhere.every((t) => monthOf(t.date) === elsewhereMonth);
  // This month's coins by shop: one shop's charges stand as one stack, picked by its top coin.
  const piles: BoardTx[][] = [];
  for (const t of loose) {
    const pile = piles.find((g) => g[0].rulePattern === t.rulePattern);
    if (pile) pile.push(t);
    else piles.push([t]);
  }
  const pileOf = (id: string | null) => (id ? (piles.find((g) => g[0].id === id) ?? null) : null);
  const pickedPile = pileOf(picked);
  const pickedTx = pickedPile?.[0] ?? null;
  const labelledPile = pickedPile ?? pileOf(peek);
  const labelled = labelledPile?.[0] ?? null;
  // What the switch would take: the picked coins, the shop's other loose ones in every month, and the ones to come.
  const takes = pickedPile ? alwaysTakes(pickedPile.length, looseCoins(txs, null).filter((t) => matches(t, pickedPile[0].rulePattern) && !pickedPile.includes(t))) : "";
  // Where the picked coin's shop went last time: that roll leans in, tagged, and a coin picked
  // from the keyboard hands focus to it, so a second Enter files it there.
  const suggestion = pickedTx ? lastTimeOf(txs, pickedTx) : null;
  const focusLast = useRef(false);
  const pick = (id: string, isPicked: boolean, byKey: boolean) => {
    setPicked(isPicked ? null : id);
    focusLast.current = !isPicked && byKey;
  };
  useEffect(() => {
    if (!focusLast.current) return;
    focusLast.current = false;
    if (suggestion) [...document.querySelectorAll<HTMLElement>(`[data-roll="${CSS.escape(suggestion)}"]`)].find((el) => el.getBoundingClientRect().width > 0)?.focus();
  }, [picked, suggestion]);
  const lastTag = (name: string) =>
    aim === name && (
      <span aria-hidden className="ml-1.5 inline-block rounded-full bg-ink px-1.5 align-[1px] text-[12px] font-medium leading-[18px] text-white dark:bg-chalk dark:text-ink">
        {aimTag}
      </span>
    );
  // Typing a roll's name with a coin in hand picks it, as the File menu's field does: the roll it
  // matches lifts under a tag of what was typed, the line under the pile says what Enter will do,
  // and Enter files there. Backspace takes a letter back; dropping the coin clears it.
  const [typed, setTyped] = useState("");
  const [typedFor, setTypedFor] = useState(picked);
  if (typedFor !== picked) {
    setTypedFor(picked);
    setTyped("");
  }
  const typedMatch =
    pickedTx && typed ? ((rolls.find((r) => r.name.toLowerCase().startsWith(typed)) ?? rolls.find((r) => nameMatches(r.name, typed)))?.name ?? null) : null;
  const typedHint = pickedTx && typed ? (typedMatch ? `Typed “${typed}”: Enter files it under ${typedMatch}` : `No roll matches “${typed}”`) : null;
  // The roll that lifts: the one typed, else the one the shop went to last time.
  const aim = typedMatch ?? suggestion;
  const aimTag = typedMatch ? `${typed} ↵` : "last time";
  useEffect(() => {
    if (!pickedTx) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true'], [role=menu], [role=dialog]")) return;
      if (e.key === "Backspace" && typed) setTyped((t) => t.slice(0, -1));
      else if (e.key === "Enter" && typed) {
        if (typedMatch) pressRoll(typedMatch);
      } else if (e.key.length === 1 && (/\p{L}/u.test(e.key) || (e.key === " " && typed))) setTyped((t) => t + e.key.toLowerCase());
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  // The switch, set afresh for each pick: on for a stack, a shop's charges together, as on a
  // shop's row in the list; off for one coin on its own.
  const [always, setAlways] = useState(false);
  const [alwaysFor, setAlwaysFor] = useState(picked);
  if (alwaysFor !== picked) {
    setAlwaysFor(picked);
    setAlways((pickedPile?.length ?? 0) > 1);
  }
  // A month with charges and none loose says so; one with nothing in it has nothing to file.
  const sorted = loose.length === 0 && txs.some((t) => t.amount < 0 && !t.micro && monthOf(t.date) === month);

  // One shared scale: a euro is the same height on every roll. A sleeper's limit
  // waits for its first coin, so it stretches nothing.
  const tallest = Math.max(1, ...rolls.map((r) => Math.max(r.total, r.total > 0 ? (r.budget ?? 0) : 0)));
  // The floor has the stage's full width, and in one row the height to match: the floor is the
  // picture. Its tallest roll stands 280px, less in a short window, down to 120px, so the charges
  // start on the first screen. A floor that wraps keeps the shorter 200px scale.
  const MAX = narrow ? 112 : floorFits ? Math.max(120, Math.min(280, vh - 660)) : 200;
  // A month with nothing filed yet stands its sleepers on a short floor, under a line that says so:
  // the tall one would be empty air. It grows back with the first coin.
  const empty = !narrow && rolls.every((r) => r.total <= 0);
  const px = (v: number) => (v / tallest) * MAX;
  // Each shelf of a wrapped floor is as tall as its tallest roll, limit included, with room above
  // for the "last time" tag, so a second shelf of small rolls isn't mostly air.
  const perShelf = Math.max(1, Math.floor((floorW + floorGap) / (colW + floorGap)));
  const shelfOf = (i: number) => {
    const from = Math.floor(i / perShelf) * perShelf;
    const reach = rolls.slice(from, from + perShelf).map((r) => px(Math.max(r.total, r.total > 0 ? (r.budget ?? 0) : 0)));
    return Math.min(MAX + 30, Math.max(70, ...reach.map((v) => v + 44)));
  };

  // What the tray says to a screen reader after every step: progress first, never shaming.
  let said: string;
  if (pickedTx) said = typedHint ?? `Tap the roll ${pickedTx.name} goes in.`;
  else if (celebrating || (lastFiled && loose.length === 0)) said = "All sorted! Every coin is in its roll.";
  else if (lastFiled) said = `In it goes! ${coinCount(loose.length)} to go.`;
  else said = loose.length ? `Hi! ${coinCount(loose.length)} to sort in ${label(month)}.` : `All sorted for ${label(month)}. Nice work.`;

  // The loose change: a pile of coins to pick up, and its count, in the stage's head, top
  // right, at 40px a coin.
  // A loose coin already split with the partner wears its part; it still needs a roll.
  const splitNote = (t: BoardTx) => (t.shared ? `, split with ${jar?.partner ?? "your partner"}` : "");
  const splitMark = (t: BoardTx) =>
    t.shared && (
      <span
        aria-hidden
        className="absolute -bottom-1 -right-1.5 rounded-full bg-white px-1 text-[12px] font-semibold leading-4 tabular-nums text-ink ring-1 ring-ink/10 dark:bg-card-night dark:text-chalk dark:ring-white/10"
      >
        {shareLabel(t.partnerShare)}
      </span>
    );
  const pileScale = 0.8;
  const pileCoin = 40;
  const coinFace = (g: BoardTx[], i: number, isPicked: boolean) => (
    <>
      {g
        .slice(1, 3)
        .map((t, k) => (
          <span key={t.id} aria-hidden className="absolute left-0" style={{ top: -6 * (k + 1) }}>
            <PaintedCoin size={pileCoin} metal={PILE_METALS[(i + k + 1) % PILE_METALS.length]} mood="puzzled" seed={i + k + 5} />
          </span>
        ))
        .reverse()}
      <span className="relative block">
        <PaintedCoin size={pileCoin} metal={PILE_METALS[i % PILE_METALS.length]} mood={isPicked ? "glad" : "puzzled"} seed={i + 2} />
      </span>
      {g.length > 1 ? (
        <span
          aria-hidden
          className="absolute -right-1.5 rounded-full bg-white px-1 text-[12px] font-semibold leading-4 tabular-nums text-ink ring-1 ring-ink/10 dark:bg-card-night dark:text-chalk dark:ring-white/10"
          style={{ top: -6 * Math.min(2, g.length - 1) - 4 }}
        >
          {g.length}
        </span>
      ) : (
        splitMark(g[0])
      )}
    </>
  );
  const coinName = (g: BoardTx[]) =>
    g.length > 1
      ? `${g[0].name}, ${g.length} charges, ${eur.format(g.reduce((sum, t) => sum - t.amount, 0))}. Pick up to file them all`
      : `${g[0].name}, ${eur.format(Math.abs(g[0].amount))}, ${shortDate.format(new Date(g[0].date + "T00:00:00Z"))}${splitNote(g[0])}. Pick up to file`;
  const pileBox = (
    <div className="relative size-[120px]" role="group" aria-label={`Loose change: ${loose.length} to file`}>
      {piles.slice(0, PILE.length).map((g, i) => {
        const t = g[0];
        const spot = PILE[i];
        const isPicked = picked === t.id;
        return (
          <motion.button
            key={t.id}
            type="button"
            data-coin={t.id}
            aria-pressed={isPicked}
            aria-label={coinName(g)}
            onClick={(e) => pick(t.id, isPicked, e.detail === 0)}
            onMouseEnter={() => setPeek(t.id)}
            onMouseLeave={() => setPeek((p) => (p === t.id ? null : p))}
            onFocus={() => setPeek(t.id)}
            onBlur={() => setPeek((p) => (p === t.id ? null : p))}
            className={cn("absolute rounded-full", FOCUS, flight?.tx.id === t.id && "opacity-0")}
            style={{ left: spot.x * pileScale, bottom: spot.y * pileScale, zIndex: isPicked ? 20 : 10 - i }}
            // The same start on the server, which cannot know the motion setting, and in the
            // browser; with reduced motion the coins are in place at once instead of dropping in.
            initial={{ y: -28 }}
            animate={
              isPicked
                ? { y: -16, scale: 1.18, rotate: [spot.r, spot.r - 10, spot.r + 10, spot.r] }
                : { y: 0, scale: 1, rotate: spot.r }
            }
            transition={isPicked ? { ...SPRING, rotate: { duration: 0.5 } } : reduce ? { duration: 0 } : { ...SPRING, delay: 0.2 + i * 0.05 }}
            whileHover={{ y: isPicked ? -18 : -4 }}
          >
            {coinFace(g, i, isPicked)}
          </motion.button>
        );
      })}
      {loose.length === 0 && (
        <div className="absolute inset-x-6 bottom-0 flex justify-center">
          <motion.div initial={celebrating && !reduce ? { scale: 0.5, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={SPRING}>
            <PaintedCoin size={36} mood="glad" seed={5} />
          </motion.div>
        </div>
      )}
      {celebrating && !reduce && <ConfettiBurst marks={PILE_BURST} origin={[60, 102]} colours={partyColours} />}
    </div>
  );
  const elsewhereNote = elsewhereMonth && (
    <div className={cn("text-[13px]", MUTED)}>
      <div>
        {elsewhere.length} in {oneMonth ? label(elsewhereMonth) : "other months"}
      </div>
      <button
        type="button"
        onClick={() => onMonthChange(elsewhereMonth)}
        className={cn("relative underline decoration-1 underline-offset-2 hover:text-ink dark:hover:text-white pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3.5 pointer-coarse:after:absolute pointer-coarse:after:content-['']", FOCUS)}
      >
        {oneMonth ? "Go there" : `Go to ${label(elsewhereMonth)}`}
      </button>
    </div>
  );
  // The label and the hint each sit in the slot of what they replace, the slot as tall as the taller
  // of the two, so the pile's block never changes height and the floor never moves under the pointer.
  // Under the pile, whose column is only 120px, the label may be wider than it: centred while it
  // fits the column plus the panel's padding either side, else held at the padding's right edge and
  // grown leftwards into the air, never clipped (right-to-left with "safe" centring does that).
  const countSlot = (count: ReactNode, under: boolean) => (
    <div className={cn("grid h-[30px] grid-cols-1 items-center", under ? "-mx-7 [direction:rtl] [justify-items:safe_center]" : "justify-items-start")}>
      <div className={cn("col-start-1 row-start-1 text-[13px] tabular-nums [direction:ltr]", MUTED, labelled && "invisible")}>{count}</div>
      {labelled && (
        <CoinLabel
          pile={labelledPile ?? [labelled]}
          day={under}
          // Above the floaters around the pile (they are placed, so they would paint over it).
          className={cn("relative z-10 col-start-1 row-start-1 [direction:ltr]", under && "w-max max-w-[280px]")}
        />
      )}
    </div>
  );
  // What the count says: how many wait, or, the month sorted, that it is, in Ink.
  const countText = (shown: number) => {
    // Coins on show, a stack counting all its charges.
    const onShow = piles.slice(0, shown).reduce((n, g) => n + g.length, 0);
    return loose.length > 0 ? (
      `${loose.length} to file${loose.length > onShow ? ` · ${onShow} shown` : ""}`
    ) : sorted ? (
      <span className="font-medium text-ink dark:text-chalk">All sorted for {label(month)}</span>
    ) : (
      "nothing to file"
    );
  };
  // Under the pile it grows leftwards like the count's slot, so the switch never leaves the panel;
  // beside the phone's row it wraps instead.
  const hintSlot = (hint: string, under: boolean) => (
    <div className={cn("grid min-h-[30px] grid-cols-1", under ? "-mx-7 [direction:rtl] [justify-items:safe_center]" : "justify-items-start")}>
      <div className={cn("col-start-1 row-start-1 [direction:ltr]", pickedTx && "invisible")}>{elsewhereNote}</div>
      {pickedTx && (
        <div className={cn("relative col-start-1 row-start-1 flex items-center gap-x-3 gap-y-1 text-[13px] text-ink [direction:ltr] dark:text-chalk", under ? "w-max" : "flex-wrap")}>
          <span aria-hidden>{hint}</span>
          {/* The queue's switch: set before the roll is tapped, it files the shop's every coin and teaches the rule. */}
          <button
            type="button"
            aria-pressed={always}
            onClick={() => setAlways((a) => !a)}
            aria-label={`Always: ${takes}`}
            className={cn(
              "relative inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full pl-2 pr-3 font-medium transition-transform motion-safe:active:scale-[0.96] pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-2 pointer-coarse:after:content-['']",
              always ? "bg-ink text-white dark:bg-chalk dark:text-ink" : "bg-white inset-ring-[1.5px] inset-ring-ink/15 dark:bg-card-night dark:inset-ring-white/15",
              FOCUS
            )}
          >
            <span aria-hidden className={cn("flex size-3.5 items-center justify-center rounded-full", always ? "bg-white text-ink dark:bg-ink dark:text-chalk" : "inset-ring-[1.5px] inset-ring-ink/40 dark:inset-ring-white/40")}>
              {always && <CheckIcon className="size-2.5" strokeWidth={3.5} />}
            </span>
            Always
          </button>
          {/* What it takes, while it's on. Under the pile it hangs below the switch, clear of the
              slot, so the floor never moves; beside the phone's row it takes a line of its own. */}
          {always && (
            <span aria-hidden className={cn("text-[12px]", MUTED, under ? "absolute right-0 top-full mt-1 whitespace-nowrap" : "basis-full")}>
              {takes}
            </span>
          )}
        </div>
      )}
    </div>
  );
  const pileLabel = (
    <div className="mt-3 text-center">
      <div className={cn(DISPLAY, "text-[16px] font-semibold")}>Loose change</div>
      {countSlot(countText(PILE.length), true)}
      {hintSlot(typedHint ?? "Tap its roll, or type its name", true)}
    </div>
  );

  // A lying bar's insides, on the phone's list and in the side panel: its name and amount over
  // the painted bar, on one scale for the list's width.
  const barBody = (r: (typeof rolls)[number], i: number, w: number) => {
    const over = r.budget != null && r.total > r.budget;
    const hpx = (v: number) => (v / tallest) * Math.max(60, w - 6);
    return (
      <>
        <div className="flex items-baseline justify-between gap-3 text-[15px]">
          <span className="truncate font-medium">
            {r.name}
            {lastTag(r.name)}
          </span>
          <span className="shrink-0 tabular-nums">
            <span className={over ? "font-medium" : MUTED}>{eur.format(r.total)}</span>
            {r.budget != null && <span className={MUTED}> of {limitText(r.budget)}</span>}
          </span>
        </div>
        {/* Redrawn when the list's width changes, as a roll is when its size does: with
            reduced motion a bar otherwise keeps the length of its first, guessed width. */}
        <div className={faded(r.name)}>
          <PaintedBar
            key={`w-${w}`}
            index={index.get(r.name) ?? i}
            colour={wrapper(r.name)}
            length={hpx(over ? (r.budget as number) : r.total)}
            extra={over ? hpx(r.total - (r.budget as number)) : 0}
            budget={r.budget != null ? hpx(r.budget) : null}
            over={over}
            gulping={gulp?.category === r.name}
            cheer={cheerOf(r.name)}
            width={w}
            delay={0.15 + i * 0.05}
          />
        </div>
      </>
    );
  };
  // The side panel: the month's rolls as bars beside the backlog, places to drop a row and where
  // a filed row's coin lands, growing as it does. Not buttons: the stage's rolls file a coin in hand.
  // Drawn at the end of the render, with the helpers it shares declared.
  const sidePanel = () => (
    <>
      <h2 className={cn(DISPLAY, "text-[20px] font-semibold")}>{label(month)}&rsquo;s rolls</h2>
      <p className={cn("mt-0.5 text-[13px]", MUTED)}>Drop a row on a roll</p>
      <div ref={sideRef} role="group" aria-label={`Where ${label(month)}'s money went`} className="mt-4 flex flex-col gap-2">
        {rolls
          .filter((r) => r.total > 0)
          .map((r, i) => (
            <RollTarget key={r.name} name={r.name} side>
              <div data-roll={r.name} className="rounded-xl">
                {barBody(r, i, sideW)}
              </div>
            </RollTarget>
          ))}
      </div>
      {sleeping.length > 0 && (
        <div role="group" aria-label="Categories with nothing filed yet" className="mt-4 flex flex-col gap-2">
          <div className={cn("text-[13px] font-medium", MUTED)}>Nothing yet</div>
          <div className="flex flex-wrap gap-x-[18px] gap-y-1.5">
            {sleeping.map((r) => (
              <RollTarget key={r.name} name={r.name} side inline>
                <div data-roll={r.name} className="flex min-h-11 items-center gap-2 pr-1 text-[13px] font-medium">
                  <span className={faded(r.name)}>
                    <PaintedMini index={index.get(r.name) ?? 0} colour={wrapper(r.name)} />
                  </span>
                  <span>
                    {r.name}
                    {lastTag(r.name)}
                  </span>
                </div>
              </RollTarget>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const monthHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!gulp) return;
    const t = setTimeout(() => setGulp(null), 1100);
    return () => clearTimeout(t);
  }, [gulp]);
  useEffect(() => {
    if (!jarGulp) return;
    const t = setTimeout(() => setJarGulp(0), 1100);
    return () => clearTimeout(t);
  }, [jarGulp]);
  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setParty(null), 2600);
    return () => clearTimeout(t);
  }, [cheer]);
  useEffect(() => {
    if (!lastFiled) return;
    const t = setTimeout(() => setLastFiled(null), 2200);
    return () => clearTimeout(t);
  }, [lastFiled]);
  useEffect(() => {
    if (!picked) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked]);

  const commit = (tx: BoardTx, category: string, always = false, many?: BoardTx[]) => {
    // What leaves the pile: the coin or its stack, and with the switch, the shop's every coin.
    const gone = new Set((many ?? [tx]).map((t) => t.id));
    if (always) for (const t of loose) if (matches(t, tx.rulePattern)) gone.add(t.id);
    const last = loose.length > 0 && loose.every((t) => gone.has(t.id));
    const saved = many && many.length > 1 ? onFileMany(many, category, always) : onFile(tx, category, always);
    setGulp((g) => ({ category, n: (g?.n ?? 0) + 1 }));
    setLastFiled((f) => ({ category, n: (f?.n ?? 0) + 1 }));
    // The month is cheered once the server has it: a filing that didn't save puts its coins
    // back in the pile, and nothing is celebrated or said to have gone in.
    void saved.then((ok) => {
      if (!ok) return setLastFiled(null);
      if (!last) return;
      setCheer((c) => c + 1);
      setParty(month);
    });
  };

  const commitSplit = (tx: BoardTx) => {
    jar?.onSplit(tx);
    setJarGulp((n) => n + 1);
  };
  const land = (tx: BoardTx, to: string | null, always = false, many?: BoardTx[]) => (to === null ? commitSplit(tx) : commit(tx, to, always, many));

  // A coin hops from where it lies to where it goes: the top of its roll, or the jar.
  // The change lands when the coin does. With reduced motion, or nothing on screen to
  // aim at, it lands at once. A row outside the stage keeps its page's focus, and the
  // coin hops from it.
  const fly = (tx: BoardTx, to: string | null, target: Element | null, from?: Element | null, always = false, many?: BoardTx[]) => {
    if (flight) return false;
    setPicked(null);
    if (!from) {
      // Filing on the stage disables the rolls, so the roll just pressed would
      // drop focus to the page: hand it to the next loose coin, or the month.
      const next = [...document.querySelectorAll<HTMLElement>("[data-coin]")].find((el) => el.dataset.coin !== tx.id && el.getBoundingClientRect().width > 0);
      (next ?? monthHeading.current)?.focus();
    }
    const src = from ?? document.querySelector(`[data-coin="${tx.id}"]`);
    if (reduce || !src || !target) {
      land(tx, to, always, many);
      return true;
    }
    const a = src.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    // The coin flies over the page, outside the stage, so it takes the stage's zoom itself.
    const size = 40 * (parseFloat(getComputedStyle(target.closest("section") ?? target).zoom) || 1);
    setFlight({
      tx,
      to,
      from: { x: a.left + a.width / 2 - size / 2, y: a.top + a.height / 2 - size / 2 },
      dx: b.left + b.width / 2 - (a.left + a.width / 2),
      dy: b.top - 6 - (a.top + a.height / 2),
      size,
      always,
      many,
    });
    return true;
  };
  // A charge from another month has no roll on this floor to land in.
  const file = (tx: BoardTx, category: string, from?: Element | null, always = false, many?: BoardTx[]) =>
    !!category && fly(tx, category, monthOf(tx.date) === month ? rollOnScreen(category) : null, from, always, many);
  const split = (tx: BoardTx, from?: Element | null) => !!jar && fly(tx, null, document.querySelector("[data-jar]"), from);
  useImperativeHandle(ref, () => ({ file, split }));
  // A roll takes the coin in hand; with none held, it picks its category for the page.
  const pressRoll = (name: string) => {
    if (pickedTx) file(pickedTx, name, undefined, always, pickedPile ?? undefined);
    else onSelect?.(name);
  };
  const rollAction = (name: string) =>
    pickedTx ? `. File ${pickedTx.name} here${name === suggestion ? ", where it went last time" : ""}` : onSelect ? (selected === name ? ". Show every category" : `. Show only ${name}`) : "";
  // With a category chosen, the other rolls step back, unless a coin is in hand and every roll can take it.
  // Only the painting fades: names and amounts stay readable, and so does a focus outline.
  const faded = (name: string) => cn("transition-opacity duration-200", !!selected && !pickedTx && selected !== name && "opacity-40");

  return (
    <>
      <PaintedDefs />
      <style>{`
        @keyframes coins-float { from { transform: translateY(-7px) rotate(-7deg); } to { transform: translateY(7px) rotate(7deg); } }
        .coins-float { animation: coins-float ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .coins-float { animation: none; } }
      `}</style>
      {/* The stage: the month's rolls on one floor, the loose change beside them. */}
      <section
        aria-labelledby="month-heading"
        className={cn(PANEL, "relative overflow-hidden bg-oat px-5 pb-6 pt-6 sm:px-8 sm:pt-8 dark:bg-oat-night")}
      >
        {/* Nothing floats up by the month: on the phone the marks there sat on the panel's
            edge and read as strays. On desktop the air is around the loose change. */}

        {/* One row: the month gives way and its figures wrap, so the loose change keeps its place
            beside it instead of dropping below. With the jar beside the pile too, that needs 1024px. */}
        <div className={cn("relative flex items-start justify-between gap-x-8 gap-y-4", jar && "flex-wrap lg:flex-nowrap")}>
          <div className={cn("min-w-0", jar ? "lg:flex-1" : "flex-1")}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                disabled={month <= months[0]}
                onClick={() => onMonthChange(shiftMonth(month, -1))}
                className={cn("relative -ml-2 rounded-full p-1.5 hover:bg-white disabled:opacity-30 dark:hover:bg-white/10 pointer-coarse:after:-inset-1.5 pointer-coarse:after:absolute pointer-coarse:after:content-['']", FOCUS)}
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
                className={cn("relative rounded-full p-1.5 hover:bg-white disabled:opacity-30 dark:hover:bg-white/10 pointer-coarse:after:-inset-1.5 pointer-coarse:after:absolute pointer-coarse:after:content-['']", FOCUS)}
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
            {figures && <div className={cn("mt-2 max-w-[44rem] text-balance text-[13px]", MUTED)}>{figures}</div>}
          </div>
          {!narrow && (
              // The loose change, top right: pick a coin up here, drop it on a roll below,
              // or in the Pooleks jar beside it. The air marks float in the gap between them.
              <div className="ml-auto flex shrink-0 items-start gap-[104px]">
                {jar && (
                  <div className="flex w-[164px] flex-col items-center">
                    <div className="flex h-[120px] items-end">
                      <JarTarget>
                        <motion.button
                          type="button"
                          data-jar
                          disabled={!pickedTx}
                          onClick={() => pickedTx && split(pickedTx)}
                          aria-label={pickedTx ? `Split ${pickedTx.name} with ${jar.partner}` : `Pooleks with ${jar.partner}. Pick up a coin to split it`}
                          className={cn("block rounded-[22px] disabled:cursor-default", FOCUS)}
                          animate={pickedTx && !reduce ? { y: [0, -5, 0] } : { y: 0 }}
                          transition={pickedTx ? { duration: 0.9, repeat: Infinity } : SPRING}
                          whileHover={pickedTx ? { scale: 1.06, rotate: -2 } : undefined}
                        >
                          <motion.div
                            style={{ originY: 1 }}
                            animate={jarGulp && !reduce ? { scaleY: [1, 0.88, 1.06, 1] } : { scaleY: 1 }}
                            transition={{ duration: 0.6 }}
                          >
                            {jar.draw(jarGulp ? "glad" : "happy")}
                          </motion.div>
                        </motion.button>
                      </JarTarget>
                    </div>
                    <div className="mt-3 text-center">{jar.caption}</div>
                  </div>
                )}
                <div className="relative flex w-[120px] flex-col items-center">
                  {AIR.map((f, i) => (
                    <Floater key={i} f={f} />
                  ))}
                  {pileBox}
                  {pileLabel}
                </div>
              </div>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {said}
        </p>

        {/* On a phone the rolls lie down: one list, every category in it, on one shared scale. */}
        {narrow ? (
          <div className="relative mt-5 flex flex-col gap-4">
            <div className="flex items-center gap-3" role="group" aria-label={`Loose change: ${loose.length} to file`}>
              <div className="flex items-center -space-x-1.5">
                {loose.length === 0 ? (
                  <span className="relative block">
                    <motion.span className="block" initial={celebrating && !reduce ? { scale: 0.5, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={SPRING}>
                      <PaintedCoin size={40} mood="glad" seed={5} />
                    </motion.span>
                    {celebrating && !reduce && <ConfettiBurst marks={PHONE_BURST} origin={[20, 20]} colours={partyColours} />}
                  </span>
                ) : (
                  piles.slice(0, 6).map((g, i) => {
                    const t = g[0];
                    const isPicked = picked === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        type="button"
                        data-coin={t.id}
                        aria-pressed={isPicked}
                        aria-label={coinName(g)}
                        onClick={(e) => pick(t.id, isPicked, e.detail === 0)}
                        onMouseEnter={() => setPeek(t.id)}
                        onMouseLeave={() => setPeek((p) => (p === t.id ? null : p))}
                        onFocus={() => setPeek(t.id)}
                        onBlur={() => setPeek((p) => (p === t.id ? null : p))}
                        className={cn("relative rounded-full", FOCUS, flight?.tx.id === t.id && "opacity-0")}
                        style={{ zIndex: isPicked ? 20 : 10 - i }}
                        animate={isPicked ? { y: -10, scale: 1.15, rotate: [0, -10, 10, 0] } : { y: 0, scale: 1, rotate: 0 }}
                        transition={isPicked ? { ...SPRING, rotate: { duration: 0.5 } } : SPRING}
                      >
                        {coinFace(g, i, isPicked)}
                      </motion.button>
                    );
                  })
                )}
              </div>
              <div className="min-w-0">
                <div className={cn(DISPLAY, "text-[16px] font-semibold leading-tight")}>Loose change</div>
                {countSlot(countText(6), false)}
                {hintSlot(typedHint ?? "Tap its roll below", false)}
              </div>
            </div>
            <div className="h-px bg-ink/10 dark:bg-white/10" aria-hidden />
            <div ref={listRef} role="group" aria-label={`Where ${label(month)}'s money went`} className="flex flex-col gap-2">
              {rolls.filter((r) => r.total > 0).map((r, i) => {
                return (
                  <motion.button
                    key={r.name}
                    type="button"
                    data-roll={r.name}
                    disabled={!pickedTx && !onSelect}
                    aria-pressed={onSelect && !pickedTx ? selected === r.name : undefined}
                    onClick={() => pressRoll(r.name)}
                    aria-label={`${r.name}: ${eur.format(r.total)}${limitNote(r)}${rollAction(r.name)}`}
                    className={cn("w-full rounded-xl text-left disabled:cursor-default", FOCUS)}
                    style={{ originX: 0 }}
                    animate={pickedTx && !reduce ? { x: [0, 4, 0] } : { x: 0 }}
                    // Only the nudge repeats; a press springs back once.
                    transition={pickedTx ? { x: { duration: 0.9, repeat: Infinity, delay: i * 0.06 }, default: SPRING } : SPRING}
                    // Whether there is a press never hangs on reduce, which the server doesn't
                    // know: Motion gives a pressable a tabindex, and the two renders must agree.
                    whileTap={pickedTx || onSelect ? { scale: reduce ? 1 : 0.98, transition: PRESS } : undefined}
                  >
                    {barBody(r, i, listW)}
                  </motion.button>
                );
              })}
            </div>
            {/* The categories with nothing filed yet sleep in one line after the list, each still a place to file. */}
            {sleeping.length > 0 && (
              <div role="group" aria-label="Categories with nothing filed yet" className="flex flex-col gap-2">
                <div className={cn("text-[13px] font-medium", MUTED)}>Nothing yet</div>
                <div className="flex flex-wrap gap-x-[18px] gap-y-1.5">
                  {sleeping.map((r) => (
                    <button
                      key={r.name}
                      type="button"
                      data-roll={r.name}
                      disabled={!pickedTx && !onSelect}
                      aria-pressed={onSelect && !pickedTx ? selected === r.name : undefined}
                      onClick={() => pressRoll(r.name)}
                      aria-label={`${r.name}: nothing filed yet${rollAction(r.name)}`}
                      className={cn("flex min-h-11 items-center gap-2 rounded-full pr-1 text-[13px] font-medium transition-[scale] duration-200 enabled:motion-safe:active:scale-[0.96] disabled:cursor-default", FOCUS)}
                    >
                      <span className={faded(r.name)}>
                        <PaintedMini index={index.get(r.name) ?? 0} colour={wrapper(r.name)} />
                      </span>
                      <span>
                        {r.name}
                        {lastTag(r.name)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
        <>
        {empty && <p className={cn("relative mt-6 text-[15px]", MUTED)}>Nothing filed in {label(month)} yet.</p>}
        <div className="relative mt-6 flex items-end gap-6 pb-1 sm:gap-8">
          <div
            ref={floorRef}
            role="group"
            aria-label={`Where ${label(month)}'s money went`}
            className={cn("flex flex-1 flex-wrap items-start gap-y-6", floorFits ? "justify-between" : "justify-start")}
            style={{ columnGap: floorGap }}
          >
            {rolls.map((r, i) => {
              const over = r.budget != null && r.total > r.budget;
              const colour = wrapper(r.name);
              // A narrower column gives up its side padding before its body: the body stays 44px or wider.
              const RW = Math.max(44, Math.min(60, colW - 24));
              const pad = (colW - RW) / 2;
              const H = narrow ? 150 : empty ? 56 : floorFits ? MAX + 30 : shelfOf(i);
              return (
                <div key={r.name} className="flex shrink-0 flex-col items-center" style={{ width: RW + pad * 2 }}>
                  <RollTarget name={r.name}>
                    <motion.button
                      type="button"
                      data-roll={r.name}
                      disabled={!pickedTx && !onSelect}
                      aria-pressed={onSelect && !pickedTx ? selected === r.name : undefined}
                      onClick={() => pressRoll(r.name)}
                      aria-label={`${r.name}: ${eur.format(r.total)}${limitNote(r)}${rollAction(r.name)}`}
                      className={cn("relative flex w-full items-end justify-center rounded-[22px] disabled:cursor-default", FOCUS)}
                      // Hover and press grow and squash from the floor, so the roll keeps standing on it.
                      style={{ height: H, originY: 1 }}
                      animate={pickedTx && !reduce ? { y: aim === r.name ? [0, -14, 0] : [0, -5, 0] } : { y: 0 }}
                      // Only the bob repeats; hover and press settle once.
                      transition={pickedTx ? { y: { duration: 0.9, repeat: Infinity, delay: i * 0.08 }, default: SPRING } : SPRING}
                      whileHover={pickedTx ? { scale: 1.06, rotate: -2 } : undefined}
                      // As on the bars: the press is there either way, a no-op when motion is reduced.
                      whileTap={pickedTx || onSelect ? { scale: reduce ? 1 : 0.96, transition: PRESS } : undefined}
                    >
                      {/* Clear of the face: higher over a sleeper or a hatchling, whose eyes sit above it. */}
                      {aim === r.name && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[12px] font-medium text-white dark:bg-chalk dark:text-ink"
                          style={{ bottom: px(r.total) + (px(r.total) < FACE_FROM ? 36 : 22) }}
                        >
                          {aimTag}
                        </span>
                      )}
                      <div className={faded(r.name)}>
                        {/* Keyed by width only: a floor or shelf that changes height keeps its rolls,
                            which spring to the new scale instead of rising again. */}
                        <PaintedRoll
                          key={`p-${RW}`}
                          index={index.get(r.name) ?? i}
                          colour={colour}
                          body={px(over ? (r.budget as number) : r.total)}
                          extra={over ? px(r.total - (r.budget as number)) : 0}
                          budget={r.budget != null ? px(r.budget) : null}
                          over={over}
                          gulping={gulp?.category === r.name}
                          cheer={cheerOf(r.name)}
                          height={H}
                          width={RW}
                          pad={pad}
                          delay={0.15 + i * 0.05}
                        />
                      </div>
                    </motion.button>
                  </RollTarget>
                  {/* A name may use the gap on either side and run to two lines, hyphenated where the
                      browser can; two lines are kept for every name, so the floor stays level when one wraps. */}
                  <div className="mt-3 text-center" style={{ width: RW + pad * 2 + floorGap, marginInline: -floorGap / 2 }}>
                    <div className="flex min-h-[2lh] flex-col justify-end text-[13px] font-medium leading-tight hyphens-auto wrap-anywhere">
                      <span className="line-clamp-2">{breakable(r.name)}</span>
                    </div>
                    <div className={cn("truncate text-[13px] tabular-nums", over ? "font-medium" : MUTED)}>{eur.format(r.total)}</div>
                    {r.budget != null && <div className={cn("truncate text-[12px] tabular-nums", MUTED)}>of {limitText(r.budget)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
        )}
        {actions && <div className="relative mt-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">{actions}</div>}
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
            land(flight.tx, flight.to, flight.always, flight.many);
            setFlight(null);
          }}
        >
          <PaintedCoin size={flight.size} mood="glad" seed={9} />
        </motion.div>
      )}
      {side && createPortal(sidePanel(), side)}
    </>
  );
}
