"use client";

import type { Board, BoardTx } from "@/lib/board";
import { wobblyRect } from "@/components/goofy";
import { deepened } from "@/components/painted";
import { FOCUS, MUTED, eur, eurWhole, label, monthOf, shiftMonth, wrapperOf } from "@/components/coin-stage";
import { cn } from "@/lib/utils";

// A chosen roll's year, in the tray's head where the month's figures sit otherwise: a
// bar for each of the last twelve months, drawn like the rolls (a darker top past the
// limit, the limit dashed), the month on show at full strength. A bar takes the tray to
// its month. The average leaves out the unfinished month and those before the charges
// start, as on the old board.

// One month's column in the drawing, which scales with the space it gets.
const COL = 440 / 12;
const GAP = 6;
const H = 48;
const narrowMonth = new Intl.DateTimeFormat("en-GB", { month: "narrow", timeZone: "UTC" });
const limitText = (b: number) => (Number.isInteger(b) ? eurWhole : eur).format(b);

export function CoinYear({
  txs,
  categories,
  category,
  month,
  currentMonth,
  earliest,
  onMonth,
}: {
  txs: BoardTx[];
  categories: Board["categories"];
  category: string;
  // The month on show, and this one, the last of the twelve.
  month: string;
  currentMonth: string;
  // The first month with a charge: bars before it have nothing to say.
  earliest: string;
  onMonth: (month: string) => void;
}) {
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonth, i - 11));
  // The same rule as the roll: what left the account under this category, round-ups aside.
  const totals = months.map((m) =>
    txs.reduce((sum, t) => (t.category === category && t.amount < 0 && !t.micro && monthOf(t.date) === m ? sum - t.amount : sum), 0)
  );
  const past = totals.filter((_, i) => months[i] !== currentMonth && months[i] >= earliest);
  const average = past.length ? past.reduce((a, b) => a + b, 0) / past.length : 0;
  const limit = categories.find((c) => c.name === category)?.budget ?? null;
  const scale = H / Math.max(...totals, limit ?? 0, 1);
  const colour = wrapperOf(categories, category, true);
  const seed = Math.max(0, categories.findIndex((c) => c.name === category)) * 977 + 13;
  const note = [average > 0 && `on average ${eur.format(average)}`, limit != null && `limit ${limitText(limit)}`].filter(Boolean).join(" · ");

  return (
    <div className="max-w-[440px] pt-1">
      <p className="flex flex-wrap items-baseline gap-x-2.5">
        <span className="font-medium text-[#16171C] dark:text-[#F3F2EE]">{category}, the last 12 months</span>
        {note && <span>{note}</span>}
      </p>
      <div className="relative mt-1.5">
        <div role="group" aria-label={`${category} in each of the last 12 months`} className="grid grid-cols-12">
          {months.map((m, i) => {
            const before = m < earliest;
            const shown = m === month;
            const v = totals[i];
            const h = Math.max(3, v * scale);
            const spill = limit != null && v > limit ? (v - limit) * scale + 3 : 0;
            return (
              <button
                key={m}
                type="button"
                disabled={before}
                onClick={() => onMonth(m)}
                aria-pressed={shown}
                aria-label={before ? `${label(m)}: before your charges start` : `${label(m)}: ${eur.format(v)}`}
                className={cn("group flex flex-col items-center rounded-lg disabled:cursor-default", FOCUS)}
              >
                <svg viewBox={`0 0 ${COL} ${H}`} aria-hidden className="block w-full overflow-visible">
                  {!before && (
                    <g className={cn("transition-opacity", !shown && "opacity-55 group-hover:opacity-80")}>
                      <path d={wobblyRect(GAP / 2, H - h, COL - GAP, h, 7, seed + i * 101, 0.8, 32)} fill={colour} />
                      {spill > 0 && (
                        <path d={wobblyRect(GAP / 2, H - h, COL - GAP, spill, Math.min(7, spill / 2), seed + i * 101 + 3, 0.6, 32)} style={{ fill: deepened(colour) }} />
                      )}
                    </g>
                  )}
                </svg>
                <span className={cn("mt-1 text-[12px] leading-none", shown ? "font-medium text-[#16171C] dark:text-[#F3F2EE]" : MUTED, before && "opacity-40")}>
                  {narrowMonth.format(new Date(m + "-01T00:00:00Z"))}
                </span>
              </button>
            );
          })}
        </div>
        {/* The limit across all twelve, over the bars: the same dashes as a roll's outline. */}
        {limit != null && (
          <svg viewBox={`0 0 440 ${H}`} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 block w-full overflow-visible">
            <line x1="0" x2="440" y1={H - limit * scale} y2={H - limit * scale} stroke={colour} strokeOpacity="0.85" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
}
