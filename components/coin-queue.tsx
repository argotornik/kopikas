"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Board, BoardTx } from "@/lib/board";
import { SAVINGS } from "@/lib/engine";
import { PaintedCoin } from "@/components/painted";
import { eur, label, looseCoins, monthOf, wrapperOf } from "@/components/coin-stage";
import { DISPLAY, FOCUS, MUTED, PANEL } from "@/components/coin-look";
import { cn, shareLabel } from "@/lib/utils";

// The phone's To file tab: the backlog one coin at a time. The coin on top shows its
// merchant, amount and day; the categories wait below it as big tiles for the thumb.
// Filed, the next coin comes up. Skipped coins wait at the back until every other is done.

const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const SPRING = { type: "spring" as const, stiffness: 320, damping: 26 };

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
  onFile: (tx: BoardTx, category: string) => void;
  onSplit: (tx: BoardTx, share: number) => void;
  // With nothing left to file, the way to the month.
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [skipped, setSkipped] = useState<string[]>([]);
  const all = looseCoins(txs, null);
  const queue = [...all.filter((t) => !skipped.includes(t.id)), ...all.filter((t) => skipped.includes(t.id))];
  const waiting = skipped.filter((id) => all.some((t) => t.id === id)).length;
  const tx = queue[0];
  // Each tile carries what its category holds in the coin's month, for a sense of scale.
  const totals = new Map<string, number>();
  if (tx)
    for (const t of txs)
      if (t.category && t.amount < 0 && !t.micro && monthOf(t.date) === monthOf(tx.date))
        totals.set(t.category, (totals.get(t.category) ?? 0) - t.amount);

  if (!tx)
    return (
      <section aria-labelledby="queue-heading" className={cn(PANEL, "flex flex-col items-center bg-oat px-6 py-12 text-center dark:bg-oat-night")}>
        <PaintedCoin size={72} mood="glad" seed={5} />
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
      <div className={cn("flex justify-between px-1 text-[13px] tabular-nums", MUTED)}>
        <span>{queue.length} to file</span>
        {waiting > 0 && <span>{waiting} skipped</span>}
      </div>
      {/* The coin on top: it hops out as it is filed, and the next one drops in. Room for a
          two-line name, so Skip and Split below stay put from coin to coin. */}
      <div className="relative mt-2 flex min-h-[165px] flex-col items-center justify-end text-center" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={tx.id}
            className="flex w-full flex-col items-center"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.7, transition: { duration: 0.2 } }}
            transition={SPRING}
          >
            <PaintedCoin size={76} mood="happy" seed={(queue.length % 5) + 2} />
            <h2 id="queue-heading" className={cn(DISPLAY, "mt-3 line-clamp-2 text-[20px] font-semibold leading-tight")}>
              {tx.name}
            </h2>
            <p className={cn("mt-1 text-[15px] tabular-nums", MUTED)}>
              {eur.format(tx.amount)} · {day.format(new Date(tx.date + "T00:00:00Z"))}
              {tx.shared && partner ? ` · ${partner} pays ${shareLabel(tx.partnerShare)}` : ""}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setSkipped((s) => [...s.filter((id) => id !== tx.id), tx.id])}
          disabled={queue.length < 2}
          className={cn("h-11 flex-1 rounded-full bg-white text-[15px] font-medium disabled:opacity-40 dark:bg-card-night", FOCUS)}
        >
          Skip
        </button>
        {partner && (
          <button
            type="button"
            onClick={() => onSplit(tx, 0.5)}
            disabled={tx.shared}
            aria-label={tx.shared ? `Split with ${partner} already` : `Split with ${partner}, who pays 1/2`}
            className={cn("h-11 flex-[2] rounded-full bg-white text-[15px] font-medium disabled:opacity-40 dark:bg-card-night", FOCUS)}
          >
            Split with {partner}
          </button>
        )}
      </div>
      <p className="mt-5 px-1 text-[15px] font-medium">Where does it go?</p>
      <div role="group" aria-label={`Categories for ${tx.name}`} className="mt-2 grid grid-cols-2 gap-2">
        {categories.map((c) => {
          const total = totals.get(c.name) ?? 0;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onFile(tx, c.name)}
              aria-label={`File under ${c.name}${c.name === SAVINGS ? "" : `, ${eur.format(total)} in ${label(monthOf(tx.date))}`}`}
              className={cn(
                "flex min-h-14 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-left transition-transform hover:bg-mist motion-safe:active:scale-[0.96] dark:bg-card-night dark:hover:bg-card-night-hover",
                FOCUS
              )}
            >
              <span aria-hidden className="h-5 w-6 shrink-0 rounded-[8px]" style={{ background: wrapperOf(categories, c.name, true) }} />
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
