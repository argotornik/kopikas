"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  InboxIcon,
  RepeatIcon,
  SearchIcon,
  SettingsIcon,
  SproutIcon,
  XIcon,
} from "lucide-react";
import type { Board as BoardData, BoardTx, Spark } from "@/lib/board";
import { FIXED_CATEGORIES, SAVINGS, SUBSCRIPTIONS } from "@/lib/engine";
import { cn, shareLabel } from "@/lib/utils";
import { PARTNER_NAME } from "@/lib/names";
import { ThemeToggle } from "@/components/theme-toggle";
import { CoinMark } from "@/components/coin-mark";
import { MerchantIcon } from "@/components/merchant-icon";
import { MerchantEditor, type MerchantSubject } from "@/components/merchant-editor";
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
// Limits are round numbers; show them without cents unless they have some.
const eurWhole = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const limit = (b: number) => (Number.isInteger(b) ? eurWhole : eur).format(b);
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

type Prompt = { txId: string; name: string; pattern: string; category: string; amount: number; date: string };

// What the Categories dialog can ask the server to do.
type CategoryAction =
  | { type: "category-add"; name: string }
  | { type: "category-rename"; from: string; to: string }
  | { type: "category-order"; order: string[] }
  | { type: "category-budget"; name: string; budget: number | null };

// View state carried in the URL (?cat=&month=&q=) so filtered views deep-link.
type ViewParams = { cat?: string; month?: string; q?: string };

export default function Board({ initial, view }: { initial: BoardData; view?: ViewParams }) {
  const [board, setBoard] = useState(initial);
  const [activeTx, setActiveTx] = useState<BoardTx | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [snapOpen, setSnapOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  // The merchant whose identity is being edited, from a tile or a subscription row.
  const [merchantSubject, setMerchantSubject] = useState<MerchantSubject | null>(null);
  // Category filter: a category name, "Uncategorized", or null for the full feed.
  const [filter, setFilter] = useState<string | null>(() =>
    view?.cat &&
    (view.cat === "Uncategorized" || view.cat === "Incoming" || initial.categories.some((c) => c.name === view.cat))
      ? view.cat
      : null
  );
  // Free-text search over counterparty + description; combines with the filter.
  const [query, setQuery] = useState(view?.q ?? "");
  // The partner's fraction for the next drop on the Pooleks zone (the 1/2 · 1/3 · 1/4 toggle).
  const [partnerShare, setPartnerShare] = useState(0.5);
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

  // Like post, but reports the server's reason so a dialog can show it.
  const tryPost = useCallback(
    async (action: object): Promise<string | null> => {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return body.error ?? "Couldn't save that";
      }
      await refetch();
      return null;
    },
    [refetch]
  );

  // Renames and additions from the Categories dialog; a renamed filter follows the name.
  const editCategories = useCallback(
    async (action: CategoryAction) => {
      const err = await tryPost(action);
      if (!err && action.type === "category-rename") setFilter((f) => (f === action.from ? action.to : f));
      return err;
    },
    [tryPost]
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
    if (over === "partner") {
      // Also handles re-drops: the server updates the fraction of an existing share.
      void post({ type: "share", txId: tx.id, partnerShare });
    } else if (over === "subs") {
      void post({ type: "subscribe", txId: tx.id });
    } else if (over.startsWith("cat:")) {
      const category = over.slice(4);
      if (category !== tx.category)
        setPrompt({ txId: tx.id, name: tx.name, pattern: tx.rulePattern, category, amount: tx.amount, date: tx.date });
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
    for (const c of board.categories) if (c.name !== SAVINGS) max = Math.max(max, monthCategoryTotals.get(c.name) ?? 0);
    return max;
  }, [monthCategoryTotals, board.categories]);

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

        <div
          className={cn(
            "mb-6 grid grid-cols-2 gap-3",
            board.accounts.length >= 2 ? "md:grid-cols-4" : "md:grid-cols-3"
          )}
        >
          <Stat
            label={`Spent in ${monthName}`}
            value={eur.format(board.spentThisMonth)}
            sub={`your share · last month ${eur.format(board.spentLastMonth)}`}
            spark={board.sparks.spent}
            hero
            className="col-span-2 md:col-span-1"
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
          <button
            // On phones the tiles pair up; with an even number of accounts this
            // one would sit alone in a half-width column, so it takes the row.
            className={cn("h-full text-left", board.accounts.length % 2 === 0 && "col-span-2 md:col-span-1")}
            onClick={() => setSnapOpen(true)}
            title="Update a snapshot"
          >
            <Stat
              label="Investments"
              value={board.investments.total != null ? eur.format(board.investments.total) : "—"}
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
              interactive
              spark={board.sparks.investments}
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
                        <Tile
                          tx={tx}
                          onUnshare={(id) => void post({ type: "unshare", shareId: id })}
                          onEditMerchant={(t) =>
                            setMerchantSubject({
                              key: t.id,
                              name: t.name,
                              domain: t.domain,
                              emoji: t.emoji,
                              pattern: t.merchantPattern,
                              custom: t.customMerchant,
                              target: { txId: t.id },
                            })
                          }
                        />
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
                      aria-label="Edit categories"
                      title="Rename or add categories"
                      onClick={() => setCatsOpen(true)}
                      className="mr-1 flex size-5 items-center justify-center rounded-md hover:bg-accent hover:text-foreground"
                    >
                      <SettingsIcon className="size-3.5" />
                    </button>
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
                        budget={c.budget}
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
                      <div className="group flex items-center gap-2 py-2" key={s.sub.id}>
                        <button
                          type="button"
                          className="rounded-full hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title="Change name or icon"
                          aria-label={`Change the name or icon of ${s.label}`}
                          onClick={() =>
                            setMerchantSubject({
                              key: s.sub.id,
                              name: s.label,
                              domain: s.domain,
                              emoji: s.emoji,
                              pattern: s.sub.match,
                              custom: s.customMerchant,
                              target: { subId: s.sub.id },
                            })
                          }
                        >
                          <MerchantIcon name={s.label} domain={s.domain} emoji={s.emoji} className="size-6" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{s.label}</div>
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
                          // Fix a wrong cadence guess. Revealed on hover where there
                          // is a pointer; always there on touch, like the ✕.
                          className="size-6 shrink-0 text-muted-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                          title={`Make ${s.sub.cadence === "monthly" ? "yearly" : "monthly"}`}
                          aria-label={`Make ${s.label} ${s.sub.cadence === "monthly" ? "yearly" : "monthly"}`}
                          onClick={() =>
                            void post({
                              type: "cadence",
                              subId: s.sub.id,
                              cadence: s.sub.cadence === "monthly" ? "yearly" : "monthly",
                            })
                          }
                        >
                          <RepeatIcon className="size-3.5" />
                        </Button>
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
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pooleks · with {PARTNER_NAME}</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <PartnerZone share={partnerShare} onShareChange={setPartnerShare} />
                {/* The full shared ledger lives on /pooleks; here: the zone,
                    the live balance, and the way there. */}
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-base font-semibold">
                    {board.sharedItems.length === 0 ? (
                      <span className="text-sm font-normal text-muted-foreground">Nothing shared yet</span>
                    ) : bal === 0 ? (
                      "All square"
                    ) : (
                      <>
                        {bal > 0 ? `${PARTNER_NAME} owes you ` : `You owe ${PARTNER_NAME} `}
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
      {/* dnd-kit sizes the overlay to the dragged row; a pill should be as wide as
          its words, or it runs off the screen when the drop zone is in the rail. */}
      <DragOverlay style={{ width: "auto", height: "auto" }}>
        {activeTx && (
          <div className="cursor-grabbing rounded-lg border border-primary bg-card px-3 py-2 text-sm font-medium shadow-lg">
            {activeTx.name} · <span className="font-mono tabular-nums">{eur.format(Math.abs(activeTx.amount))}</span>
          </div>
        )}
      </DragOverlay>

      {/* The title asks, the description says what and what "always" would
          match, the two buttons decide. Nothing is said twice. */}
      <Dialog open={!!prompt} onOpenChange={(o) => !o && setPrompt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>File under {prompt?.category}?</DialogTitle>
            <DialogDescription>
              {prompt?.name} · <span className="font-mono tabular-nums">{prompt && eur.format(Math.abs(prompt.amount))}</span> ·{" "}
              {prompt && shortDate.format(new Date(prompt.date))}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Always also files every past and future charge matching{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">{prompt?.pattern}</code>.
          </p>
          <DialogFooter>
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
            <Button
              onClick={() => {
                if (!prompt) return;
                void post({ type: "rule", txId: prompt.txId, category: prompt.category }).then(() =>
                  post({ type: "override", txId: prompt.txId, category: prompt.category })
                );
                setPrompt(null);
              }}
            >
              Always
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MerchantEditor
        subject={merchantSubject}
        onClose={() => setMerchantSubject(null)}
        onSave={(fields) => tryPost({ type: "merchant", ...merchantSubject?.target, ...fields })}
        onReset={() => tryPost({ type: "merchant-reset", ...merchantSubject?.target })}
      />

      <CategoriesEditor
        open={catsOpen}
        categories={board.categories.map((c) => ({ name: c.name, budget: c.budget }))}
        onClose={() => setCatsOpen(false)}
        onAction={editCategories}
      />

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

const SPARK_COLORS = { green: "var(--gain)", red: "var(--loss)", neutral: "var(--muted-foreground)" };

// Investments over time: the two snapshotted pots stacked — Lightyear in the
// gain green the tile's sparkline speaks, the LHV pot in Kopikas copper.
const INVESTMENTS_CHART = {
  lightyear: { label: "Lightyear", color: "var(--gain)" },
  lhv: { label: "LHV", color: "var(--primary)" },
} satisfies ChartConfig;

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

// A ledger row: icon · merchant/meta · category · amount, in fixed columns so
// categories and amounts align down the whole statement. Color is reserved
// for meaning — uncategorized (attention), incoming (gain), the partner's share.
function Tile({
  tx,
  onUnshare,
  onEditMerchant,
}: {
  tx: BoardTx;
  onUnshare: (shareId: string) => void;
  onEditMerchant: (tx: BoardTx) => void;
}) {
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
      {/* The avatar is the handle for the merchant's identity: name, favicon
          site, emoji. It swallows pointerdown so a click does not start a drag. */}
      <button
        type="button"
        className="rounded-full hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Change name or icon"
        aria-label={`Change the name or icon of ${tx.name}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onEditMerchant(tx)}
      >
        <MerchantIcon name={tx.name} domain={tx.domain} emoji={tx.emoji} />
      </button>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{tx.name}</div>
        <div className="flex min-w-0 items-baseline gap-1.5 text-xs text-muted-foreground">
          {tx.shared && tx.shareId && (
            <button
              type="button"
              className="shrink-0 font-medium text-shared hover:underline"
              title={`Shared with ${PARTNER_NAME}, who pays ${shareLabel(tx.partnerShare)}. Click to unshare`}
              aria-label={`Unshare — ${PARTNER_NAME} pays ${shareLabel(tx.partnerShare)} of this`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onUnshare(tx.shareId!)}
            >
              {shareLabel(tx.partnerShare)} {PARTNER_NAME}{tx.note && " ·"}
            </button>
          )}
          {tx.note && <span className="truncate">{tx.note}</span>}
          {category && (
            <span className="flex shrink-0 gap-1.5 sm:hidden">
              {(tx.shared || tx.note) && "· "}
              {category}
            </span>
          )}
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
  budget,
  share,
  active,
  onSelect,
}: {
  name: string;
  total: number;
  budget: number | null; // monthly limit, when set
  share: number; // 0..1 of the month's largest spending category
  active: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cat:${name}` });
  // With a limit the bar is a meter against it, on a faint track so it reads
  // as one; without, it is the row's share of the month's largest category.
  const over = budget != null && total > budget;
  const fill = budget != null ? Math.min(total / budget, 1) : share;
  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onSelect}
      title={budget != null ? `${eur.format(Math.abs(budget - total))} ${over ? "over the limit" : "left this month"}` : undefined}
      className={cn(
        "relative flex w-full cursor-pointer justify-between overflow-hidden rounded-md border border-dashed border-transparent px-2.5 py-1.5 text-left text-sm hover:bg-accent/50",
        isOver && "border-primary bg-accent",
        active && "bg-accent font-medium"
      )}
    >
      {budget != null && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-full bg-foreground/[0.04]" />}
      {fill > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 rounded-md transition-[width] duration-300 motion-reduce:transition-none",
            over ? "bg-attention/15" : "bg-primary/10"
          )}
          style={{ width: `${Math.round(fill * 1000) / 10}%` }}
        />
      )}
      <span className="relative">{name}</span>
      <span className={cn("relative text-muted-foreground", !isOver && "font-mono tabular-nums", over && !isOver && "text-attention")}>
        {isOver ? (
          "drop here"
        ) : (
          <>
            {total > 0 || budget != null ? eur.format(total) : ""}
            {budget != null && <span className="text-muted-foreground/70"> / {limit(budget)}</span>}
          </>
        )}
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

function PartnerZone({ share, onShareChange }: { share: number; onShareChange: (f: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "partner" });
  return (
    <div className="mb-2">
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{PARTNER_NAME} pays</span>
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
        {isOver ? `Drop to split — ${PARTNER_NAME} pays ${shareLabel(share)}` : `Drag an expense here to split with ${PARTNER_NAME}`}
      </div>
    </div>
  );
}

// The list behind the Categories card. Each row saves on blur or Enter, so
// there is nothing to batch and a failed rename shows up right away.
function CategoriesEditor({
  open,
  categories,
  onClose,
  onAction,
}: {
  open: boolean;
  categories: { name: string; budget: number | null }[];
  onClose: () => void;
  onAction: (action: CategoryAction) => Promise<string | null>; // null = saved, otherwise the reason it was not
}) {
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState("");
  const run = async (action: CategoryAction) => {
    const e = await onAction(action);
    setErr(e ?? "");
    return !e;
  };
  // The order on screen. Follows the server list, except for the moment
  // between a drop and the refetch, when it already shows the new order.
  const names = categories.map((c) => c.name);
  const [order, setOrder] = useState(names);
  useEffect(() => setOrder(categories.map((c) => c.name)), [categories]);
  const budgetOf = (name: string) => categories.find((c) => c.name === name)?.budget ?? null;
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = async (e: DragEndEvent) => {
    const from = order.indexOf(String(e.active.id));
    const to = e.over ? order.indexOf(String(e.over.id)) : -1;
    if (from < 0 || to < 0 || from === to) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    if (!(await run({ type: "category-order", order: next }))) setOrder(names);
  };
  const addNew = async () => {
    const name = newName.trim();
    if (name && (await run({ type: "category-add", name }))) setNewName("");
  };
  // A new row lands at the bottom of a list that scrolls: bring it into view.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [categories.length]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>
            Rename in place; everything filed under the old name follows. The right field is a monthly limit, empty
            for none.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <div ref={listRef} className="grid max-h-[55vh] gap-1.5 overflow-y-auto pr-0.5">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                {order.map((c) => (
                  <SortableRow key={c} id={c}>
                    <div className="flex gap-1.5">
                      {FIXED_CATEGORIES.includes(c) ? (
                        <Input value={c} disabled aria-label={`${c} (keeps its name)`} title="Wired into the board — keeps its name" />
                      ) : (
                        <NameField value={c} onCommit={(to) => run({ type: "category-rename", from: c, to })} />
                      )}
                      {c !== SAVINGS && (
                        <BudgetField
                          name={c}
                          value={budgetOf(c)}
                          onCommit={(budget) => run({ type: "category-budget", name: c, budget })}
                        />
                      )}
                    </div>
                  </SortableRow>
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div className="mt-1 flex gap-2">
            <Input
              placeholder="New category"
              aria-label="New category"
              name="new-category"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addNew();
                }
              }}
            />
            <Button variant="outline" disabled={!newName.trim()} onClick={() => void addNew()}>
              Add
            </Button>
          </div>
          <p className={cn("min-h-4 text-xs", err ? "text-destructive" : "text-muted-foreground")}>
            {err || `${SAVINGS} and ${SUBSCRIPTIONS} are wired into the board and keep their names.`}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// A row of the list with a grip to drag it by. Only the grip starts a drag,
// so the text field beside it still selects and edits normally.
function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined, transition }}
      className={cn("flex items-center gap-1", isDragging && "relative z-10")}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Move ${id}`}
        title="Drag to reorder"
        className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent hover:text-foreground active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// One editable category name. Commits on blur or Enter when changed; a
// refused rename puts the saved name back, and so does Escape (which also
// closes the dialog, so the blur that follows must see the reset — hence the ref).
function NameField({ value, onCommit }: { value: string; onCommit: (to: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value);
  const latest = useRef(value);
  const set = (v: string) => {
    latest.current = v;
    setDraft(v);
  };
  useEffect(() => set(value), [value]);
  return (
    <Input
      aria-label={`Rename ${value}`}
      value={draft}
      onChange={(e) => set(e.target.value)}
      onBlur={async () => {
        const to = latest.current.trim();
        if (to && to !== value && (await onCommit(to))) return;
        set(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") set(value);
      }}
    />
  );
}

// One category's monthly limit, or none. Commits on blur or Enter; an empty
// field removes the limit. Same ref trick as NameField, for the same reason.
function BudgetField({
  name,
  value,
  onCommit,
}: {
  name: string;
  value: number | null;
  onCommit: (budget: number | null) => Promise<boolean>;
}) {
  const text = value == null ? "" : String(value);
  const [draft, setDraft] = useState(text);
  const latest = useRef(text);
  const set = (v: string) => {
    latest.current = v;
    setDraft(v);
  };
  useEffect(() => set(text), [text]);
  return (
    <Input
      aria-label={`Monthly limit for ${name}, in euros`}
      placeholder="€ / mo"
      inputMode="decimal"
      className="w-24 shrink-0 text-right font-mono tabular-nums"
      value={draft}
      onChange={(e) => set(e.target.value)}
      onBlur={async () => {
        const raw = latest.current.replace(/[\s€]/g, "").replace(",", ".");
        const budget = raw === "" ? null : Number(raw);
        if (budget !== null && !(budget > 0)) return set(text);
        if (budget === value) return;
        if (!(await onCommit(budget))) set(text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") set(text);
      }}
    />
  );
}

type PotLatest = { total: number; returnPct?: number; at: string; auto?: boolean } | null;

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
  // Once the sync feeds the LHV pot, only Lightyear is entered by hand.
  const pots = latest.lhv?.auto ? (["lightyear"] as const) : (["lightyear", "lhv"] as const);
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
          <DialogDescription>
            Every update is logged — decreases too.
            {latest.lhv?.auto && " The LHV account comes in with every sync; only Lightyear is entered here."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {pots.length > 1 && (
          <div className="flex gap-1" role="radiogroup" aria-label="Which pot">
            {pots.map((p) => (
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
          )}
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
