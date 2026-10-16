"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, SettingsIcon, UsersIcon } from "lucide-react";
import type { Board, BoardTx } from "@/lib/board";
import { GOOFY_CSS } from "@/components/goofy";
import { PaintedCoin, PaintedDefs } from "@/components/painted";
import { Coin, CoinStage, DISPLAY, FOCUS, MUTED, PANEL, eur, label, looseCoins, monthOf, shortDate, wrapperOf, type CoinStageHandle } from "@/components/coin-stage";
import { MerchantIcon } from "@/components/merchant-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function sinceLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Synced just now";
  const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (mins < 60) return `Synced ${rel.format(-mins, "minute")}`;
  if (mins < 48 * 60) return `Synced ${rel.format(-Math.round(mins / 60), "hour")}`;
  return `Synced ${rel.format(-Math.round(mins / 1440), "day")}`;
}

export function CoinsPrototype({ initial, syncedAt, fontClass }: { initial: Board; syncedAt?: string | null; fontClass: string }) {
  const [txs, setTxs] = useState(initial.txs);
  const months = useMemo(() => [...new Set(initial.txs.map((t) => monthOf(t.date)))].sort(), [initial.txs]);
  // The current month when it has anything in it, else the latest that does.
  const [month, setMonth] = useState(() => (months.includes(initial.month) ? initial.month : months.at(-1) ?? initial.month));
  const [look, setLook] = useState<"painted" | "goofy">("painted");
  const painted = look === "painted";
  const [synced, setSynced] = useState<string | null>(null);
  useEffect(() => setSynced(sinceLabel(syncedAt)), [syncedAt]);
  const stage = useRef<CoinStageHandle>(null);
  const categories = initial.categories;
  const loose = looseCoins(txs, month);
  const looseElsewhere = txs.filter((t) => t.amount < 0 && !t.category && monthOf(t.date) !== month);
  const elsewhereMonth = looseElsewhere.map((t) => monthOf(t.date)).sort().at(-1);

  const ledger = txs.filter((t) => monthOf(t.date) === month).sort((a, b) => b.date.localeCompare(a.date));
  const days: { day: string; rows: BoardTx[] }[] = [];
  for (const t of ledger) {
    const last = days.at(-1);
    if (last?.day === t.date) last.rows.push(t);
    else days.push({ day: t.date, rows: [t] });
  }

  // The next loose coin is already waiting: filing one moves focus to the
  // queue row that took its place.
  const selects = useRef<(HTMLSelectElement | null)[]>([]);
  const refocus = useRef<number | null>(null);
  useEffect(() => {
    if (refocus.current == null) return;
    const i = Math.min(refocus.current, selects.current.length - 1);
    refocus.current = null;
    selects.current[i]?.focus();
  });

  // Filing here is not saved: the change lives in this page's copy of the month.
  const onFile = (tx: BoardTx, category: string) =>
    setTxs((all) => all.map((t) => (t.id === tx.id ? { ...t, category, categorySource: "override" } : t)));

  return (
    <div
      className={cn(
        fontClass,
        "relative isolate min-h-dvh overflow-x-clip bg-white text-[#16171C] selection:bg-[#FFB020]/40 dark:bg-[#0F1015] dark:text-[#F3F2EE]"
      )}
    >
      <PaintedDefs />
      <style>{`
        .coins-display { font-family: var(--font-coins-display), ui-rounded, system-ui, sans-serif; }
        @keyframes coins-float { from { transform: translateY(-7px) rotate(-7deg); } to { transform: translateY(7px) rotate(7deg); } }
        .coins-float { animation: coins-float ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .coins-float { animation: none; } }
        ${GOOFY_CSS}
      `}</style>

      <div className="border-b border-[#16171C]/10 text-xs dark:border-white/10">
        <div className={cn("mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 sm:px-6", MUTED)}>
          <span>
            <span className="font-semibold text-[#16171C] dark:text-[#F3F2EE]">Prototype</span>
            <span className="hidden sm:inline"> · the coin tray · filing here is not saved</span>
          </span>
          <span className="flex items-center gap-1" role="group" aria-label="Look">
            Look:
            {(["painted", "goofy"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={look === l}
                onClick={() => setLook(l)}
                className={cn(
                  "rounded-full px-2 py-0.5 hover:text-[#16171C] dark:hover:text-white",
                  look === l && "bg-[#16171C] text-white hover:text-white dark:bg-white dark:text-[#16171C] dark:hover:text-[#16171C]",
                  FOCUS
                )}
              >
                {l === "painted" ? "Painted, after KAIA" : "Goofy"}
              </button>
            ))}
          </span>
          <a href="/stripes" className={cn("hidden underline decoration-1 underline-offset-2 hover:text-[#16171C] sm:inline dark:hover:text-white", FOCUS)}>
            Compare with the stripes
          </a>
          <a href="/" className={cn("ml-auto underline decoration-1 underline-offset-2 hover:text-[#16171C] dark:hover:text-white", FOCUS)}>
            <span className="sm:hidden">Board</span>
            <span className="hidden sm:inline">Back to the current board</span>
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-6">
        <header className="flex items-center gap-x-6 gap-y-3 py-5">
          <div className="flex items-center gap-3">
            {painted ? <PaintedCoin size={38} seed={3} /> : <Coin size={38} blink={1.3} />}
            <div>
              <h1 className={cn(DISPLAY, "text-[26px] font-semibold leading-none tracking-[-0.01em]")}>Kopikas</h1>
              {synced && <p className={cn("mt-1 text-[13px]", MUTED)}>{synced}</p>}
            </div>
          </div>
          <nav aria-label="Pages" className="ml-auto flex items-center gap-1.5 text-[15px] font-medium">
            <a
              href="/pooleks"
              aria-label="Pooleks"
              className={cn("rounded-full p-2.5 hover:bg-[#F4F5F7] sm:px-3.5 sm:py-2 dark:hover:bg-[#191B22]", FOCUS)}
            >
              <UsersIcon aria-hidden className="size-5 sm:hidden" />
              <span className="hidden sm:inline">Pooleks</span>
            </a>
            <a
              href="/settings"
              aria-label="Settings"
              className={cn("rounded-full p-2.5 hover:bg-[#F4F5F7] sm:px-3.5 sm:py-2 dark:hover:bg-[#191B22]", FOCUS)}
            >
              <SettingsIcon aria-hidden className="size-5 sm:hidden" />
              <span className="hidden sm:inline">Settings</span>
            </a>
            <ThemeToggle />
          </nav>
        </header>

        <main>
          {/* The stage: the month's rolls on one floor, the loose change beside them. */}
          <CoinStage
            ref={stage}
            txs={txs}
            categories={categories}
            month={month}
            months={months}
            currentMonth={initial.month}
            onMonthChange={setMonth}
            onFile={onFile}
            look={look}
          />

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <aside className="flex flex-col gap-8 lg:col-start-2 lg:row-start-1">
              <section aria-labelledby="tofile-heading" className={cn(PANEL, "p-5 sm:p-6", painted && "bg-[#EFEBE3] dark:bg-[#1F1D22]")}>
                <h2 id="tofile-heading" className={cn(DISPLAY, "flex items-baseline justify-between text-[20px] font-semibold")}>
                  To file
                  <span className={cn("font-sans text-[13px] font-normal tabular-nums", MUTED)}>{label(month)}</span>
                </h2>
                {loose.length === 0 ? (
                  <p className={cn("pt-3 text-[15px]", MUTED)}>Nothing loose in {label(month)}.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {loose.map((t, i) => (
                      <li key={t.id} data-queue={t.id} className="rounded-2xl bg-white p-3 dark:bg-[#23252E]">
                        <div className="flex items-center gap-3">
                          <MerchantIcon name={t.name} domain={t.domain} emoji={t.emoji} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-medium">{t.name}</div>
                            <div className={cn("text-[13px]", MUTED)}>{shortDate.format(new Date(t.date + "T00:00:00Z"))}</div>
                          </div>
                          <div className="text-[15px] tabular-nums">{eur.format(t.amount)}</div>
                        </div>
                        <div className="relative mt-2.5">
                          <select
                            ref={(el) => {
                              selects.current[i] = el;
                            }}
                            defaultValue=""
                            aria-label={`File ${t.name}, ${eur.format(Math.abs(t.amount))}, under`}
                            onChange={(e) => {
                              if (stage.current?.file(t, e.target.value, true)) refocus.current = i;
                            }}
                            className={cn(
                              "h-10 w-full cursor-pointer appearance-none rounded-full border-2 border-[#16171C]/10 bg-[#F4F5F7] pl-4 pr-9 text-[15px] font-medium hover:border-[#16171C]/25 dark:border-white/10 dark:bg-[#191B22] dark:hover:border-white/25",
                              FOCUS
                            )}
                          >
                            <option value="" disabled>
                              File under…
                            </option>
                            {categories.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDownIcon aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 opacity-60" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {looseElsewhere.length > 0 && elsewhereMonth && (
                  <p className={cn("pt-3 text-[13px]", MUTED)}>
                    {looseElsewhere.length} more in other months.{" "}
                    <button
                      type="button"
                      onClick={() => setMonth(elsewhereMonth)}
                      className={cn("underline decoration-1 underline-offset-2 hover:text-[#16171C] dark:hover:text-white", FOCUS)}
                    >
                      Go to {label(elsewhereMonth)}
                    </button>
                  </p>
                )}
              </section>
            </aside>

            <section
              aria-labelledby="ledger-heading"
              className={cn(PANEL, "min-w-0 p-5 sm:p-6 lg:col-start-1 lg:row-start-1", painted && "bg-[#EFEBE3] dark:bg-[#1F1D22]")}
            >
              <h2 id="ledger-heading" className={cn(DISPLAY, "text-[20px] font-semibold")}>
                Every charge
              </h2>
              {days.map((d) => (
                <div key={d.day}>
                  <h3 className={cn("pb-1 pt-5 text-[13px] font-medium", MUTED)}>{dayName.format(new Date(d.day + "T00:00:00Z"))}</h3>
                  <ul className="flex flex-col">
                    {d.rows.map((t) => (
                      <li
                        key={t.id}
                        className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-2xl px-2 py-2.5 hover:bg-white sm:grid-cols-[28px_minmax(0,1fr)_150px_100px] dark:hover:bg-[#23252E]"
                      >
                        <MerchantIcon name={t.name} domain={t.domain} emoji={t.emoji} />
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-medium">{t.name}</div>
                          <div className={cn("truncate text-[13px] sm:hidden", MUTED)}>
                            {[t.note, t.amount >= 0 ? "Received" : (t.category ?? "To file")].filter(Boolean).join(" · ")}
                          </div>
                          {t.note && <div className={cn("hidden truncate text-[13px] sm:block", MUTED)}>{t.note}</div>}
                        </div>
                        <div className="hidden min-w-0 sm:block">
                          {t.amount >= 0 ? (
                            <span className={cn("text-[13px]", MUTED)}>Received</span>
                          ) : t.category ? (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[13px] font-medium dark:bg-[#23252E]">
                              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: wrapperOf(categories, t.category, painted) }} />
                              <span className="truncate">{t.category}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-[#16171C]/20 px-2.5 py-0.5 text-[13px] font-medium dark:border-white/25">
                              To file
                            </span>
                          )}
                        </div>
                        <div className={cn("text-right text-[15px] font-medium tabular-nums", t.amount >= 0 && "text-[#0A763F] dark:text-[#4FD18B]")}>
                          {t.amount >= 0 ? "+" : ""}
                          {eur.format(t.amount)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
