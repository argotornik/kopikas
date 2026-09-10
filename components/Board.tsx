"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  RepeatIcon,
  SearchIcon,
  SettingsIcon,
  SproutIcon,
  XIcon,
} from "lucide-react";
import type { Board as BoardData, BoardTx, Spark } from "@/lib/board";
import { CATEGORIES, SAVINGS } from "@/lib/engine";
import { cn, shareLabel } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { CoinMark } from "@/components/coin-mark";
import { MerchantIcon } from "@/components/merchant-icon";
import { UserMenu } from "@/components/user-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

type Prompt = { txId: string; merchant: string; category: string };

// View state carried in the URL (?cat=&month=&q=) so filtered views deep-link.
type ViewParams = { cat?: string; month?: string; q?: string };

export default function Board({ initial, view }: { initial: BoardData; view?: ViewParams }) {
  const [board, setBoard] = useState(initial);
  const [activeTx, setActiveTx] = useState<BoardTx | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [snapOpen, setSnapOpen] = useState(false);
  // Category filter: a category name, "Uncategorized", or null for the full feed.
  const [filter, setFilter] = useState<string | null>(() =>
    view?.cat && (view.cat === "Uncategorized" || view.cat === "Incoming" || CATEGORIES.includes(view.cat))
      ? view.cat
      : null
  );
  // Free-text search over counterparty + description; combines with the filter.
  const [query, setQuery] = useState(view?.q ?? "");
  // Anni's fraction for the next drop on the Anni zone (the 1/2 · 1/3 · 1/4 toggle).
  const [anniShare, setAnniShare] = useState(0.5);
  // Month shown on the Categories card (and month-scoped filter figures).
  // Defaults to now; browsable back to the earliest synced month.
  const [month, setMonth] = useState(() =>
    view?.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(view.month) && view.month <= initial.month
      ? view.month
      : initial.month
  );
  // Reflect the view in the URL without navigating (no server round trip);
  // debounced so fast typing in search doesn't hit replaceState rate limits.
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (filter) p.set("cat", filter);
      if (month !== board.month) p.set("month", month);
      if (query.trim()) p.set("q", query.trim());
      const qs = p.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    }, 200);
    return () => clearTimeout(t);
  }, [filter, month, query, board.month]);
  // Rail cards collapse to a summary line, remembered per browser. A drag
  // needs every drop target visible, so collapsed cards reopen while one
  // is in flight (activeTx) and settle back after.
  const [collapsed, setCollapsed] = useState<{ categories?: boolean; subs?: boolean }>({});
  useEffect(() => {
    try {
      setCollapsed(JSON.parse(localStorage.getItem("kopikas-collapsed") ?? "{}"));
    } catch {}
  }, []);
  const toggleCollapsed = (key: "categories" | "subs") =>
    setCollapsed((c) => {
      const next = { ...c, [key]: !c[key] };
      try {
        localStorage.setItem("kopikas-collapsed", JSON.stringify(next));
      } catch {}
      return next;
    });
  const showCategories = !collapsed.categories || !!activeTx;
  const showSubs = !collapsed.subs || !!activeTx;

  const refetch = useCallback(async () => {
    const res = await fetch("/api/board", { cache: "no-store" });
    setBoard(await res.json());
  }, []);

  const post = useCallback(
    async (action: object) => {
      await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      await refetch();
    },
    [refetch]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const onDragStart = (e: DragStartEvent) => {
    setActiveTx(board.txs.find((t) => t.id === e.active.id) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const tx = board.txs.find((t) => t.id === e.active.id);
    setActiveTx(null);
    const over = e.over?.id as string | undefined;
    if (!tx || !over) return;
    if (over === "anni") {
      // Also handles re-drops: the server updates the fraction of an existing share.
      void post({ type: "share", txId: tx.id, anniShare });
    } else if (over === "subs") {
      void post({ type: "subscribe", txId: tx.id });
    } else if (over.startsWith("cat:")) {
      const category = over.slice(4);
      if (category !== tx.category) setPrompt({ txId: tx.id, merchant: tx.counterparty, category });
    }
  };

  const days = useMemo(() => {
    const q = query.trim().toLowerCase();
    let visible = filter
      ? board.txs.filter((t) =>
          filter === "Incoming"
            ? t.amount > 0 && !t.micro
            : filter === "Uncategorized"
              ? !t.category && t.amount < 0 && !t.micro
              : t.category === filter
        )
      : board.txs;
    if (q) {
      visible = visible.filter((t) => (t.counterparty + " " + t.description).toLowerCase().includes(q));
    }
    const map = new Map<string, BoardTx[]>();
    for (const tx of visible) {
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date)!.push(tx);
    }
    return [...map.entries()];
  }, [board.txs, filter, query]);

  // Feed position of each visible tile, for the exit cascade: when a rule
  // files many tiles at once they leave top-to-bottom like cards into a
  // drawer, not all in one blink. Capped so large sweeps stay snappy.
  const visibleOrder = useMemo(() => {
    const order = new Map<string, number>();
    let i = 0;
    for (const [, txs] of days) for (const t of txs) if (!t.micro) order.set(t.id, i++);
    return order;
  }, [days]);

  // Match count + outgoing total for the active search ("how much at X?").
  const searchStats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const rows = days.flatMap(([, txs]) => txs);
    return {
      count: rows.length,
      total:
        Math.round(rows.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0) * 100) /
        100,
    };
  }, [days, query]);

  // Totals for the active filter: everything visible, plus the viewed month's slice.
  const filterStats = useMemo(() => {
    if (!filter) return { total: 0, count: 0, monthTotal: 0 };
    const matching = board.txs.filter((t) =>
      filter === "Incoming"
        ? t.amount > 0 && !t.micro
        : t.amount < 0 && (filter === "Uncategorized" ? !t.category && !t.micro : t.category === filter)
    );
    const sum = (rows: typeof matching) =>
      Math.round(rows.reduce((s, t) => s + Math.abs(t.amount), 0) * 100) / 100;
    return {
      total: sum(matching),
      count: matching.length,
      monthTotal: sum(matching.filter((t) => t.date.slice(0, 7) === month)),
    };
  }, [board.txs, month, filter]);

  const toggleFilter = (name: string) => setFilter((f) => (f === name ? null : name));

  // Category totals for the viewed month, from the same per-tx categories the
  // server assigns — matches engine.categoryTotals for the current month.
  const monthCategoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of board.txs) {
      if (t.amount >= 0 || t.date.slice(0, 7) !== month) continue;
      const key = t.category ?? "Uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + Math.abs(t.amount));
    }
    return totals;
  }, [board.txs, month]);

  // Scale for the category bars: the month's biggest spending category is
  // full width. Savings is a transfer, not spending — it would dwarf the
  // rest, so it neither sets the scale nor gets a bar.
  const maxCategoryTotal = useMemo(() => {
    let max = 0;
    for (const c of CATEGORIES) if (c !== SAVINGS) max = Math.max(max, monthCategoryTotals.get(c) ?? 0);
    return max;
  }, [monthCategoryTotals]);

  // Full household outgo for the viewed month — everything except Savings
  // and micro-investing (money moved, not spent). Unlike the "Spent" stat
  // tile, shared expenses count in full here.
  const monthSpentTotal = useMemo(() => {
    let sum = 0;
    for (const t of board.txs) {
      if (t.amount >= 0 || t.micro || t.date.slice(0, 7) !== month) continue;
      if (t.category === SAVINGS) continue;
      sum += Math.abs(t.amount);
    }
    return Math.round(sum * 100) / 100;
  }, [board.txs, month]);

  // Money in for the viewed month — salary, repayments, refunds. The other
  // side of the statement; not a category.
  const monthReceivedTotal = useMemo(() => {
    let sum = 0;
    for (const t of board.txs) {
      if (t.amount <= 0 || t.micro || t.date.slice(0, 7) !== month) continue;
      sum += t.amount;
    }
    return Math.round(sum * 100) / 100;
  }, [board.txs, month]);

  const earliestMonth = useMemo(
    () => board.txs.reduce((min, t) => (t.date.slice(0, 7) < min ? t.date.slice(0, 7) : min), board.month),
    [board.txs, board.month]
  );
  const shiftMonth = (m: string, by: number) => {
    const [y, mo] = m.split("-").map(Number);
    return new Date(Date.UTC(y, mo - 1 + by, 1)).toISOString().slice(0, 7);
  };
  const fmtMonth = (m: string) =>
    new Intl.DateTimeFormat(
      "en-GB",
      m.slice(0, 4) === board.month.slice(0, 4) ? { month: "long" } : { month: "long", year: "numeric" }
    ).format(new Date(m + "-01T00:00:00Z"));

  const bal = board.balance;
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(
    new Date(board.month + "-01T00:00:00Z")
  );


  // Like-for-like: this month so far against the same days of last month.
  const spentDiff = Math.round((board.spentThisMonth - board.spentLastMonthToDate) * 100) / 100;

  return (
    <DndContext
      id="board"
      sensors={sensors}
      collisionDetection={pointerWithin}
      // No drag auto-scroll: the sticky rail keeps every drop target on
      // screen, so edge-scrolling only fights the gesture.
      autoScroll={false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-6xl px-5 py-6 pb-20">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
            <CoinMark />
            Kopikas
          </h1>
          <div className="flex items-center gap-1.5">
            <a href="/pooleks" className="text-sm text-muted-foreground hover:text-foreground">
              Pooleks →
            </a>
            <ThemeToggle />
            <a
              href="/settings"
              title="Settings"
              aria-label="Settings"
              className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <SettingsIcon className="size-4" />
            </a>
            <UserMenu />
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <Stat
            label={`Spent in ${monthName}`}
            value={eur.format(board.spentThisMonth)}
            sub={
              <>
                your share ·{" "}
                <span className={cn(spentDiff < 0 && "text-gain", spentDiff > 0 && "text-loss")}>
                  {spentDiff === 0
                    ? "level with this time last month"
                    : `${eur.format(Math.abs(spentDiff))} ${spentDiff < 0 ? "less" : "more"} than this time last month`}
                </span>
              </>
            }
            spark={board.sparks.spent}
          />
          <Card className="gap-0 rounded-xl py-1.5">
            <CardContent className="flex h-full flex-col justify-center px-4">
              {board.accounts.map((a) => (
                <BalanceRow
                  key={a.iban}
                  label={a.name}
                  sub={`···${a.iban.slice(-4)}`}
                  value={eur.format(a.balance)}
                  spark={a.spark}
                />
              ))}
              <BalanceRow
                label="Investments"
                sub={
                  board.investments.total != null
                    ? [
                        board.investments.latest.lightyear && `Lightyear ${eur.format(board.investments.latest.lightyear.total)}`,
                        board.investments.latest.lhv && `LHV ${eur.format(board.investments.latest.lhv.total)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "click to add a snapshot"
                }
                value={board.investments.total != null ? eur.format(board.investments.total) : "—"}
                spark={board.sparks.investments}
                onClick={() => setSnapOpen(true)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="relative mb-2">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 pr-8"
                placeholder="Search transactions…"
                aria-label="Search transactions"
                name="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
            {searchStats && (
              <div className="mb-2 px-1 text-xs text-muted-foreground">
                {searchStats.count} match{searchStats.count === 1 ? "" : "es"} ·{" "}
                <span className="font-mono tabular-nums">{eur.format(searchStats.total)}</span> spent
              </div>
            )}
            {filter && (
              <motion.div
                key={filter}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-2 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <span className="font-medium">{filter}</span>
                <span className="font-mono tabular-nums">{eur.format(filterStats.total)}</span>
                <span className="text-xs text-muted-foreground">
                  {filterStats.count} transactions · {eur.format(filterStats.monthTotal)} in {fmtMonth(month)}
                </span>
                <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => setFilter(null)}>
                  Show all
                </Button>
              </motion.div>
            )}
            {days.length === 0 ? (
              filter || query ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                <Empty className="p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CheckCircle2Icon />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm">
                      {query
                        ? `No matches for “${query.trim()}”`
                        : filter === "Uncategorized"
                          ? "Everything filed"
                          : filter === "Incoming"
                            ? "Nothing received yet"
                            : `No ${filter} transactions`}
                    </EmptyTitle>
                    <EmptyDescription>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilter(null);
                          setQuery("");
                        }}
                      >
                        Show all
                      </Button>
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
                </motion.div>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <InboxIcon />
                    </EmptyMedia>
                    <EmptyTitle>No transactions yet</EmptyTitle>
                    <EmptyDescription>Once the LHV sync runs, your feed shows up here.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            ) : (
              // The ledger: one sheet, rows ruled by hairlines, day headers as
              // section rules. ONE flat presence for headers, rows and rollups
              // alike: a nested presence deadlocks exits (found live), and a
              // header outside the presence pops out instead of leaving with
              // its rows. relative + overflow-hidden keep popped-out exits
              // inside the sheet, sliding off its edge.
              <div className="relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              <AnimatePresence initial={false} mode="popLayout">
                {days.flatMap(([date, txs], dayIndex) => {
                  const visible = txs.filter((t) => !t.micro);
                  const micro = txs.filter((t) => t.micro);
                  const microOut = micro.filter((t) => t.amount < 0);
                  const microTotal = microOut.reduce((s, t) => s + Math.abs(t.amount), 0);
                  const delayOf = (id: string) => Math.min((visibleOrder.get(id) ?? 0) * 0.03, 0.4);
                  return [
                    <motion.div
                      key={`day-${date}`}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.12, delay: visible[0] ? delayOf(visible[0].id) : 0 },
                      }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={cn(
                        "px-3 pb-1 pt-3 text-xs text-muted-foreground",
                        dayIndex > 0 && "border-t border-border/70"
                      )}
                    >
                      {dayFmt.format(new Date(date))}
                    </motion.div>,
                    ...visible.map((tx, i) => (
                      <motion.div
                        key={tx.id}
                        layout="position"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                          opacity: 0,
                          x: 32,
                          transition: { duration: 0.15, delay: delayOf(tx.id) },
                        }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className={cn(i > 0 && "border-t border-border/70")}
                      >
                        <Tile tx={tx} onUnshare={(id) => void post({ type: "unshare", shareId: id })} />
                      </motion.div>
                    )),
                    ...(micro.length > 0
                      ? [
                          <motion.div
                            key={`micro-${date}`}
                            layout="position"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.12 } }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground",
                              visible.length > 0 && "border-t border-border/70"
                            )}
                          >
                            <SproutIcon className="size-3.5 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                              Mikroinvesteering · {microOut.length || micro.length} transfer
                              {(microOut.length || micro.length) === 1 ? "" : "s"}
                            </span>
                            {microTotal > 0 && (
                              <span className="font-mono tabular-nums">
                                −{eur.format(microTotal)} → Savings
                              </span>
                            )}
                          </motion.div>,
                        ]
                      : []),
                  ];
                })}
              </AnimatePresence>
              </div>
            )}
          </div>

          {/* Cards must not flex-shrink: Card is overflow-hidden, so a squeezed
              card silently clips its bottom rows instead of overflowing. */}
          <div className="flex min-w-0 flex-col gap-4 md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:self-start md:overflow-y-auto">
            <Card className="shrink-0 gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Categories · {fmtMonth(month)}</span>
                  <span className="flex items-center gap-0.5">
                    <button
                      aria-label="Previous month"
                      disabled={month <= earliestMonth}
                      onClick={() => setMonth((m) => shiftMonth(m, -1))}
                      className="flex size-5 items-center justify-center rounded-md hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronLeftIcon className="size-3.5" />
                    </button>
                    <button
                      aria-label="Next month"
                      disabled={month >= board.month}
                      onClick={() => setMonth((m) => shiftMonth(m, 1))}
                      className="flex size-5 items-center justify-center rounded-md hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronRightIcon className="size-3.5" />
                    </button>
                    <button
                      aria-label={showCategories ? "Collapse categories" : "Expand categories"}
                      aria-expanded={showCategories}
                      onClick={() => toggleCollapsed("categories")}
                      className="ml-1 flex size-5 items-center justify-center rounded-md hover:bg-accent hover:text-foreground"
                    >
                      <ChevronDownIcon className={cn("size-3.5 transition-transform", !showCategories && "-rotate-90")} />
                    </button>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-0.5 px-1.5">
                {board.uncategorizedCount > 0 ? (
                  <button
                    className={cn(
                      "flex w-full justify-between rounded-md bg-attention/15 px-2.5 py-1.5 text-left text-sm font-medium text-attention",
                      filter === "Uncategorized" && "ring-2 ring-attention"
                    )}
                    onClick={() => toggleFilter("Uncategorized")}
                  >
                    <span>Uncategorized</span>
                    <span>
                      {board.uncategorizedCount === 1
                        ? "1 tile — drag it"
                        : `${board.uncategorizedCount} tiles — drag them`}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-baseline gap-1.5 px-2.5 py-1.5 text-sm text-muted-foreground">
                    <CheckCircle2Icon className="size-4 self-center text-gain" />
                    Everything filed
                    <span className="text-xs italic opacity-70">· iga kopikas loeb</span>
                  </div>
                )}
                {showCategories && (
                  <>
                    {board.categories.map((c) => (
                      <CategoryRow
                        key={c.name}
                        name={c.name}
                        total={Math.round((monthCategoryTotals.get(c.name) ?? 0) * 100) / 100}
                        share={
                          c.name === SAVINGS || maxCategoryTotal === 0
                            ? 0
                            : (monthCategoryTotals.get(c.name) ?? 0) / maxCategoryTotal
                        }
                        active={filter === c.name}
                        onSelect={() => toggleFilter(c.name)}
                      />
                    ))}
                    <div
                      className="mt-1 flex justify-between border-t px-2.5 pt-2 text-sm font-medium"
                      title="Everything going out except Savings and micro-investing; shared expenses at full price"
                    >
                      <span>Spent</span>
                      <span className="font-mono tabular-nums">{eur.format(monthSpentTotal)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFilter("Incoming")}
                      title="Money that came in this month — click to see who sent it"
                      className={cn(
                        "flex w-full cursor-pointer justify-between rounded-md px-2.5 py-1 text-left text-sm hover:bg-accent/50",
                        filter === "Incoming" && "bg-accent font-medium"
                      )}
                    >
                      <span>Received</span>
                      <span className="font-mono tabular-nums text-gain">+{eur.format(monthReceivedTotal)}</span>
                    </button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shrink-0 gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Subscriptions</span>
                  <button
                    aria-label={showSubs ? "Collapse subscriptions" : "Expand subscriptions"}
                    aria-expanded={showSubs}
                    onClick={() => toggleCollapsed("subs")}
                    className="flex size-5 items-center justify-center rounded-md hover:bg-accent hover:text-foreground"
                  >
                    <ChevronDownIcon className={cn("size-3.5 transition-transform", !showSubs && "-rotate-90")} />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                {showSubs && <SubsZone />}
                {showSubs && board.subscriptions.filter((s) => s.sub.active).length === 0 && (
                  <Empty className="p-4">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <RepeatIcon />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm">No subscriptions tracked</EmptyTitle>
                      <EmptyDescription>
                        Drag a recurring charge into the zone above — the board watches its price and due date for you.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                {showSubs &&
                  (["monthly", "yearly"] as const)
                  .map((cadence) => ({
                    cadence,
                    subs: board.subscriptions.filter((s) => s.sub.active && s.sub.cadence === cadence),
                  }))
                  .filter((g) => g.subs.length > 0)
                  .map((g) => (
                    <div key={g.cadence}>
                      <div className="mt-2 flex items-baseline justify-between text-xs text-muted-foreground">
                        <span className="font-medium capitalize">{g.cadence}</span>
                        <span className="font-mono tabular-nums">
                          {eur.format(g.subs.reduce((sum, s) => sum + (s.lastCharge?.amount ?? s.sub.expectedAmount), 0))}
                          {g.cadence === "monthly" ? " / mo" : " / yr"}
                        </span>
                      </div>
                      <div className="divide-y">
                        {g.subs.map((s) => (
                      <div className="flex items-center gap-2 py-2" key={s.sub.id}>
                        <MerchantIcon name={s.sub.name} domain={s.domain} className="size-6" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{s.sub.name}</div>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                            <span>
                              {s.lastCharge && s.lastCharge.date.slice(0, 7) === board.month
                                ? `paid ${shortDate.format(new Date(s.lastCharge.date))}`
                                : s.nextDue
                                  ? `due ${shortDate.format(new Date(s.nextDue))}`
                                  : "no charge matched yet"}
                            </span>
                            {s.priceChanged && s.lastCharge && (
                              <Badge
                                render={<button type="button" />}
                                className="cursor-pointer bg-attention/15 font-mono tabular-nums text-attention hover:bg-attention/25"
                                title={`Price changed — click to accept ${eur.format(s.lastCharge.amount)} as the new price`}
                                aria-label={`Accept ${eur.format(s.lastCharge.amount)} as the new price for ${s.sub.name}`}
                                onClick={() => void post({ type: "accept-price", subId: s.sub.id })}
                              >
                                {eur.format(s.sub.expectedAmount)} → {eur.format(s.lastCharge.amount)}
                              </Badge>
                            )}
                            {s.overdue && <Badge className="bg-attention/15 text-attention">gone quiet</Badge>}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
                          {eur.format(s.lastCharge?.amount ?? s.sub.expectedAmount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0 text-muted-foreground"
                          title="Mark cancelled"
                          aria-label={`Cancel ${s.sub.name} subscription`}
                          onClick={() => void post({ type: "unsubscribe", subId: s.sub.id })}
                        >
                          ✕
                        </Button>
                      </div>
                        ))}
                      </div>
                    </div>
                  ))}
                {board.subscriptions.some((s) => s.sub.active) && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Monthly burn:{" "}
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {eur.format(board.monthlyBurn)}
                    </span>{" "}
                    · paid this month:{" "}
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {eur.format(board.subsPaidThisMonth)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shrink-0 gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pooleks · with Anni</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <AnniZone share={anniShare} onShareChange={setAnniShare} />
                {/* The full shared ledger lives on /pooleks; here: the zone,
                    the live balance, and the way there. */}
                <div className="flex items-baseline justify-between gap-2">
                  <div className={cn("text-base font-semibold", bal >= 0 ? "text-gain" : "text-loss")}>
                    {board.sharedItems.length === 0 ? (
                      <span className="text-sm font-normal text-muted-foreground">Nothing shared yet</span>
                    ) : bal === 0 ? (
                      "All square"
                    ) : (
                      <>
                        {bal > 0 ? "Anni owes you " : "You owe Anni "}
                        <span className="font-mono tabular-nums">{eur.format(Math.abs(bal))}</span>
                      </>
                    )}
                  </div>
                  <a href="/pooleks" className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
                    Open Pooleks →
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="shrink-0 gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                  Investments over time
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                {board.investments.series.length >= 2 ? (
                  <ChartContainer config={INVESTMENTS_CHART} className="aspect-[2/1] w-full">
                    <AreaChart
                      data={board.investments.series.map((p) => ({
                        date: p.at.slice(0, 10),
                        lightyear: p.lightyear ?? 0,
                        lhv: p.lhv ?? 0,
                      }))}
                      margin={{ top: 6, right: 4, bottom: 0, left: 4 }}
                    >
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        minTickGap={32}
                        tickFormatter={(d: string) => shortDate.format(new Date(d))}
                      />
                      <YAxis hide domain={["auto", "auto"]} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(d) => shortDate.format(new Date(String(d)))}
                            formatter={(value) => (
                              <span className="font-mono tabular-nums">{eur.format(Number(value))}</span>
                            )}
                          />
                        }
                      />
                      <Area
                        dataKey="lightyear"
                        stackId="pots"
                        type="monotone"
                        stroke="var(--color-lightyear)"
                        strokeWidth={1.5}
                        fill="var(--color-lightyear)"
                        fillOpacity={0.12}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Area
                        dataKey="lhv"
                        stackId="pots"
                        type="monotone"
                        stroke="var(--color-lhv)"
                        strokeWidth={1.5}
                        fill="var(--color-lhv)"
                        fillOpacity={0.18}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Update the Investments tile now and then — two snapshots make a line.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeTx && (
          <div className="cursor-grabbing rounded-lg border border-primary bg-card px-3 py-2 text-sm font-medium shadow-lg">
            {activeTx.counterparty} · <span className="font-mono tabular-nums">{eur.format(Math.abs(activeTx.amount))}</span>
          </div>
        )}
      </DragOverlay>

      <Dialog open={!!prompt} onOpenChange={(o) => !o && setPrompt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>File under {prompt?.category}?</DialogTitle>
            <DialogDescription>{prompt?.merchant}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              onClick={() => {
                if (!prompt) return;
                void post({ type: "rule", match: prompt.merchant, category: prompt.category }).then(() =>
                  post({ type: "override", txId: prompt.txId, category: prompt.category })
                );
                setPrompt(null);
              }}
            >
              Always — teach a rule for “{prompt?.merchant}”
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!prompt) return;
                void post({ type: "override", txId: prompt.txId, category: prompt.category });
                setPrompt(null);
              }}
            >
              Only this one
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SnapshotEditor
        open={snapOpen}
        latest={board.investments.latest}
        onClose={() => setSnapOpen(false)}
        onSave={(source, total, holdings, returnPct) => {
          void post({ type: "snapshot", source, total, holdings, returnPct });
          setSnapOpen(false);
        }}
      />
      </MotionConfig>
    </DndContext>
  );
}


// Investments over time: the two snapshotted pots stacked — Lightyear in the
// gain green the tile's sparkline speaks, the LHV pot in Kopikas copper.
const INVESTMENTS_CHART = {
  lightyear: { label: "Lightyear", color: "var(--gain)" },
  lhv: { label: "LHV", color: "var(--primary)" },
} satisfies ChartConfig;

function Sparkline({ spark, className, fill }: { spark: Spark; className?: string; fill?: boolean }) {
  if (spark.points.length < 2) return null;
  const data = spark.points.map((v, i) => ({ i, v }));
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke="currentColor"
            strokeWidth={1.5}
            fill="currentColor"
            fillOpacity={fill ? 0.1 : 0}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// The one number the board is for: this month's spend. The only stat with a
// card of its own, and the only spark drawn in copper.
function Stat({ label, value, sub, spark }: { label: string; value: string; sub?: ReactNode; spark?: Spark }) {
  return (
    <Card className="h-full gap-0.5 rounded-xl py-4 ring-primary/40">
      <CardContent className="flex h-full flex-col gap-0.5 px-5">
        <div className="truncate text-xs font-medium text-primary">{label}</div>
        <div className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
        <div className="min-h-4 truncate text-xs leading-4 text-muted-foreground">{sub}</div>
        {spark && <Sparkline spark={spark} className="mt-3 min-h-14 flex-1 text-primary" fill />}
      </CardContent>
    </Card>
  );
}

// Balances read as statement lines: name and account tail, a graphite spark,
// the amount on the rail. No colour — copper stays with the hero.
function BalanceRow({
  label,
  sub,
  value,
  spark,
  onClick,
}: {
  label: string;
  sub?: string;
  value: string;
  spark?: Spark;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="min-w-0">
        <div className="truncate text-sm">{label}</div>
        {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
      </div>
      {spark ? <Sparkline spark={spark} className="h-6 w-16 text-foreground/45" /> : <div />}
      <div className="font-mono text-sm font-semibold tabular-nums tracking-tight">{value}</div>
    </>
  );
  const cls =
    "grid w-full grid-cols-[minmax(0,1fr)_4rem_auto] items-center gap-3 border-b border-foreground/10 py-2 text-left last:border-0";
  return onClick ? (
    <button type="button" className={cn(cls, "transition-colors hover:text-primary")} onClick={onClick} title="Update a snapshot">
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

// A ledger row: icon · merchant/meta · category · amount, in fixed columns so
// categories and amounts align down the whole statement. Color is reserved
// for meaning — uncategorized (attention), incoming (gain), Anni's share.
function Tile({ tx, onUnshare }: { tx: BoardTx; onUnshare: (shareId: string) => void }) {
  const draggable = tx.amount < 0;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tx.id,
    disabled: !draggable,
  });
  const category =
    tx.amount >= 0 ? null : tx.category ? (
      <span
        className={cn(
          "truncate text-xs text-muted-foreground",
          tx.categorySource === "override" && "underline decoration-dotted underline-offset-2"
        )}
        title={tx.categorySource === "override" ? "Filed by hand" : undefined}
      >
        {tx.category}
      </span>
    ) : (
      <span className="text-xs font-medium text-attention">uncategorized</span>
    );
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid touch-none select-none grid-cols-[1.75rem_minmax(0,1fr)_5.5rem] items-center gap-x-3 px-3 py-2 sm:grid-cols-[1.75rem_minmax(0,1fr)_7rem_5.5rem]",
        // Offscreen rows skip render work — the full feed is ~1,000 rows.
        "[contain-intrinsic-size:auto_52px] [content-visibility:auto]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        // Rows in Pooleks wear a faint wash of the shared color — scannable
        // as a rhythm while scrolling, without reading the label.
        tx.shared && "bg-shared/[0.06] dark:bg-shared/[0.12]",
        draggable && "cursor-grab hover:bg-accent/40",
        isDragging && "opacity-40"
      )}
      {...listeners}
      {...attributes}
    >
      <MerchantIcon name={tx.counterparty} domain={tx.domain} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{tx.counterparty}</div>
        <div className="flex min-w-0 items-baseline gap-1.5 text-xs text-muted-foreground">
          {tx.shared && tx.shareId && (
            <button
              type="button"
              className="shrink-0 font-medium text-shared hover:underline"
              title={`Shared with Anni — she pays ${shareLabel(tx.anniShare)}. Click to unshare`}
              aria-label={`Unshare — Anni pays ${shareLabel(tx.anniShare)} of this`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onUnshare(tx.shareId!)}
            >
              {shareLabel(tx.anniShare)} Anni ·
            </button>
          )}
          <span className="truncate">{tx.description}</span>
          {category && <span className="flex shrink-0 gap-1.5 sm:hidden">· {category}</span>}
        </div>
      </div>
      <div className="hidden min-w-0 sm:block">{category}</div>
      <span className={cn("text-right font-mono text-sm font-semibold tabular-nums", tx.amount > 0 && "text-gain")}>
        {tx.amount > 0 ? "+" : "−"}
        {eur.format(Math.abs(tx.amount))}
      </span>
    </div>
  );
}

// The bar is the row's background: a quiet copper fill growing from the left
// to this category's share of the month's biggest — proportion without adding
// an element, and the row stays one line.
function CategoryRow({
  name,
  total,
  share,
  active,
  onSelect,
}: {
  name: string;
  total: number;
  share: number; // 0..1 of the month's largest spending category
  active: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cat:${name}` });
  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onSelect}
      className={cn(
        "relative flex w-full cursor-pointer justify-between overflow-hidden rounded-md border border-dashed border-transparent px-2.5 py-1.5 text-left text-sm hover:bg-accent/50",
        isOver && "border-primary bg-accent",
        active && "bg-accent font-medium"
      )}
    >
      {share > 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-md bg-primary/10 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${Math.round(share * 1000) / 10}%` }}
        />
      )}
      <span className="relative">{name}</span>
      <span className={cn("relative text-muted-foreground", !isOver && "font-mono tabular-nums")}>
        {isOver ? "drop here" : total > 0 ? eur.format(total) : ""}
      </span>
    </button>
  );
}

function SubsZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "subs" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mb-2 rounded-lg border-2 border-dashed p-2.5 text-center text-xs text-muted-foreground",
        isOver && "border-primary bg-accent text-foreground"
      )}
    >
      {isOver ? "Drop to register subscription" : "Drag a recurring charge here"}
    </div>
  );
}

const SPLIT_OPTIONS = [
  { fraction: 0.5, label: "1/2" },
  { fraction: 1 / 3, label: "1/3" },
  { fraction: 0.25, label: "1/4" },
];

function AnniZone({ share, onShareChange }: { share: number; onShareChange: (f: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "anni" });
  return (
    <div className="mb-2">
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>Anni pays</span>
        <div className="flex gap-1">
          {SPLIT_OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => onShareChange(o.fraction)}
              className={cn(
                "min-w-8 rounded-md border border-transparent px-2 py-0.5 font-mono",
                share === o.fraction
                  ? "border-shared/40 bg-shared/15 font-semibold text-shared"
                  : "hover:bg-accent hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "rounded-lg border-2 border-dashed p-2.5 text-center text-xs text-muted-foreground",
          isOver && "border-primary bg-accent text-foreground"
        )}
      >
        {isOver ? `Drop to split — Anni pays ${shareLabel(share)}` : "Drag an expense here to split with Anni"}
      </div>
    </div>
  );
}

type PotLatest = { total: number; returnPct?: number; at: string } | null;

function SnapshotEditor({
  open,
  latest,
  onClose,
  onSave,
}: {
  open: boolean;
  latest: { lightyear: PotLatest; lhv: PotLatest };
  onClose: () => void;
  onSave: (source: "lightyear" | "lhv", total: number, holdings: { name: string; pct: number }[], returnPct?: number) => void;
}) {
  const [source, setSource] = useState<"lightyear" | "lhv">("lightyear");
  const [total, setTotal] = useState("");
  const [returnPct, setReturnPct] = useState("");
  const [holdings, setHoldings] = useState("");
  const [err, setErr] = useState("");
  const current = latest[source];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update investments</DialogTitle>
          <DialogDescription>Every update is logged — decreases too.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <div className="flex gap-1" role="radiogroup" aria-label="Which pot">
            {(["lightyear", "lhv"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={source === p}
                onClick={() => setSource(p)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-sm",
                  source === p
                    ? "border-primary/40 bg-primary/10 font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {p === "lightyear" ? "Lightyear" : "LHV"}
              </button>
            ))}
          </div>
          <p className="min-h-4 text-xs text-muted-foreground">
            {current
              ? `Last: ${eur.format(current.total)}${
                  current.returnPct != null ? ` · ${current.returnPct > 0 ? "+" : ""}${current.returnPct}%` : ""
                } · ${shortDate.format(new Date(current.at))}`
              : "No snapshot yet for this pot."}
          </p>
          <Input
            placeholder="Total value, e.g. 5917"
            aria-label="Total value in euros"
            name="snapshot-total"
            inputMode="decimal"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            autoFocus
          />
          <Input
            placeholder="Return %, e.g. 2.24 (optional)"
            aria-label="Return percent"
            name="snapshot-return"
            inputMode="decimal"
            value={returnPct}
            onChange={(e) => setReturnPct(e.target.value)}
          />
          {source === "lightyear" && (
            <Input
              placeholder="Allocations like “VWCE 70, MMF 25” (optional)"
              aria-label="Allocations"
              name="snapshot-holdings"
              value={holdings}
              onChange={(e) => setHoldings(e.target.value)}
            />
          )}
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const t = Number(total.replace(",", "."));
              if (!(t >= 0)) return setErr("Enter the total value first");
              const pct = returnPct.trim() === "" ? undefined : Number(returnPct.replace(",", ".").replace("%", ""));
              if (pct !== undefined && !Number.isFinite(pct)) return setErr("Return % should be a number like 2.24");
              const parsed = holdings
                .split(",")
                .map((part) => part.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)$/))
                .filter(Boolean)
                .map((m) => ({ name: m![1], pct: Number(m![2]) }));
              onSave(source, t, source === "lightyear" ? parsed : [], pct);
              setTotal("");
              setReturnPct("");
              setHoldings("");
              setErr("");
            }}
          >
            Save snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
