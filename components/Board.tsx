"use client";

import { useCallback, useMemo, useState } from "react";
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
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HandCoinsIcon,
  InboxIcon,
  RepeatIcon,
  SearchIcon,
  SettingsIcon,
  SproutIcon,
  XIcon,
} from "lucide-react";
import type { Board as BoardData, BoardTx, Spark } from "@/lib/board";
import { SAVINGS } from "@/lib/engine";
import { cn, shareLabel } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { MerchantIcon } from "@/components/merchant-icon";
import { UserMenu } from "@/components/user-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function Board({ initial }: { initial: BoardData }) {
  const [board, setBoard] = useState(initial);
  const [activeTx, setActiveTx] = useState<BoardTx | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [snapOpen, setSnapOpen] = useState(false);
  // Category filter: a category name, "Uncategorized", or null for the full feed.
  const [filter, setFilter] = useState<string | null>(null);
  // Free-text search over counterparty + description; combines with the filter.
  const [query, setQuery] = useState("");
  // Anni's fraction for the next drop on the Anni zone (the 1/2 · 1/3 · 1/4 toggle).
  const [anniShare, setAnniShare] = useState(0.5);
  // Month shown on the Categories card (and month-scoped filter figures).
  // Defaults to now; browsable back to the earliest synced month.
  const [month, setMonth] = useState(initial.month);

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
          filter === "Uncategorized" ? !t.category && t.amount < 0 && !t.micro : t.category === filter
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
    const matching = board.txs.filter(
      (t) =>
        t.amount < 0 && (filter === "Uncategorized" ? !t.category && !t.micro : t.category === filter)
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
            <a href="/anni" className="text-sm text-muted-foreground hover:text-foreground">
              Shared with Anni →
            </a>
            <ThemeToggle />
            <a
              href="/settings"
              title="Settings"
              className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <SettingsIcon className="size-4" />
            </a>
            <UserMenu />
          </div>
        </div>

        <div
          className={cn(
            "mb-6 grid grid-cols-2 gap-3",
            board.accounts.length >= 2 ? "md:grid-cols-5" : "md:grid-cols-4"
          )}
        >
          <Stat
            label={`Saved in ${monthName}`}
            value={eur.format(board.savedThisMonth)}
            sub={`last month ${eur.format(board.savedLastMonth)}`}
            spark={board.sparks.saved}
            hero
            className="col-span-2 md:col-span-1"
          />
          <Stat
            label={`Spent in ${monthName}`}
            value={eur.format(board.spentThisMonth)}
            sub="your share of shared items"
            spark={board.sparks.spent}
          />
          {board.accounts.map((a) => (
            <Stat
              key={a.iban}
              label={a.name}
              value={eur.format(a.balance)}
              sub={`···${a.iban.slice(-4)}`}
              spark={a.spark}
            />
          ))}
          <button className="h-full text-left" onClick={() => setSnapOpen(true)}>
            <Stat
              label="Lightyear"
              value={board.snapshot ? eur.format(board.snapshot.total) : "—"}
              sub={
                board.snapshot
                  ? `as of ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
                      new Date(board.snapshot.at)
                    )}${
                      board.snapshot.returnPct != null
                        ? ` · ${board.snapshot.returnPct > 0 ? "+" : ""}${board.snapshot.returnPct}%`
                        : ""
                    } · update`
                  : "click to add"
              }
              interactive
              spark={board.sparks.lightyear}
            />
          </button>
        </div>

        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="relative mb-2">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 pr-8"
                placeholder="Search transactions…"
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
              // ONE flat presence for headers, tiles and rollups alike: a
              // nested presence deadlocks exits (found live), and a header
              // outside the presence pops out instead of leaving with its
              // tiles — which killed the cascade whenever a day emptied.
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
                      className={cn("mb-1.5 text-xs text-muted-foreground", dayIndex > 0 && "mt-4")}
                    >
                      {dayFmt.format(new Date(date))}
                    </motion.div>,
                    ...visible.map((tx) => (
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
                            className="mb-1.5 flex items-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
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
                {board.categories.map((c) => (
                  <CategoryRow
                    key={c.name}
                    name={c.name}
                    total={Math.round((monthCategoryTotals.get(c.name) ?? 0) * 100) / 100}
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
              </CardContent>
            </Card>

            <Card className="shrink-0 gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <SubsZone />
                {board.subscriptions.filter((s) => s.sub.active).length === 0 && (
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
                {(["monthly", "yearly"] as const)
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
                              <Badge className="bg-attention/15 font-mono tabular-nums text-attention">
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
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Split with Anni</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <AnniZone share={anniShare} onShareChange={setAnniShare} />
                {board.sharedItems.length === 0 && (
                  <Empty className="p-4">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <HandCoinsIcon />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm">Nothing shared yet</EmptyTitle>
                      <EmptyDescription>Drop an expense on the zone above to split it 50/50 with Anni.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                {board.sharedItems.length > 0 && (
                  <div className={cn("mb-2 text-base font-semibold", bal >= 0 ? "text-gain" : "text-loss")}>
                    {bal === 0 ? (
                      "All square"
                    ) : (
                      <>
                        {bal > 0 ? "Anni owes you " : "You owe Anni "}
                        <span className="font-mono tabular-nums">{eur.format(Math.abs(bal))}</span>
                      </>
                    )}
                  </div>
                )}
                {board.sharedItems.slice(0, 6).map((s) => (
                  <div className="flex justify-between gap-2 py-1 text-xs text-muted-foreground" key={s.id}>
                    <span className="text-foreground">
                      {s.description}{" "}
                      <span className="text-muted-foreground">
                        · {s.paidBy === "argo" ? "you paid" : "Anni paid"}
                        {shareLabel(s.anniShare) !== "1/2" && ` · her ${shareLabel(s.anniShare)}`}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">{eur.format(s.total)}</span>
                  </div>
                ))}
                {board.suggestions.map((sg) => (
                  <div
                    className="mt-2 flex items-center justify-between gap-2 rounded-md bg-gain/10 p-2.5 text-xs"
                    key={sg.txId}
                  >
                    <span>
                      <span className="font-mono tabular-nums">{eur.format(Math.abs(sg.amount))}</span>{" "}
                      {sg.amount > 0 ? `from ${sg.counterparty}` : `to ${sg.counterparty}`} on{" "}
                      {shortDate.format(new Date(sg.date))}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => void post({ type: "settle", amount: sg.amount, date: sg.date, txId: sg.txId })}
                    >
                      Record repayment
                    </Button>
                  </div>
                ))}
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
        onClose={() => setSnapOpen(false)}
        onSave={(total, holdings, returnPct) => {
          void post({ type: "snapshot", total, holdings, returnPct });
          setSnapOpen(false);
        }}
      />
      </MotionConfig>
    </DndContext>
  );
}

// The kopikas coin: copper disc with a reeded inner ring.
function CoinMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" className="fill-primary" />
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeOpacity="0.55"
        strokeWidth="1.2"
        strokeDasharray="1.6 2.3"
      />
    </svg>
  );
}

const SPARK_COLORS = { green: "var(--gain)", red: "var(--loss)", neutral: "var(--muted-foreground)" };

function Sparkline({ spark }: { spark: Spark }) {
  if (spark.points.length < 2) return null;
  const color = SPARK_COLORS[spark.tone];
  const data = spark.points.map((v, i) => ({ i, v }));
  return (
    <div className="mt-auto h-8 w-full pt-1.5">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={color}
            fillOpacity={0.12}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  interactive,
  spark,
  hero,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  interactive?: boolean;
  spark?: Spark;
  hero?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "h-full gap-0.5 rounded-xl py-3.5",
        interactive && "transition-colors hover:border-primary",
        hero && "border-primary/50",
        className
      )}
    >
      <CardContent className="flex h-full flex-col gap-0.5 px-4">
        <div className={cn("truncate text-xs", hero ? "font-medium text-primary" : "text-muted-foreground")}>
          {label}
        </div>
        <div className="font-mono text-lg font-semibold tabular-nums tracking-tight">{value}</div>
        <div className="min-h-4 truncate text-xs leading-4 text-muted-foreground">{sub}</div>
        {spark && <Sparkline spark={spark} />}
      </CardContent>
    </Card>
  );
}

function Tile({ tx, onUnshare }: { tx: BoardTx; onUnshare: (shareId: string) => void }) {
  const draggable = tx.amount < 0;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tx.id,
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mb-1.5 flex touch-none select-none items-center gap-2.5 rounded-lg border bg-card px-3 py-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        draggable && "cursor-grab",
        isDragging && "opacity-40"
      )}
      {...listeners}
      {...attributes}
    >
      <MerchantIcon name={tx.counterparty} domain={tx.domain} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{tx.counterparty}</div>
        <div className="truncate text-xs text-muted-foreground">{tx.description}</div>
      </div>
      {tx.shared && tx.shareId && (
        <Badge
          className="cursor-pointer bg-shared/15 text-shared hover:bg-shared/25"
          title={`Shared with Anni — she pays ${shareLabel(tx.anniShare)}. Click to unshare`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onUnshare(tx.shareId!)}
        >
          {shareLabel(tx.anniShare)} Anni
        </Badge>
      )}
      {tx.amount < 0 &&
        (tx.category ? (
          <Badge variant="secondary" className={cn(tx.categorySource === "override" && "border border-dashed border-border")}>
            {tx.category}
          </Badge>
        ) : (
          <Badge className="bg-attention/15 font-semibold text-attention">uncategorized</Badge>
        ))}
      <span className={cn("font-mono text-sm font-semibold tabular-nums", tx.amount > 0 && "text-gain")}>
        {tx.amount > 0 ? "+" : "−"}
        {eur.format(Math.abs(tx.amount))}
      </span>
    </div>
  );
}

function CategoryRow({
  name,
  total,
  active,
  onSelect,
}: {
  name: string;
  total: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cat:${name}` });
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "flex cursor-pointer justify-between rounded-md border border-dashed border-transparent px-2.5 py-1.5 text-sm hover:bg-accent/50",
        isOver && "border-primary bg-accent",
        active && "bg-accent font-medium"
      )}
    >
      <span>{name}</span>
      <span className={cn("text-muted-foreground", !isOver && "font-mono tabular-nums")}>
        {isOver ? "drop here" : total > 0 ? eur.format(total) : ""}
      </span>
    </div>
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

function SnapshotEditor({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (total: number, holdings: { name: string; pct: number }[], returnPct?: number) => void;
}) {
  const [total, setTotal] = useState("");
  const [returnPct, setReturnPct] = useState("");
  const [holdings, setHoldings] = useState("");
  const [err, setErr] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Lightyear value</DialogTitle>
          <DialogDescription>Every update is logged — decreases too.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Input placeholder="Total value, e.g. 5917" value={total} onChange={(e) => setTotal(e.target.value)} autoFocus />
          <Input
            placeholder="Return % from Lightyear, e.g. 2.24 (optional)"
            value={returnPct}
            onChange={(e) => setReturnPct(e.target.value)}
          />
          <Input
            placeholder="Allocations like “VWCE 70, MMF 25” (optional)"
            value={holdings}
            onChange={(e) => setHoldings(e.target.value)}
          />
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
              onSave(t, parsed, pct);
            }}
          >
            Save snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
