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
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { CheckCircle2Icon, HandCoinsIcon, InboxIcon, RepeatIcon, SettingsIcon, SproutIcon } from "lucide-react";
import type { Board as BoardData, BoardTx, Spark } from "@/lib/board";
import { cn } from "@/lib/utils";
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
      if (!tx.shared) void post({ type: "share", txId: tx.id });
    } else if (over === "subs") {
      void post({ type: "subscribe", txId: tx.id });
    } else if (over.startsWith("cat:")) {
      const category = over.slice(4);
      if (category !== tx.category) setPrompt({ txId: tx.id, merchant: tx.counterparty, category });
    }
  };

  const days = useMemo(() => {
    const visible = filter
      ? board.txs.filter((t) =>
          filter === "Uncategorized" ? !t.category && t.amount < 0 && !t.micro : t.category === filter
        )
      : board.txs;
    const map = new Map<string, BoardTx[]>();
    for (const tx of visible) {
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date)!.push(tx);
    }
    return [...map.entries()];
  }, [board.txs, filter]);

  // This month's outgoing total for the active filter (mirrors the rail's math).
  const filterMonthTotal = useMemo(() => {
    if (!filter) return 0;
    return (
      Math.round(
        board.txs
          .filter(
            (t) =>
              t.date.slice(0, 7) === board.month &&
              t.amount < 0 &&
              (filter === "Uncategorized" ? !t.category && !t.micro : t.category === filter)
          )
          .reduce((s, t) => s + Math.abs(t.amount), 0) * 100
      ) / 100
    );
  }, [board.txs, board.month, filter]);

  const toggleFilter = (name: string) => setFilter((f) => (f === name ? null : name));

  const bal = board.balance;
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(
    new Date(board.month + "-01T00:00:00Z")
  );

  return (
    <DndContext
      id="board"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="mx-auto max-w-6xl px-5 py-6 pb-20">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Kopikas</h1>
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
                    )} · update`
                  : "click to add"
              }
              interactive
              spark={board.sparks.lightyear}
            />
          </button>
        </div>

        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            {filter && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="font-medium">{filter}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {eur.format(filterMonthTotal)} in {monthName}
                </span>
                <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => setFilter(null)}>
                  Show all
                </Button>
              </div>
            )}
            {days.length === 0 ? (
              filter ? (
                <Empty className="p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CheckCircle2Icon />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm">
                      {filter === "Uncategorized" ? "Everything filed" : `No ${filter} transactions`}
                    </EmptyTitle>
                    <EmptyDescription>
                      <Button variant="outline" size="sm" onClick={() => setFilter(null)}>
                        Show all
                      </Button>
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
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
              days.map(([date, txs]) => {
                const micro = txs.filter((t) => t.micro);
                const microOut = micro.filter((t) => t.amount < 0);
                const microTotal = microOut.reduce((s, t) => s + Math.abs(t.amount), 0);
                return (
                  <div key={date}>
                    <div className="mb-1.5 mt-4 text-xs text-muted-foreground first:mt-0">
                      {dayFmt.format(new Date(date))}
                    </div>
                    {txs
                      .filter((t) => !t.micro)
                      .map((tx) => (
                        <Tile key={tx.id} tx={tx} onUnshare={(id) => void post({ type: "unshare", shareId: id })} />
                      ))}
                    {micro.length > 0 && (
                      <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground">
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
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4 md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:self-start md:overflow-y-auto">
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                  Categories · {monthName}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-0.5 px-4">
                {board.uncategorizedCount > 0 ? (
                  <button
                    className={cn(
                      "flex w-full justify-between rounded-md bg-attention/15 px-2.5 py-1.5 text-left text-sm font-medium text-attention",
                      filter === "Uncategorized" && "ring-2 ring-attention"
                    )}
                    onClick={() => toggleFilter("Uncategorized")}
                  >
                    <span>Uncategorized</span>
                    <span>{board.uncategorizedCount} tiles — drag them</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-muted-foreground">
                    <CheckCircle2Icon className="size-4 text-gain" />
                    Everything filed
                  </div>
                )}
                {board.categories.map((c) => (
                  <CategoryRow
                    key={c.name}
                    name={c.name}
                    total={c.total}
                    active={filter === c.name}
                    onSelect={() => toggleFilter(c.name)}
                  />
                ))}
              </CardContent>
            </Card>

            <Card className="gap-3 py-4">
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
                <div className="divide-y">
                  {board.subscriptions
                    .filter((s) => s.sub.active)
                    .map((s) => (
                      <div className="flex items-center gap-2 py-2" key={s.sub.id}>
                        <MerchantIcon name={s.sub.name} domain={s.domain} className="size-6" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{s.sub.name}</div>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                            <span>
                              {s.sub.cadence} · due {s.nextDue ? shortDate.format(new Date(s.nextDue)) : "?"}
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
                {board.subscriptions.some((s) => s.sub.active) && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Monthly burn:{" "}
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {eur.format(board.monthlyBurn)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Split with Anni</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <AnniZone />
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
                      {s.description} <span className="text-muted-foreground">· {s.paidBy === "argo" ? "you paid" : "Anni paid"}</span>
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
        onSave={(total, holdings) => {
          void post({ type: "snapshot", total, holdings });
          setSnapOpen(false);
        }}
      />
    </DndContext>
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
          title="Shared 50/50 with Anni — click to unshare"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onUnshare(tx.shareId!)}
        >
          ½ Anni
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

function AnniZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "anni" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mb-2 rounded-lg border-2 border-dashed p-2.5 text-center text-xs text-muted-foreground",
        isOver && "border-primary bg-accent text-foreground"
      )}
    >
      {isOver ? "Drop to split 50/50" : "Drag an expense here to split with Anni"}
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
  onSave: (total: number, holdings: { name: string; pct: number }[]) => void;
}) {
  const [total, setTotal] = useState("");
  const [holdings, setHoldings] = useState("");
  const [err, setErr] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Lightyear value</DialogTitle>
          <DialogDescription>
            Every update is logged — decreases too. Holdings like “VWCE 70, MMF 25”.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Input placeholder="Total value, e.g. 9450.20" value={total} onChange={(e) => setTotal(e.target.value)} autoFocus />
          <Input placeholder="Holdings % (optional)" value={holdings} onChange={(e) => setHoldings(e.target.value)} />
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
              const parsed = holdings
                .split(",")
                .map((part) => part.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)$/))
                .filter(Boolean)
                .map((m) => ({ name: m![1], pct: Number(m![2]) }));
              onSave(t, parsed);
            }}
          >
            Save snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
