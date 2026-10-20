"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Board, BoardTx } from "@/lib/board";
import { SAVINGS } from "@/lib/engine";
import { DISPLAY, FOCUS, MUTED, PANEL } from "@/components/coin-look";
// The hand both looks share: the painted faces blink with its keyframes.
import type { Mood } from "@/components/goofy";
import { PAINTED_CONFETTI, PAINTED_WRAPPERS, PaintedBar, PaintedCoin, PaintedDefs, PaintedMini, PaintedRoll } from "@/components/painted";
import { RollingNumber } from "@/components/rolling-number";
import { cn, shareLabel } from "@/lib/utils";

// The coin tray's stage, painted: the month, its total and the loose change in the head, the
// rolls on the floor below. The page that shows it owns the month and decides what
// filing does; the stage picks a coin up, flies it to its roll and hands it over.

export const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });
export const eurWhole = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
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
  { kind: "squiggle", x: -63, y: 62, s: 30, d: 8, c: 0, r: 6 },
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

// A roll as a place to drop a ledger row dragged onto it, when the page lets rows be dragged.
function RollTarget({ name, children }: { name: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `roll:${name}` });
  return (
    <div ref={setNodeRef} className={cn("w-full transition-transform duration-150", isOver && "scale-[1.06]")}>
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
type Flight = { tx: BoardTx; to: string | null; from: { x: number; y: number }; dx: number; dy: number; size: number };

// Unfiled money, newest first: the coins in the pile, and the queue's rows. One
// month's, or every month's when `month` is null. Round-ups are never loose.
export const looseCoins = (txs: BoardTx[], month: string | null) =>
  txs
    .filter((t) => t.amount < 0 && !t.category && !t.micro && (month === null || monthOf(t.date) === month))
    .sort((a, b) => b.date.localeCompare(a.date));

// A category's wrapper colour, by its place in the list.
export const wrapperOf = (categories: { name: string }[], name: string) =>
  PAINTED_WRAPPERS[Math.max(0, categories.findIndex((c) => c.name === name)) % PAINTED_WRAPPERS.length];

// What a page can ask of the stage: file a charge from outside it, such as a queue or
// ledger row, with the coin hopping from that row to its roll. False when a coin is
// already in the air.
export type CoinStageHandle = {
  file: (tx: BoardTx, category: string, from?: Element | null) => boolean;
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
  selected = null,
  onSelect,
  figures,
  jar,
  actions,
  ref,
}: {
  txs: BoardTx[];
  categories: Board["categories"];
  month: string;
  months: string[];
  currentMonth: string;
  onMonthChange: (month: string) => void;
  onFile: (tx: BoardTx, category: string) => void;
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
  ref?: Ref<CoinStageHandle>;
}) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [gulp, setGulp] = useState<{ category: string; n: number } | null>(null);
  const [jarGulp, setJarGulp] = useState(0);
  const [cheer, setCheer] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
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
  const pickedTx = loose.find((t) => t.id === picked) ?? null;

  // One shared scale: a euro is the same height on every roll. A sleeper's limit
  // waits for its first coin, so it stretches nothing.
  const tallest = Math.max(1, ...rolls.map((r) => Math.max(r.total, r.total > 0 ? (r.budget ?? 0) : 0)));
  // The floor has the stage's full width, and in one row the height to match: the floor is the
  // picture. A floor that wraps keeps the shorter stage, so its second shelf isn't mostly air.
  const tall = !narrow && floorFits;
  const MAX = narrow ? 112 : tall ? 280 : 200;
  // A month with nothing filed yet stands its sleepers on a short floor, under a line that says so:
  // the tall one would be empty air. It grows back with the first coin.
  const empty = !narrow && rolls.every((r) => r.total <= 0);
  const px = (v: number) => (v / tallest) * MAX;

  // What the tray says to a screen reader after every step: progress first, never shaming.
  let said: string;
  if (pickedTx) said = `Tap the roll ${pickedTx.name} goes in.`;
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
  const pileBox = (
    <div className="relative size-[120px]" role="group" aria-label={`Loose change: ${loose.length} to file`}>
      {loose.slice(0, PILE.length).map((t, i) => {
        const spot = PILE[i];
        const isPicked = picked === t.id;
        return (
          <motion.button
            key={t.id}
            type="button"
            data-coin={t.id}
            aria-pressed={isPicked}
            aria-label={`${t.name}, ${eur.format(Math.abs(t.amount))}, ${shortDate.format(new Date(t.date + "T00:00:00Z"))}${splitNote(t)}. Pick up to file`}
            onClick={() => setPicked(isPicked ? null : t.id)}
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
            <PaintedCoin size={pileCoin} metal={PILE_METALS[i % PILE_METALS.length]} mood={isPicked ? "glad" : "puzzled"} seed={i + 2} />
            {splitMark(t)}
          </motion.button>
        );
      })}
      {loose.length === 0 && (
        <div className="absolute inset-x-6 bottom-0 flex justify-center">
          <PaintedCoin size={36} mood="glad" seed={5} />
        </div>
      )}
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
        className={cn("underline decoration-1 underline-offset-2 hover:text-ink dark:hover:text-white", FOCUS)}
      >
        {oneMonth ? "Go there" : `Go to ${label(elsewhereMonth)}`}
      </button>
    </div>
  );
  const pileLabel = (
    <div className="mt-3 text-center">
      <div className={cn(DISPLAY, "text-[16px] font-semibold")}>Loose change</div>
      <div className={cn("text-[13px] tabular-nums", MUTED)}>
        {loose.length === 0 ? "nothing to file" : `${loose.length} to file${loose.length > PILE.length ? ` · ${PILE.length} shown` : ""}`}
      </div>
      {elsewhereNote}
    </div>
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
    if (last) setCheer((c) => c + 1);
  };

  const commitSplit = (tx: BoardTx) => {
    jar?.onSplit(tx);
    setJarGulp((n) => n + 1);
  };
  const land = (tx: BoardTx, to: string | null) => (to === null ? commitSplit(tx) : commit(tx, to));

  // A coin hops from where it lies to where it goes: the top of its roll, or the jar.
  // The change lands when the coin does. With reduced motion, or nothing on screen to
  // aim at, it lands at once. A row outside the stage keeps its page's focus, and the
  // coin hops from it.
  const fly = (tx: BoardTx, to: string | null, target: Element | null, from?: Element | null) => {
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
      land(tx, to);
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
    });
    return true;
  };
  // A charge from another month has no roll on this floor to land in.
  const file = (tx: BoardTx, category: string, from?: Element | null) =>
    !!category && fly(tx, category, monthOf(tx.date) === month ? document.querySelector(`[data-roll="${CSS.escape(category)}"]`) : null, from);
  const split = (tx: BoardTx, from?: Element | null) => !!jar && fly(tx, null, document.querySelector("[data-jar]"), from);
  useImperativeHandle(ref, () => ({ file, split }));
  // A roll takes the coin in hand; with none held, it picks its category for the page.
  const pressRoll = (name: string) => {
    if (pickedTx) file(pickedTx, name);
    else onSelect?.(name);
  };
  const rollAction = (name: string) =>
    pickedTx ? `. File ${pickedTx.name} here` : onSelect ? (selected === name ? ". Show every category" : `. Show only ${name}`) : "";
  // With a category chosen, the other rolls step back, unless a coin is in hand and every roll can take it.
  const faded = (name: string) => !!selected && !pickedTx && selected !== name && "opacity-40";

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

        {/* One row from 1024px: the month gives way and its figures wrap, so the jar and the
            loose change keep their place beside it instead of dropping below. */}
        <div className="relative flex flex-wrap items-start justify-between gap-x-8 gap-y-4 lg:flex-nowrap">
          <div className="min-w-0 lg:flex-1">
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
                        aria-label={`${t.name}, ${eur.format(Math.abs(t.amount))}, ${shortDate.format(new Date(t.date + "T00:00:00Z"))}${splitNote(t)}. Pick up to file`}
                        onClick={() => setPicked(isPicked ? null : t.id)}
                        className={cn("relative rounded-full", FOCUS, flight?.tx.id === t.id && "opacity-0")}
                        style={{ zIndex: isPicked ? 20 : 10 - i }}
                        animate={isPicked ? { y: -10, scale: 1.15, rotate: [0, -10, 10, 0] } : { y: 0, scale: 1, rotate: 0 }}
                        transition={isPicked ? { ...SPRING, rotate: { duration: 0.5 } } : SPRING}
                      >
                        <PaintedCoin size={40} metal={PILE_METALS[i % PILE_METALS.length]} mood={isPicked ? "glad" : "puzzled"} seed={i + 2} />
                        {splitMark(t)}
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
                {elsewhereNote}
              </div>
            </div>
            <div className="h-px bg-ink/10 dark:bg-white/10" aria-hidden />
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
                    disabled={!pickedTx && !onSelect}
                    aria-pressed={onSelect && !pickedTx ? selected === r.name : undefined}
                    onClick={() => pressRoll(r.name)}
                    aria-label={`${r.name}: ${eur.format(r.total)}${limitNote(r)}${rollAction(r.name)}`}
                    className={cn("w-full rounded-xl text-left transition-opacity duration-200 disabled:cursor-default", faded(r.name), FOCUS)}
                    style={{ originX: 0 }}
                    animate={pickedTx && !reduce ? { x: [0, 4, 0] } : { x: 0 }}
                    // Only the nudge repeats; a press springs back once.
                    transition={pickedTx ? { x: { duration: 0.9, repeat: Infinity, delay: i * 0.06 }, default: SPRING } : SPRING}
                    // Whether there is a press never hangs on reduce, which the server doesn't
                    // know: Motion gives a pressable a tabindex, and the two renders must agree.
                    whileTap={pickedTx || onSelect ? { scale: reduce ? 1 : 0.98, transition: PRESS } : undefined}
                  >
                    <div className="flex items-baseline justify-between gap-3 text-[15px]">
                      <span className="truncate font-medium">{r.name}</span>
                      <span className="shrink-0 tabular-nums">
                        <span className={over ? "font-medium" : MUTED}>{eur.format(r.total)}</span>
                        {r.budget != null && <span className={MUTED}> of {limitText(r.budget)}</span>}
                      </span>
                    </div>
                    {/* Redrawn when the list's width changes, as a roll is when its size does: with
                        reduced motion a bar otherwise keeps the length of its first, guessed width. */}
                    <PaintedBar
                      key={`w-${listW}`}
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
                      className={cn("flex min-h-11 items-center gap-2 rounded-full pr-1 text-[13px] font-medium transition-[opacity,scale] duration-200 enabled:motion-safe:active:scale-[0.96] disabled:cursor-default", faded(r.name), FOCUS)}
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
        <>
        {empty && <p className={cn("relative mt-6 text-[15px]", MUTED)}>Nothing filed in {label(month)} yet.</p>}
        <div className="relative mt-6 flex items-end gap-6 overflow-x-auto pb-1 sm:gap-8 lg:overflow-visible">
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
              const H = narrow ? 150 : empty ? 56 : tall ? 310 : 230;
              return (
                <div key={r.name} className={cn("flex shrink-0 flex-col items-center transition-opacity duration-200", faded(r.name))} style={{ width: RW + pad * 2 }}>
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
                      animate={pickedTx && !reduce ? { y: [0, -5, 0] } : { y: 0 }}
                      // Only the bob repeats; hover and press settle once.
                      transition={pickedTx ? { y: { duration: 0.9, repeat: Infinity, delay: i * 0.08 }, default: SPRING } : SPRING}
                      whileHover={pickedTx ? { scale: 1.06, rotate: -2 } : undefined}
                      // As on the bars: the press is there either way, a no-op when motion is reduced.
                      whileTap={pickedTx || onSelect ? { scale: reduce ? 1 : 0.96, transition: PRESS } : undefined}
                    >
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
        {actions && <div className="relative mt-4 flex justify-end">{actions}</div>}
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
            land(flight.tx, flight.to);
            setFlight(null);
          }}
        >
          <PaintedCoin size={flight.size} mood="glad" seed={9} />
        </motion.div>
      )}
    </>
  );
}
