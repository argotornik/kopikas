"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, SettingsIcon, UsersIcon } from "lucide-react";
import type { Board, BoardTx } from "@/lib/board";
import { SUBSCRIPTIONS } from "@/lib/engine";
import { act } from "@/lib/act";
import { announceError, announceUndoable } from "@/components/toaster";
import { PaintedCoin } from "@/components/painted";
import { CoinStage, DISPLAY, FOCUS, MUTED, PANEL, eur, label, looseCoins, monthOf, shortDate, wrapperOf, type CoinStageHandle } from "@/components/coin-stage";
import { MerchantIcon } from "@/components/merchant-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

// The new board, growing at /coins until it can take over from the one at /: the
// coin tray on top, the charges below. The old board's features come over one by
// one, in the new look, on the same server actions.

const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const OAT = "bg-[#EFEBE3] dark:bg-[#1F1D22]";

function sinceLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Synced just now";
  const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (mins < 60) return `Synced ${rel.format(-mins, "minute")}`;
  if (mins < 48 * 60) return `Synced ${rel.format(-Math.round(mins / 60), "hour")}`;
  return `Synced ${rel.format(-Math.round(mins / 1440), "day")}`;
}

export function CoinBoard({ initial, syncedAt, fontClass }: { initial: Board; syncedAt?: string | null; fontClass: string }) {
  const [board, setBoard] = useState(initial);
  const [month, setMonth] = useState(initial.month);
  // Back to the first month with a charge; forward to this one.
  const months = useMemo(
    () => [board.txs.reduce((m, t) => (monthOf(t.date) < m ? monthOf(t.date) : m), initial.month), initial.month],
    [board.txs, initial.month]
  );
  const [synced, setSynced] = useState<string | null>(null);
  useEffect(() => setSynced(sinceLabel(syncedAt)), [syncedAt]);
  const stage = useRef<CoinStageHandle>(null);
  const categories = board.categories;
  // One month at a time, as on the tray; the rest wait in their own months.
  const loose = looseCoins(board.txs, month);
  const looseElsewhere = looseCoins(board.txs, null).filter((t) => monthOf(t.date) !== month);
  const elsewhereMonth = looseElsewhere.map((t) => monthOf(t.date)).sort().at(-1);

  // The board after a change: what the server sent back with its answer, or a
  // fresh read. If the change saved but the read fails, the change still stands.
  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/board", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setBoard(await res.json());
    } catch {
      announceError("The board couldn't refresh. Reload to see the latest.", () => window.location.reload());
    }
  }, []);
  const run = useCallback(
    async (action: object) => {
      const result = await act<Board>(action, "board");
      if (result.ok) {
        if (result.fresh) setBoard(result.fresh);
        else await refetch();
      }
      return result;
    },
    [refetch]
  );

  // A coin files at once, as just this one: it is in its roll before the server
  // answers, and the notice offers Always beside Undo. The Subscriptions roll
  // tracks the charge as a subscription, which always means always.
  const onFile = (tx: BoardTx, category: string) => {
    setBoard((b) => ({
      ...b,
      txs: b.txs.map((t) => (t.id === tx.id ? { ...t, category, categorySource: "override" as const } : t)),
      uncategorizedCount: b.uncategorizedCount - 1,
    }));
    const subscription = category === SUBSCRIPTIONS;
    void run(subscription ? { type: "subscribe", txId: tx.id } : { type: "override", txId: tx.id, category }).then((r) => {
      if (!r.ok) {
        announceError(r.error);
        return refetch();
      }
      if (subscription) return announceUndoable(`Now tracking ${tx.name} as a subscription.`, r.undo, refetch);
      announceUndoable(`Filed ${tx.name} under ${category}.`, r.undo, refetch, {
        label: "Always",
        onClick: () => void teachAlways(tx, category),
      });
    });
  };
  const teachAlways = async (tx: BoardTx, category: string) => {
    const r = await run({ type: "rule", txId: tx.id, category });
    if (!r.ok) return announceError(r.error);
    announceUndoable(`Every ${tx.name} charge now goes under ${category}.`, r.undo, refetch);
  };

  const ledger = board.txs.filter((t) => monthOf(t.date) === month).sort((a, b) => b.date.localeCompare(a.date));
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

  return (
    <div
      className={cn(
        fontClass,
        "relative isolate min-h-dvh overflow-x-clip bg-white text-[#16171C] selection:bg-[#FFB020]/40 dark:bg-[#0F1015] dark:text-[#F3F2EE]"
      )}
    >
      <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-6">
        <header className="flex items-center gap-x-6 gap-y-3 py-5">
          <div className="flex items-center gap-3">
            <PaintedCoin size={38} seed={3} />
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
          {/* The stage: the month's rolls on one floor, its loose change beside them. */}
          <CoinStage
            ref={stage}
            txs={board.txs}
            categories={categories}
            month={month}
            months={months}
            currentMonth={initial.month}
            onMonthChange={setMonth}
            onFile={onFile}
            look="painted"
          />

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <aside className="flex flex-col gap-8 lg:col-start-2 lg:row-start-1">
              {/* The same loose change as the pile, as rows: the way to file from the keyboard. */}
              <section aria-labelledby="tofile-heading" className={cn(PANEL, OAT, "p-5 sm:p-6")}>
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
                {elsewhereMonth && (
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

            <section aria-labelledby="ledger-heading" className={cn(PANEL, OAT, "min-w-0 p-5 sm:p-6 lg:col-start-1 lg:row-start-1")}>
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
                              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: wrapperOf(categories, t.category, true) }} />
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
              {days.length === 0 && <p className={cn("pt-3 text-[15px]", MUTED)}>No charges in this month yet.</p>}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
