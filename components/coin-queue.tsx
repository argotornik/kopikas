"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Board, BoardTx } from "@/lib/board";
import { SAVINGS, SUBSCRIPTIONS, matches } from "@/lib/engine";
import { PaintedCoin, PaintedMini } from "@/components/painted";
import { ConfettiBurst, eur, label, looseCoins, monthOf, wrapperOf, type BurstMark } from "@/components/coin-stage";
import { DISPLAY, FOCUS, MUTED, PANEL } from "@/components/coin-look";
import { cn, shareLabel } from "@/lib/utils";

// The phone's To file tab: the backlog one coin at a time. The coin on top shows its
// merchant, amount and day; the categories wait below it as big tiles for the thumb.
// Filed, the next coin comes up. Skipped coins wait at the back until every other is done.
// When the coin's shop has more loose charges, the coin shows as a little stack and "All N,
// always" beside the question files them all with one tap and teaches the rule for the future.

// What the queue's own line says after a filing or a split, in place of a notice that would sit
// over the tiles: the start may be cut short, the rest always shows, then Always (a split's) and Undo.
export type Said = { lead: string; tail: string; undo?: () => Promise<boolean>; also?: { label: string; onClick: () => void } };

const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const count = new Intl.NumberFormat("et-EE");
const SPRING = { type: "spring" as const, stiffness: 320, damping: 26 };
// Around "All filed"'s 72px coin: up into the panel's padding and out to the sides, falling
// beside the words below it, never onto them.
const BURST: BurstMark[] = [
  { kind: "squiggle", x: -44, y: -30, s: 30, r: -25, f: 12 },
  { kind: "dot", x: 24, y: -42, s: 16, f: 12 },
  { kind: "squiggle", x: 78, y: -28, s: 30, r: 30, f: 12 },
  { kind: "dot", x: 112, y: 0, s: 18, f: 30 },
  { kind: "dot", x: -70, y: -6, s: 18, f: 30 },
  { kind: "squiggle", x: -112, y: 18, s: 30, r: 40, f: 40 },
  { kind: "dot", x: 140, y: 28, s: 16, f: 40 },
  { kind: "squiggle", x: 116, y: 56, s: 28, r: -20, f: 16 },
  { kind: "dot", x: -96, y: 62, s: 18, f: 30 },
  { kind: "dot", x: 62, y: -40, s: 14, f: 12 },
  { kind: "dot", x: -124, y: -26, s: 14, f: 30 },
];

export function CoinQueue({
  txs,
  categories,
  partner,
  onFile,
  onSplit,
  onDone,
}: {
  txs: BoardTx[];
  categories: Board["categories"];
  partner: string | null;
  // `always` files the charge's whole shop and teaches the rule, as the notice's Always does.
  // `say` gets what happened, for the queue's own line.
  onFile: (tx: BoardTx, category: string, always?: boolean, say?: (s: Said) => void) => void;
  onSplit: (tx: BoardTx, share: number, say?: (s: Said) => void) => void;
  // With nothing left to file, the way to the month.
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [skipped, setSkipped] = useState<string[]>([]);
  // Always is set for one coin at a time: the next coin starts with it off.
  const [alwaysFor, setAlwaysFor] = useState<string | null>(null);
  // What the last filing or split did, said for 6 s in the progress line's place ("Undone" for 2.5 s).
  const [said, setSaid] = useState<Said | null>(null);
  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(null), said.undo || said.also ? 6000 : 2500);
    return () => clearTimeout(t);
  }, [said]);
  const undo = (run: () => Promise<boolean>) => {
    setSaid(null);
    void run().then((ok) => ok && setSaid({ lead: "Undone", tail: "" }));
  };
  // Its words in Ink; the start gives way when the line is short of room, never Undo. The links'
  // tap areas reach 44px on a touch screen.
  const LINK = cn(
    "relative shrink-0 underline decoration-1 underline-offset-2 hover:text-ink dark:hover:text-white pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-3.5 pointer-coarse:after:content-['']",
    FOCUS
  );
  const saidLine = (s: Said) => (
    <span className="flex min-w-0 items-baseline whitespace-pre">
      <span className="truncate text-ink dark:text-chalk">{s.lead}</span>
      <span className="shrink-0 text-ink dark:text-chalk">{s.tail}</span>
      {s.also && (
        <>
          <span className="shrink-0"> · </span>
          <button type="button" onClick={() => (setSaid(null), s.also!.onClick())} className={LINK}>
            {s.also.label}
          </button>
        </>
      )}
      {s.undo && (
        <>
          <span className="shrink-0"> · </span>
          <button type="button" onClick={() => undo(s.undo!)} className={LINK}>
            Undo
          </button>
        </>
      )}
    </span>
  );

  // The tap that empties the queue gets a burst of confetti around "All filed", once.
  const [party, setParty] = useState(false);
  useEffect(() => {
    if (!party) return;
    const t = setTimeout(() => setParty(false), 2600);
    return () => clearTimeout(t);
  }, [party]);
  const all = looseCoins(txs, null);
  const queue = [...all.filter((t) => !skipped.includes(t.id)), ...all.filter((t) => skipped.includes(t.id))];
  const waiting = skipped.filter((id) => all.some((t) => t.id === id)).length;
  const tx = queue[0];
  // The shop's other loose charges, which the coin's rule would file too; and what's done so far.
  const alike = tx ? all.filter((t) => t.id !== tx.id && matches(t, tx.rulePattern)).length : 0;
  const always = !!tx && alwaysFor === tx.id;
  const filed = txs.filter((t) => t.amount < 0 && !t.micro && t.category).length;
  // Each tile carries what its category holds in the coin's month, for a sense of scale.
  const totals = new Map<string, number>();
  if (tx)
    for (const t of txs)
      if (t.category && t.amount < 0 && !t.micro && monthOf(t.date) === monthOf(tx.date))
        totals.set(t.category, (totals.get(t.category) ?? 0) - t.amount);

  if (!tx)
    return (
      <section aria-labelledby="queue-heading" className={cn(PANEL, "relative flex flex-col items-center bg-oat px-6 py-12 text-center dark:bg-oat-night")}>
        {/* Under the button, where no confetti flies, so the last filing can still be undone. */}
        <div role="status" className={cn("absolute inset-x-4 bottom-4 flex justify-center text-[13px]", MUTED)}>
          {said && saidLine(said)}
        </div>
        <span className="relative">
          <motion.span className="block" initial={party && !reduce ? { scale: 0.5, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={SPRING}>
            <PaintedCoin size={72} mood="glad" seed={5} />
          </motion.span>
          {party && !reduce && <ConfettiBurst marks={BURST} origin={[36, 36]} colours={categories.map((c) => wrapperOf(categories, c.name))} />}
        </span>
        <h2 id="queue-heading" className={cn(DISPLAY, "mt-4 text-[20px] font-semibold")}>
          All filed
        </h2>
        <p className={cn("mt-1 text-[15px]", MUTED)}>Every charge has its roll.</p>
        <button
          type="button"
          onClick={onDone}
          className={cn("mt-5 h-11 rounded-full bg-ink px-5 text-[15px] font-medium text-white dark:bg-chalk dark:text-ink", FOCUS)}
        >
          See the month
        </button>
      </section>
    );

  return (
    <section aria-labelledby="queue-heading" className={cn(PANEL, "bg-oat px-3 pb-4 pt-5 dark:bg-oat-night")}>
      <div className={cn("flex justify-between gap-3 px-1 text-[13px] tabular-nums", MUTED)}>
        {/* Progress first: what's done, then what's left; after a filing, what it did. */}
        <span role="status" className="flex min-w-0">
          {said ? (
            saidLine(said)
          ) : (
            <span>
              <span className="font-medium text-ink dark:text-chalk">{count.format(filed)} filed</span> · {count.format(queue.length)} to go
            </span>
          )}
        </span>
        {!said && waiting > 0 && <span className="shrink-0">{waiting} skipped</span>}
      </div>
      {/* The coin on top: it hops out as it is filed, and the next one drops in. Room for a
          two-line name and the "more from here" line, so Skip and Split stay put from coin to coin. */}
      <div className="relative mt-2 flex min-h-[185px] flex-col items-center justify-end text-center" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={tx.id}
            className="flex w-full flex-col items-center"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.7, transition: { duration: 0.2 } }}
            transition={SPRING}
          >
            {/* With more from the same shop, the coin is the top of a little stack. */}
            <span className="relative">
              {alike > 0 && (
                <span aria-hidden className="absolute left-5 top-1.5 rotate-[8deg]">
                  <PaintedCoin size={68} metal="brass" mood="puzzled" seed={(queue.length % 5) + 3} />
                </span>
              )}
              <span className={cn("relative block", alike > 0 && "-translate-x-2.5")}>
                <PaintedCoin size={76} mood="puzzled" seed={(queue.length % 5) + 2} />
              </span>
            </span>
            <h2 id="queue-heading" className={cn(DISPLAY, "mt-3 line-clamp-2 text-[20px] font-semibold leading-tight")}>
              {tx.name}
            </h2>
            <p className={cn("mt-1 text-[15px] tabular-nums", MUTED)}>
              {eur.format(tx.amount)} · {day.format(new Date(tx.date + "T00:00:00Z"))}
              {tx.shared && partner ? ` · ${partner} pays ${shareLabel(tx.partnerShare)}` : ""}
            </p>
            {alike > 0 && <p className={cn("text-[13px] tabular-nums", MUTED)}>and {count.format(alike)} more from here</p>}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Skip and Split are outlined, so the tiles are the only solid things to tap. */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setSkipped((s) => [...s.filter((id) => id !== tx.id), tx.id])}
          disabled={queue.length < 2}
          className={cn("h-11 flex-1 rounded-full inset-ring-[1.5px] inset-ring-ink/15 text-[15px] font-medium transition-transform disabled:opacity-40 motion-safe:active:scale-[0.96] dark:inset-ring-white/15", FOCUS)}
        >
          Skip
        </button>
        {partner && (
          <button
            type="button"
            onClick={() => onSplit(tx, 0.5, setSaid)}
            disabled={tx.shared}
            aria-label={tx.shared ? `Split with ${partner} already` : `Split with ${partner}, who pays 1/2`}
            className={cn("h-11 flex-[2] rounded-full inset-ring-[1.5px] inset-ring-ink/15 text-[15px] font-medium transition-transform disabled:opacity-40 motion-safe:active:scale-[0.96] dark:inset-ring-white/15", FOCUS)}
          >
            Split with {partner}
          </button>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between gap-2 px-1">
        <p className="text-[15px] font-medium">Where do I go?</p>
        {/* Set before the tap, beside the choices it changes: file the whole shop and teach the rule. */}
        <button
          type="button"
          aria-pressed={always}
          onClick={() => setAlwaysFor(always ? null : tx.id)}
          aria-label={alike > 0 ? `All ${alike + 1}, always: file every charge from ${tx.name} the same way, now and to come` : `Always: file every ${tx.name} charge to come the same way`}
          className={cn(
            "relative -my-1 inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full pl-2 pr-3 text-[13px] font-medium transition-transform motion-safe:active:scale-[0.96] pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-2 pointer-coarse:after:content-['']",
            always ? "bg-ink text-white dark:bg-chalk dark:text-ink" : "bg-white inset-ring-[1.5px] inset-ring-ink/15 dark:bg-card-night dark:inset-ring-white/15",
            FOCUS
          )}
        >
          <span aria-hidden className={cn("flex size-3.5 items-center justify-center rounded-full", always ? "bg-white text-ink dark:bg-ink dark:text-chalk" : "inset-ring-[1.5px] inset-ring-ink/40 dark:inset-ring-white/40")}>
            {always && <CheckIcon className="size-2.5" strokeWidth={3.5} />}
          </span>
          {alike > 0 ? `All ${count.format(alike + 1)}, always` : "Always"}
        </button>
      </div>
      <div role="group" aria-label={`Categories for ${tx.name}`} className="mt-2 grid grid-cols-2 gap-2">
        {categories.map((c, i) => {
          const total = totals.get(c.name) ?? 0;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                const wide = always && c.name !== SUBSCRIPTIONS;
                if ((wide ? alike + 1 : 1) === queue.length) setParty(true);
                onFile(tx, c.name, wide, setSaid);
              }}
              aria-label={`File under ${c.name}${c.name === SAVINGS ? "" : `, ${eur.format(total)} in ${label(monthOf(tx.date))}`}`}
              className={cn(
                "flex min-h-14 items-center gap-2.5 rounded-2xl bg-white py-2 pl-2.5 pr-3 text-left transition-transform hover:bg-mist motion-safe:active:scale-[0.96] dark:bg-card-night dark:hover:bg-card-night-hover",
                FOCUS
              )}
            >
              {/* The tile's roll in miniature: awake while it holds money in the coin's month, asleep with nothing. */}
              <PaintedMini index={i} colour={wrapperOf(categories, c.name)} awake={c.name === SAVINGS || total > 0} />
              <span className="min-w-0">
                <span className="line-clamp-2 break-words text-[13px] font-medium leading-tight hyphens-auto">{c.name}</span>
                {c.name !== SAVINGS && <span className={cn("block text-[12px] tabular-nums", MUTED)}>{eur.format(total)}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
