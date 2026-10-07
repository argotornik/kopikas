"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Board, BoardTx } from "@/lib/board";
import { SAVINGS } from "@/lib/engine";
import { CoinMark } from "@/components/coin-mark";
import { MerchantIcon } from "@/components/merchant-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });
const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// The dyes of the striped skirts, held flat, madder red leading. A category
// takes its dye from its place in the list, so a renamed or added one still
// gets one and neighbours never share a hue. Dark lifts each a step.
const DYES = [
  ["#B4302C", "#D24A42"], // madder red
  ["#E2B232", "#E8BE4A"], // saffron
  ["#27387A", "#5068C0"], // indigo
  ["#D9722A", "#E8853C"], // orange
  ["#2E7A4D", "#3E9963"], // birch green
  ["#D9809A", "#E393A9"], // rose
  ["#4D8CC6", "#69A4D8"], // sky
  ["#6E3A73", "#9A5CA0"], // plum
  ["#8C9A3A", "#A6B44E"], // moss
  ["#8A4630", "#B0634A"], // rust
  ["#1C1C21", "#4A4B57"], // black
  ["#2B8484", "#3BA3A3"], // teal
  ["#8D8A82", "#A19E95"], // stone
] as const;

// Undyed warp: what has left the account but is not woven into a stripe yet.
const WARP =
  "bg-[#DCD6C8] bg-[repeating-linear-gradient(90deg,rgb(0_0_0/0.18)_0_1px,transparent_1px_5px)] dark:bg-[#4A473F] dark:bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.16)_0_1px,transparent_1px_5px)]";
const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";
const MUTED = "text-[#5E616B] dark:text-[#A3A5B0]";
const RULE = "border-[rgb(23_24_29/0.10)] dark:border-[rgb(236_235_230/0.10)]";
const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17181D] dark:focus-visible:outline-[#ECEBE6]";

type Dyed = CSSProperties & { "--dye": string; "--dye-dark": string };
const dyeVars = (i: number) => ({ "--dye": DYES[i % DYES.length][0], "--dye-dark": DYES[i % DYES.length][1] }) as Dyed;
const DYE_BG = "bg-[var(--dye)] dark:bg-[var(--dye-dark)]";

const monthOf = (date: string) => date.slice(0, 7);
const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1 + by, 1)).toISOString().slice(0, 7);
};
const label = (m: string) => monthName.format(new Date(m + "-01T00:00:00Z"));

function sinceLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Synced just now";
  const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (mins < 60) return `Synced ${rel.format(-mins, "minute")}`;
  if (mins < 48 * 60) return `Synced ${rel.format(-Math.round(mins / 60), "hour")}`;
  return `Synced ${rel.format(-Math.round(mins / 1440), "day")}`;
}

// What left the account in a month, by category; savings set aside, shared
// costs at full price (the board's Paid out). Unfiled money is the warp.
function paidOut(txs: BoardTx[], month: string) {
  const byCat = new Map<string, number>();
  let loose = 0;
  for (const t of txs) {
    if (t.amount >= 0 || monthOf(t.date) !== month || t.category === SAVINGS) continue;
    if (t.category) byCat.set(t.category, (byCat.get(t.category) ?? 0) - t.amount);
    else loose -= t.amount;
  }
  const total = [...byCat.values()].reduce((a, b) => a + b, 0) + loose;
  return { byCat, loose, total };
}

export function StripesPrototype({
  initial,
  syncedAt,
  fontClass,
}: {
  initial: Board;
  syncedAt?: string | null;
  fontClass: string;
}) {
  const [txs, setTxs] = useState(initial.txs);
  const months = useMemo(() => [...new Set(initial.txs.map((t) => monthOf(t.date)))].sort(), [initial.txs]);
  // The current month when it has anything in it, else the latest that does.
  const [month, setMonth] = useState(() => (months.includes(initial.month) ? initial.month : months.at(-1) ?? initial.month));
  const [focus, setFocus] = useState<string | null>(null);
  const [only, setOnly] = useState<string | null>(null);
  const [took, setTook] = useState<string | null>(null);
  const [ambient, setAmbient] = useState(true);
  const [synced, setSynced] = useState<string | null>(null);
  useEffect(() => setSynced(sinceLabel(syncedAt)), [syncedAt]);

  const categories = initial.categories;
  const dyeIndex = useMemo(() => new Map(categories.map((c, i) => [c.name, i])), [categories]);
  const now = paidOut(txs, month);
  const before = paidOut(txs, shiftMonth(month, -1));
  const isCurrent = month === initial.month;

  const stripes = categories
    .filter((c) => c.name !== SAVINGS && (now.byCat.get(c.name) ?? 0) > 0)
    .map((c) => ({ name: c.name, total: now.byCat.get(c.name) ?? 0, budget: c.budget, dye: dyeVars(dyeIndex.get(c.name) ?? 0) }));
  const savings = txs
    .filter((t) => t.amount < 0 && t.category === SAVINGS && monthOf(t.date) === month)
    .reduce((s, t) => s - t.amount, 0);

  const looseHere = txs
    .filter((t) => t.amount < 0 && !t.category && monthOf(t.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const looseElsewhere = txs.filter((t) => t.amount < 0 && !t.category && monthOf(t.date) !== month);
  const elsewhereMonth = looseElsewhere.map((t) => monthOf(t.date)).sort().at(-1);

  const ledger = txs
    .filter((t) => monthOf(t.date) === month && (!only || t.category === only))
    .sort((a, b) => b.date.localeCompare(a.date));
  const days = useMemo(() => {
    const out: { day: string; rows: BoardTx[] }[] = [];
    for (const t of ledger) {
      const last = out.at(-1);
      if (last?.day === t.date) last.rows.push(t);
      else out.push({ day: t.date, rows: [t] });
    }
    return out;
  }, [ledger]);

  // The next loose charge is already waiting: filing one moves focus to the
  // one that took its place.
  const selects = useRef<(HTMLSelectElement | null)[]>([]);
  const refocus = useRef<number | null>(null);
  useEffect(() => {
    if (refocus.current == null) return;
    const i = Math.min(refocus.current, selects.current.length - 1);
    refocus.current = null;
    selects.current[i]?.focus();
  });
  useEffect(() => {
    if (!took) return;
    const t = setTimeout(() => setTook(null), 900);
    return () => clearTimeout(t);
  }, [took]);

  const file = (tx: BoardTx, category: string, index: number) => {
    if (!category) return;
    refocus.current = index;
    setTxs((all) => all.map((t) => (t.id === tx.id ? { ...t, category, categorySource: "override" } : t)));
    setTook(category);
  };

  // The ambient field is the month's own colours at their proportions,
  // blended: a gradient with one stop at the middle of each stripe.
  const field = useMemo(() => {
    if (!stripes.length) return "transparent";
    let at = 0;
    const stops = stripes.map((s) => {
      const mid = ((at + s.total / 2) / now.total) * 100;
      at += s.total;
      return `var(--f${dyeIndex.get(s.name)}) ${mid.toFixed(1)}%`;
    });
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, [stripes, now.total, dyeIndex]);
  const fieldVars = Object.fromEntries(
    stripes.map((s) => [`--f${dyeIndex.get(s.name)}`, `var(--fd${dyeIndex.get(s.name)}, ${s.dye["--dye"]})`])
  );
  const fieldDarkVars = Object.fromEntries(stripes.map((s) => [`--fd${dyeIndex.get(s.name)}`, s.dye["--dye-dark"]]));

  return (
    <div
      className={cn(
        fontClass,
        "relative isolate min-h-dvh overflow-x-clip bg-[#F5F6F4] text-[#17181D] selection:bg-[#B4302C]/20 dark:bg-[#10121A] dark:text-[#ECEBE6] dark:selection:bg-[#D24A42]/30"
      )}
    >
      <style>{`
        @keyframes stripes-weave { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes stripes-took { 0% { filter: brightness(1.35) saturate(1.15); } 100% { filter: none; } }
        @keyframes stripes-drift { from { transform: translateX(-5%) scaleX(1.1); } to { transform: translateX(5%) scaleX(1.25); } }
        .dark .stripes-field { ${Object.entries(fieldDarkVars).map(([k, v]) => `${k}: ${v};`).join(" ")} }
      `}</style>

      {/* The month's colours, blended and drifting behind the top of the page. */}
      {ambient && (
        <div
          aria-hidden
          className="stripes-field pointer-events-none absolute inset-x-[-12%] top-0 -z-10 h-[460px] opacity-[0.16] [mask-image:linear-gradient(to_bottom,black,transparent)] motion-safe:animate-[stripes-drift_26s_ease-in-out_infinite_alternate] dark:opacity-[0.22]"
          style={{ backgroundImage: field, ...fieldVars }}
        />
      )}

      <div className={cn("border-b text-xs", RULE)}>
        <div className={cn("mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 sm:px-6", MUTED)}>
          <span>
            <span className="font-semibold text-[#17181D] dark:text-[#ECEBE6]">Prototype</span> · striped skirts · filing here is not saved
          </span>
          <button
            type="button"
            aria-pressed={ambient}
            onClick={() => setAmbient((a) => !a)}
            className={cn("underline decoration-1 underline-offset-2 hover:text-[#17181D] dark:hover:text-[#ECEBE6]", FOCUS)}
          >
            Background colour {ambient ? "on" : "off"}
          </button>
          <a href="/" className={cn("ml-auto underline decoration-1 underline-offset-2 hover:text-[#17181D] dark:hover:text-[#ECEBE6]", FOCUS)}>
            Back to the current board
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-6">
        <header className="flex flex-wrap items-center gap-x-6 gap-y-3 py-5">
          <div className="flex min-w-0 flex-col">
            <h1 className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight">
              <CoinMark />
              Kopikas
            </h1>
            {synced && <p className={cn("text-[13px]", MUTED)}>{synced}</p>}
          </div>
          <nav aria-label="Pages" className="ml-auto flex items-center gap-1 text-sm">
            <a href="/pooleks" className={cn("rounded-md px-2.5 py-1.5 hover:bg-[rgb(23_24_29/0.06)] dark:hover:bg-[rgb(236_235_230/0.08)]", FOCUS)}>
              Pooleks
            </a>
            <a href="/settings" className={cn("rounded-md px-2.5 py-1.5 hover:bg-[rgb(23_24_29/0.06)] dark:hover:bg-[rgb(236_235_230/0.08)]", FOCUS)}>
              Settings
            </a>
            <ThemeToggle />
          </nav>
        </header>

        <main>
          <section aria-labelledby="month-heading" className="pt-2">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    disabled={month <= months[0]}
                    onClick={() => (setMonth(shiftMonth(month, -1)), setOnly(null))}
                    className={cn("-ml-2 rounded-md p-1.5 hover:bg-[rgb(23_24_29/0.06)] disabled:opacity-30 dark:hover:bg-[rgb(236_235_230/0.08)]", FOCUS)}
                  >
                    <ChevronLeftIcon className="size-4" aria-hidden />
                  </button>
                  <h2 id="month-heading" className="text-[28px] font-semibold leading-none tracking-[-0.02em]">
                    {label(month)}
                  </h2>
                  <button
                    type="button"
                    aria-label="Next month"
                    disabled={month >= (months.at(-1) ?? month)}
                    onClick={() => (setMonth(shiftMonth(month, 1)), setOnly(null))}
                    className={cn("rounded-md p-1.5 hover:bg-[rgb(23_24_29/0.06)] disabled:opacity-30 dark:hover:bg-[rgb(236_235_230/0.08)]", FOCUS)}
                  >
                    <ChevronRightIcon className="size-4" aria-hidden />
                  </button>
                </div>
                <p className={cn("mt-2 text-[15px]", MUTED)}>
                  Paid out {isCurrent ? "so far" : "in " + label(month)}{" "}
                  <span className="font-semibold tabular-nums text-[#17181D] dark:text-[#ECEBE6]">{eur.format(now.total)}</span>
                  {before.total > 0 && (
                    <>
                      {" "}· {label(shiftMonth(month, -1))} in full <span className="tabular-nums">{eur.format(before.total)}</span>
                    </>
                  )}
                </p>
              </div>
              <p className="flex items-center gap-2 text-[15px]">
                {looseHere.length > 0 ? (
                  <>
                    <span aria-hidden className={cn("inline-block h-4 w-3 rounded-[2px]", WARP)} />
                    <span>
                      <span className="font-semibold tabular-nums">{looseHere.length}</span> to file
                    </span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="size-4 text-[#2E7A4D] dark:text-[#3E9963]" aria-hidden />
                    Everything in {label(month)} is filed
                  </>
                )}
              </p>
            </div>

            {/* The band: every stripe a category at its share of what was paid out. */}
            <div
              role="group"
              aria-label={`Where ${label(month)}'s money went`}
              className="mt-5 flex h-24 w-full gap-[2px] motion-safe:animate-[stripes-weave_1.1s_cubic-bezier(0.16,1,0.3,1)_both] sm:h-36"
              onMouseLeave={() => setFocus(null)}
            >
              {stripes.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  style={{ flexGrow: s.total, ...s.dye }}
                  aria-label={`${s.name}: ${eur.format(s.total)}, ${Math.round((s.total / now.total) * 100)}% of the month`}
                  aria-pressed={only === s.name}
                  onMouseEnter={() => setFocus(s.name)}
                  onFocus={() => setFocus(s.name)}
                  onBlur={() => setFocus(null)}
                  onClick={() => setOnly((o) => (o === s.name ? null : s.name))}
                  className={cn(
                    "h-full min-w-[3px] basis-0 cursor-pointer transition-[flex-grow,opacity] duration-700 first:rounded-l-[3px]",
                    EASE,
                    DYE_BG,
                    FOCUS,
                    focus && focus !== s.name && "opacity-35",
                    only && only !== s.name && !focus && "opacity-35",
                    took === s.name && "animate-[stripes-took_0.9s_ease-out]"
                  )}
                />
              ))}
              {now.loose > 0 && (
                <div
                  role="img"
                  aria-label={`${eur.format(now.loose)} not filed yet`}
                  style={{ flexGrow: now.loose }}
                  className={cn("h-full min-w-[6px] basis-0 rounded-r-[3px] transition-[flex-grow] duration-700", EASE, WARP)}
                />
              )}
            </div>

            {/* The key, on the same grid as the band: names under the stripes wide enough to carry one. */}
            <div aria-hidden className="mt-2 hidden w-full gap-[2px] sm:flex">
              {stripes.map((s) => (
                <div
                  key={s.name}
                  style={{ flexGrow: s.total }}
                  className={cn(
                    "@container min-w-[3px] basis-0 transition-[flex-grow,opacity] duration-700",
                    EASE,
                    focus && focus !== s.name && "opacity-35"
                  )}
                >
                  <div className="hidden pr-2 @min-[84px]:block">
                    <div className="truncate text-[13px] font-medium">{s.name}</div>
                    <div className={cn("truncate text-[13px] tabular-nums", MUTED)}>{eur.format(s.total)}</div>
                  </div>
                </div>
              ))}
              {now.loose > 0 && (
                <div style={{ flexGrow: now.loose }} className={cn("@container min-w-[6px] basis-0 transition-[flex-grow] duration-700", EASE)}>
                  <div className="hidden @min-[84px]:block">
                    <div className="truncate text-[13px] font-medium">To file</div>
                    <div className={cn("truncate text-[13px] tabular-nums", MUTED)}>{eur.format(now.loose)}</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
            <aside className="flex flex-col gap-10 lg:col-start-2 lg:row-start-1">
              <section aria-labelledby="tofile-heading">
                <h2 id="tofile-heading" className={cn("flex items-baseline justify-between border-b pb-2 text-[15px] font-semibold", RULE)}>
                  To file
                  <span className={cn("text-[13px] font-normal tabular-nums", MUTED)}>{label(month)}</span>
                </h2>
                {looseHere.length === 0 ? (
                  <p className={cn("py-4 text-[15px]", MUTED)}>Nothing loose in {label(month)}. Every charge is in a stripe.</p>
                ) : (
                  <ul>
                    {looseHere.map((t, i) => (
                      <li key={t.id} className={cn("flex flex-col gap-2 border-b py-3", RULE)}>
                        <div className="flex items-center gap-3">
                          <MerchantIcon name={t.name} domain={t.domain} emoji={t.emoji} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-medium">{t.name}</div>
                            <div className={cn("text-[13px]", MUTED)}>{shortDate.format(new Date(t.date + "T00:00:00Z"))}</div>
                          </div>
                          <div className="text-[15px] tabular-nums">{eur.format(t.amount)}</div>
                        </div>
                        <div className="relative">
                          <select
                            ref={(el) => {
                              selects.current[i] = el;
                            }}
                            defaultValue=""
                            aria-label={`File ${t.name}, ${eur.format(Math.abs(t.amount))}, under`}
                            onChange={(e) => file(t, e.target.value, i)}
                            className={cn(
                              "h-9 w-full cursor-pointer appearance-none rounded-md border bg-transparent pl-3 pr-8 text-[15px]",
                              "border-[rgb(23_24_29/0.22)] hover:border-[rgb(23_24_29/0.4)] dark:border-[rgb(236_235_230/0.22)] dark:hover:border-[rgb(236_235_230/0.4)]",
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
                          <ChevronDownIcon aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 opacity-60" />
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
                      onClick={() => (setMonth(elsewhereMonth), setOnly(null))}
                      className={cn("underline decoration-1 underline-offset-2 hover:text-[#17181D] dark:hover:text-[#ECEBE6]", FOCUS)}
                    >
                      Go to {label(elsewhereMonth)}
                    </button>
                  </p>
                )}
              </section>

              <section aria-labelledby="stripes-heading">
                <h2 id="stripes-heading" className={cn("border-b pb-2 text-[15px] font-semibold", RULE)}>
                  Categories
                </h2>
                <ul>
                  {stripes.map((s) => {
                    const over = s.budget != null && s.total > s.budget;
                    return (
                      <li
                        key={s.name}
                        style={s.dye}
                        onMouseEnter={() => setFocus(s.name)}
                        onMouseLeave={() => setFocus(null)}
                        className={cn("border-b py-2.5 transition-opacity", RULE, focus && focus !== s.name && "opacity-45")}
                      >
                        <div className="flex items-center gap-3">
                          <span aria-hidden className={cn("h-4 w-1.5 shrink-0 rounded-[1px]", DYE_BG)} />
                          <span className="min-w-0 flex-1 truncate text-[15px]">{s.name}</span>
                          <span className="text-[15px] tabular-nums">{eur.format(s.total)}</span>
                        </div>
                        {s.budget != null && (
                          <div className="mt-2 flex items-center gap-3 pl-[18px]">
                            <div className={cn("h-1 flex-1 overflow-hidden rounded-full bg-[rgb(23_24_29/0.08)] dark:bg-[rgb(236_235_230/0.10)]")}>
                              <div className={cn("h-full", DYE_BG)} style={{ width: `${Math.min(100, (s.total / s.budget) * 100)}%` }} />
                            </div>
                            <span className={cn("text-[13px] tabular-nums", MUTED)}>
                              {over ? `${eur.format(s.total - s.budget)} past its limit` : `${eur.format(s.budget - s.total)} left`}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {savings > 0 && (
                  <p className={cn("pt-3 text-[13px]", MUTED)}>
                    Savings: <span className="tabular-nums">{eur.format(savings)}</span> set aside, not counted as paid out.
                  </p>
                )}
              </section>
            </aside>

            <section aria-labelledby="ledger-heading" className="min-w-0 lg:col-start-1 lg:row-start-1">
              <h2 id="ledger-heading" className={cn("flex items-baseline justify-between border-b pb-2 text-[15px] font-semibold", RULE)}>
                {only ? `${only} in ${label(month)}` : "Every charge"}
                {only && (
                  <button
                    type="button"
                    onClick={() => setOnly(null)}
                    className={cn("text-[13px] font-normal underline decoration-1 underline-offset-2", MUTED, FOCUS)}
                  >
                    Show all
                  </button>
                )}
              </h2>
              {days.map((d) => (
                <div key={d.day}>
                  <h3 className="pb-1 pt-5 text-[13px] font-semibold">{dayName.format(new Date(d.day + "T00:00:00Z"))}</h3>
                  <ul>
                    {d.rows.map((t) => {
                      const i = t.category ? dyeIndex.get(t.category) : undefined;
                      return (
                        <li
                          key={t.id}
                          className={cn(
                            "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 border-b py-2.5 transition-opacity sm:grid-cols-[28px_minmax(0,1fr)_160px_104px]",
                            RULE,
                            focus && t.category !== focus && "opacity-40"
                          )}
                        >
                          <MerchantIcon name={t.name} domain={t.domain} emoji={t.emoji} />
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-medium">{t.name}</div>
                            <div className={cn("truncate text-[13px] sm:hidden", MUTED)}>
                              {[t.note, t.amount >= 0 ? "Received" : (t.category ?? "To file")].filter(Boolean).join(" · ")}
                            </div>
                            {t.note && <div className={cn("hidden truncate text-[13px] sm:block", MUTED)}>{t.note}</div>}
                          </div>
                          <div className="hidden min-w-0 items-center gap-2 text-[13px] sm:flex">
                            {t.amount >= 0 ? (
                              <span className={MUTED}>Received</span>
                            ) : t.category && i !== undefined ? (
                              <>
                                <span aria-hidden style={dyeVars(i)} className={cn("h-3.5 w-1.5 shrink-0 rounded-[1px]", DYE_BG)} />
                                <span className="truncate">{t.category}</span>
                              </>
                            ) : (
                              <>
                                <span aria-hidden className={cn("h-3.5 w-1.5 shrink-0 rounded-[1px]", WARP)} />
                                <span className="truncate font-medium">To file</span>
                              </>
                            )}
                          </div>
                          <div
                            className={cn(
                              "text-right text-[15px] tabular-nums",
                              t.amount >= 0 && "text-[#2E7A4D] dark:text-[#3E9963]"
                            )}
                          >
                            {t.amount >= 0 ? "+" : ""}
                            {eur.format(t.amount)}
                          </div>
                        </li>
                      );
                    })}
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
