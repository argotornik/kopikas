"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import { cn, shareLabel } from "@/lib/utils";
import { OWNER_NAME, PARTNER_NAME } from "@/lib/names";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CoinMark } from "@/components/coin-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${eur.format(Math.abs(n))}`;

type Person = "owner" | "partner";

interface SharedView {
  role: Person;
  balance: number; // positive = the partner owes the owner
  sharedItems: {
    id: string;
    paidBy: Person;
    date: string;
    description: string;
    total: number;
    partnerShare?: number;
    category: string | null;
  }[];
  settlements: { id: string; amount: number; date: string; note?: string }[];
  categories: string[];
}

// One statement row. `movement` is how the tab changed (positive = the partner owes
// more), `running` the tab after it — read top-down, the column walks from
// the headline back to zero.
type Row = { movement: number; running: number; date: string } & (
  | { kind: "share"; item: SharedView["sharedItems"][number] }
  | { kind: "settle"; settlement: SharedView["settlements"][number] }
);

type Month = { month: string; rows: Row[]; spentTogether: number; byCategory: [string, number][] };

// Newest-first rows into month sections, each with what the two spent
// together and on what.
function groupMonths(rows: Row[]): Month[] {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return [...groups.entries()].map(([month, list]) => {
    const shares = list.filter((r) => r.kind === "share");
    const byCategory = new Map<string, number>();
    for (const r of shares) {
      if (r.kind !== "share") continue;
      const key = r.item.category ?? "unsorted";
      byCategory.set(key, (byCategory.get(key) ?? 0) + r.item.total);
    }
    return {
      month,
      rows: list,
      spentTogether: shares.reduce((s, r) => s + (r.kind === "share" ? r.item.total : 0), 0),
      byCategory: [...byCategory].sort((a, b) => b[1] - a[1]),
    };
  });
}

const SPLIT_OPTIONS = [
  { fraction: 0.5, label: "1/2" },
  { fraction: 1 / 3, label: "1/3" },
  { fraction: 0.25, label: "1/4" },
];

// Clean by default: date · what · what moved the tab. Details adds the running
// balance, and folds the bill and the share into the row's text — a statement
// shows what moved and where it leaves you; the working is there to read, not
// to scan.
const GRID_CLEAN = "grid items-baseline gap-x-3 px-3 grid-cols-[3rem_minmax(0,1fr)_5.5rem_1.25rem] sm:grid-cols-[3.25rem_minmax(0,1fr)_5.5rem_1.25rem]";
// On phones the running balance stacks under the movement (one figure column),
// so the description keeps its width.
const GRID_FULL =
  "grid items-baseline gap-x-3 px-3 grid-cols-[3rem_minmax(0,1fr)_5.5rem_1.25rem] sm:grid-cols-[3.25rem_minmax(0,1fr)_5.5rem_5.5rem_1.25rem]";

// Pooleks ("in half"): the couple's tab as a statement. Same page for both
// of them; only the labels flip.
export function Pooleks({ role }: { role: Person }) {
  const [view, setView] = useState<SharedView | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [share, setShare] = useState(0.5);
  const [category, setCategory] = useState("");
  const [err, setErr] = useState("");
  const [settleOpen, setSettleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [details, setDetails] = useState(false);
  useEffect(() => {
    try {
      setDetails(localStorage.getItem("kopikas-pooleks-details") === "1");
    } catch {}
  }, []);
  const toggleDetails = () =>
    setDetails((d) => {
      try {
        localStorage.setItem("kopikas-pooleks-details", d ? "0" : "1");
      } catch {}
      return !d;
    });
  const GRID = details ? GRID_FULL : GRID_CLEAN;
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");

  const refetch = useCallback(async () => {
    const res = await fetch("/api/shared", { cache: "no-store" });
    setView(await res.json());
  }, []);
  useEffect(() => {
    void refetch();
  }, [refetch]);

  const post = useCallback(
    async (action: object) => {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (!res.ok) setErr("Couldn't save that — try again.");
      await refetch();
      return res.ok;
    },
    [refetch]
  );

  // "You" for whoever is looking; the other by name.
  const names = role === "owner" ? { owner: "You", partner: PARTNER_NAME } : { owner: OWNER_NAME, partner: "You" };
  const owes = (who: string) => (who === "You" ? "owe" : "owes");
  const today = new Date().toISOString().slice(0, 10);

  // Oldest → newest to accumulate the running tab, then newest first to show.
  // Everything up to the last repayment is history: it folds into one line
  // and opens on request, so the statement shows what is open between the two.
  const [showSettled, setShowSettled] = useState(false);
  const statement = useMemo(() => {
    if (!view) return { open: [] as Month[], settled: [] as Month[], fold: null };
    const chronological = [
      ...view.sharedItems.map((item) => ({ kind: "share" as const, date: item.date, item })),
      ...view.settlements.map((settlement) => ({ kind: "settle" as const, date: settlement.date, settlement })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const rows: Row[] = chronological.map((e) => {
      const movement =
        e.kind === "share"
          ? e.item.paidBy === "owner"
            ? e.item.total * (e.item.partnerShare ?? 0.5)
            : -(e.item.total * (1 - (e.item.partnerShare ?? 0.5)))
          : -e.settlement.amount;
      running += movement;
      return { ...e, movement, running };
    });
    // The last repayment closes the book on everything before it, itself included.
    const lastSettle = rows.findLastIndex((r) => r.kind === "settle");
    const settledRows = rows.slice(0, lastSettle + 1).reverse();
    const openRows = rows.slice(lastSettle + 1).reverse();
    const fold =
      lastSettle < 0
        ? null
        : {
            date: rows[lastSettle].date,
            lines: settledRows.length,
            carried: Math.round(rows[lastSettle].running * 100) / 100,
          };
    return { open: groupMonths(openRows), settled: groupMonths(settledRows), fold };
  }, [view]);
  const months = statement.open;
  const settledMonths = statement.settled;
  const fold = statement.fold;

  const foldLine = fold && (
    <div className={cn("px-3 py-2 text-xs text-muted-foreground", months.length > 0 && "border-t border-border/70")}>
      <button
        type="button"
        onClick={() => setShowSettled((s) => !s)}
        aria-expanded={showSettled}
        className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 hover:bg-accent hover:text-foreground"
      >
        <span>
          {months.length === 0 && "All square. "}
          Settled up to {shortDate.format(new Date(fold.date))} · {fold.lines} {fold.lines === 1 ? "line" : "lines"}
          {fold.carried !== 0 && ` · ${signed(fold.carried)} carried`}
        </span>
        <span className="shrink-0">{showSettled ? "Hide" : "Show"}</span>
      </button>
    </div>
  );

  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat(
      "en-GB",
      m.slice(0, 4) === today.slice(0, 4) ? { month: "long" } : { month: "long", year: "numeric" }
    ).format(new Date(m + "-01T00:00:00Z"));

  const add = async () => {
    const a = Number(amount.replace(",", "."));
    if (!desc.trim() || !(a > 0)) {
      setErr("Add a description and a positive amount");
      return;
    }
    setErr("");
    if (
      await post({
        type: "quickadd",
        description: desc,
        amount: a,
        date: today,
        partnerShare: share,
        category: category || undefined,
      })
    ) {
      setDesc("");
      setAmount("");
      setCategory("");
      setAddOpen(false);
    }
  };

  if (!view) return <div className="mx-auto max-w-xl px-5 py-6 text-sm text-muted-foreground">Loading…</div>;
  const bal = view.balance;
  // Balance sentence from the viewer's side. bal > 0 means the partner owes the owner.
  const balanceText =
    bal === 0
      ? "All square"
      : bal > 0
        ? `${names.partner} ${owes(names.partner)} ${names.owner === "You" ? "you" : names.owner}`
        : `${names.owner} ${owes(names.owner)} ${names.partner === "You" ? "you" : names.partner}`;
  const tabHeader = role === "owner" ? `${PARTNER_NAME} owes` : "You owe";
  // What the visible number on each row is: that person's part of the bill,
  // signed by how it moved the tab. Same words as the split control.
  const shareHeader = role === "owner" ? `${PARTNER_NAME} pays` : "you pay";
  // "Partner → you" / "You → Owner": from whoever owes to whoever is owed.
  const arrow = (from: string, to: string) => `${from} → ${to === "You" ? "you" : to}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          <CoinMark />
          Pooleks
        </h1>
        <div className="flex items-center gap-1.5">
          {role === "owner" && (
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← board
            </a>
          )}
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      <Card className="gap-3 py-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div>
            <div className="text-xl font-semibold">
              {balanceText}
              {bal !== 0 && <span className="ml-2 font-mono tabular-nums">{eur.format(Math.abs(bal))}</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {view.sharedItems.length} shared · {view.settlements.length} repayment
              {view.settlements.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAddOpen(true)}>Add expense</Button>
            <Button
              variant="outline"
              disabled={bal === 0}
              onClick={() => {
                setSettleAmount(Math.abs(bal).toFixed(2));
                setSettleNote("");
                setSettleOpen(true);
              }}
            >
              Settle up
            </Button>
          </div>
        </CardContent>
      </Card>

      {months.length === 0 && settledMonths.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nothing shared yet. On the board, drop an expense on the Pooleks zone — or add something you paid for below.
        </p>
      ) : (
        // The statement: one sheet, ruled rows, month headers as section rules.
        <div className="overflow-hidden rounded-xl bg-card pb-2 ring-1 ring-foreground/10">
          {/* One head row: the view toggle in the label columns, column heads on the rail. */}
          <div className={cn(GRID, "items-center pb-1 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground")}>
            <div className="col-span-2 -ml-2">
              <button
                type="button"
                onClick={toggleDetails}
                aria-pressed={details}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs normal-case tracking-normal text-muted-foreground hover:bg-accent hover:text-foreground"
                title={details ? "Hide amounts and running balance" : "Show amounts and running balance"}
              >
                {details ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                {details ? "Hide details" : "Details"}
              </button>
            </div>
            <span className="text-right">{shareHeader}</span>
            {details && <span className="hidden text-right sm:block">{tabHeader}</span>}
            <span />
          </div>
          {[...months, ...(showSettled ? settledMonths : [])].map((m, mi) => (
            <div key={m.month}>
              {fold && mi === months.length && foldLine}
              <div className={cn(GRID, "pb-1.5 pt-3", mi > 0 && "border-t border-border/70")}>
                <span className="col-span-2 font-heading text-xs uppercase tracking-wide text-muted-foreground">
                  {monthLabel(m.month)}
                </span>
                {details && (
                  <>
                    <span
                      className="text-right font-mono text-xs tabular-nums text-muted-foreground"
                      title="How this month moved the tab"
                    >
                      {signed(m.rows.reduce((sum, r) => sum + r.movement, 0))}
                    </span>
                    <span className="hidden sm:block" />
                  </>
                )}
                <span />
              </div>
              {details && (
                // What the two of you spent together this month, full bills, and on what.
                <div className={cn(GRID, "pb-1.5")}>
                  <span />
                  <span className="col-span-3 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span title="Spent together this month, full amounts">
                      Together <span className="font-mono tabular-nums">{eur.format(m.spentTogether)}</span>
                    </span>
                    {m.byCategory.length > 1 &&
                      m.byCategory.map(([name, total]) => (
                        <span key={name}>
                          {name} <span className="font-mono tabular-nums">{eur.format(total)}</span>
                        </span>
                      ))}
                  </span>
                </div>
              )}
              {m.rows.map((r, i) =>
                r.kind === "settle" ? (
                  <div
                    key={r.settlement.id}
                    className={cn(GRID, "py-2 text-xs text-muted-foreground", i > 0 && "border-t border-border/70")}
                  >
                    <span>{shortDate.format(new Date(r.date))}</span>
                    <span className="truncate italic">
                      {r.settlement.amount > 0 ? `${names.partner} paid back` : `${names.owner} paid back`}
                      {r.settlement.note && ` · ${r.settlement.note}`}
                    </span>
                    <span className="text-right font-mono text-sm tabular-nums text-foreground">
                      {signed(r.movement)}
                      {details && <span className="block text-xs text-muted-foreground sm:hidden">{eur.format(r.running)}</span>}
                    </span>
                    {details && (
                      <span className="hidden text-right font-mono text-sm tabular-nums text-foreground sm:block">
                        {eur.format(r.running)}
                      </span>
                    )}
                    <span />
                  </div>
                ) : (
                  <div key={r.item.id} className={cn(GRID, "group py-1.5", i > 0 && "border-t border-border/70")}>
                    <span className="text-xs text-muted-foreground">{shortDate.format(new Date(r.date))}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm">
                        <span className="font-medium">{r.item.description}</span>
                        <span className="hidden text-muted-foreground sm:inline">
                          {" · "}
                          {r.item.category ?? "unsorted"}
                          {r.item.paidBy === "partner" && ` · ${names.partner} paid`}
                          {details && ` · ${shareLabel(r.item.partnerShare)} of ${eur.format(r.item.total)}`}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground sm:hidden">
                        {r.item.category ?? "unsorted"}
                        {r.item.paidBy === "partner" && ` · ${names.partner} paid`}
                        {details && ` · ${shareLabel(r.item.partnerShare)} of ${eur.format(r.item.total)}`}
                      </div>
                    </div>
                    <span className="text-right font-mono text-sm font-medium tabular-nums text-foreground">
                      {signed(r.movement)}
                      {details && (
                        <span className="block text-xs font-normal text-muted-foreground sm:hidden">{eur.format(r.running)}</span>
                      )}
                    </span>
                    {details && (
                      <span className="hidden text-right font-mono text-sm tabular-nums sm:block">{eur.format(r.running)}</span>
                    )}
                    {role === "owner" ? (
                      <button
                        type="button"
                        className="flex size-5 items-center justify-center justify-self-end rounded text-muted-foreground hover:text-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                        title="Remove from Pooleks"
                        aria-label={`Remove ${r.item.description} from Pooleks`}
                        onClick={() => void post({ type: "unshare", shareId: r.item.id })}
                      >
                        <XIcon className="size-3" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                )
              )}
            </div>
          ))}
          {fold && !showSettled && foldLine}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>I paid for something shared</DialogTitle>
            <DialogDescription>Added at full price — the split takes care of the shares.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
          <Input
            placeholder="What was it, e.g. Dinner at Kivi Paber Käärid"
            aria-label="What was it"
            name="description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Amount, e.g. 54.00"
              aria-label="Amount in euros"
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button onClick={() => void add()}>Add</Button>
          </div>
          <select
            aria-label="Category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Category (optional)</option>
            {(view?.categories ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{role === "owner" ? `${PARTNER_NAME} pays` : "You pay"}</span>
            <div className="flex gap-1">
              {SPLIT_OPTIONS.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setShare(o.fraction)}
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
          <p className="min-h-4 text-xs text-destructive" aria-live="polite">
            {err}
          </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settleOpen} onOpenChange={(o) => !o && setSettleOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Settle up</DialogTitle>
            <DialogDescription>
              {bal > 0 ? arrow(names.partner, names.owner) : arrow(names.owner, names.partner)} · records a repayment and moves the tab toward zero.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              aria-label="Amount in euros"
              name="settle-amount"
              inputMode="decimal"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Note (optional), e.g. cash at dinner"
              aria-label="Note"
              name="settle-note"
              value={settleNote}
              onChange={(e) => setSettleNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const a = Number(settleAmount.replace(",", "."));
                if (!(a > 0)) return;
                void post({
                  type: "settle",
                  amount: bal > 0 ? a : -a,
                  date: today,
                  note: settleNote.trim() || undefined,
                });
                setSettleOpen(false);
              }}
            >
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
