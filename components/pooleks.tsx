"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { XIcon } from "lucide-react";
import { CATEGORIES } from "@/lib/engine";
import { cn, shareLabel } from "@/lib/utils";
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
import { CoinMark } from "@/components/coin-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

type Person = "argo" | "anni";

interface SharedView {
  role: Person;
  balance: number; // positive = Anni owes Argo
  sharedItems: {
    id: string;
    paidBy: Person;
    date: string;
    description: string;
    total: number;
    anniShare?: number;
    category: string | null;
  }[];
  settlements: { id: string; amount: number; date: string; note?: string }[];
  suggestions: { txId: string; date: string; amount: number; counterparty: string }[];
}

type Entry =
  | { kind: "share"; date: string; item: SharedView["sharedItems"][number] }
  | { kind: "settle"; date: string; settlement: SharedView["settlements"][number] };

const SPLIT_OPTIONS = [
  { fraction: 0.5, label: "1/2" },
  { fraction: 1 / 3, label: "1/3" },
  { fraction: 0.25, label: "1/4" },
];

// Pooleks ("in half"): the shared ledger as a two-person timeline — what Argo
// paid on the left, what Anni paid on the right, settlements as markers
// between. Same page for both; only the labels flip.
export function Pooleks({ role }: { role: Person }) {
  const [view, setView] = useState<SharedView | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [share, setShare] = useState(0.5);
  const [category, setCategory] = useState("");
  const [err, setErr] = useState("");
  const [settleOpen, setSettleOpen] = useState(false);
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
  const names = role === "argo" ? { argo: "You", anni: "Anni" } : { argo: "Argo", anni: "You" };
  const owes = (who: string) => (who === "You" ? "owe" : "owes");
  const today = new Date().toISOString().slice(0, 10);

  const months = useMemo(() => {
    if (!view) return [];
    const entries: Entry[] = [
      ...view.sharedItems.map((item) => ({ kind: "share" as const, date: item.date, item })),
      ...view.settlements.map((settlement) => ({ kind: "settle" as const, date: settlement.date, settlement })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    const groups = new Map<string, Entry[]>();
    for (const e of entries) {
      const key = e.date.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return [...groups.entries()].map(([month, list]) => ({
      month,
      entries: list,
      argoPaid: list.reduce((s, e) => s + (e.kind === "share" && e.item.paidBy === "argo" ? e.item.total : 0), 0),
      anniPaid: list.reduce((s, e) => s + (e.kind === "share" && e.item.paidBy === "anni" ? e.item.total : 0), 0),
      // What the month cost the couple, by kind — full totals, not shares.
      byCategory: [...list.reduce((m, e) => {
        if (e.kind !== "share") return m;
        const key = e.item.category ?? "unsorted";
        return m.set(key, (m.get(key) ?? 0) + e.item.total);
      }, new Map<string, number>())]
        .sort((a, b) => b[1] - a[1]),
    }));
  }, [view]);

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
        anniShare: share,
        category: category || undefined,
      })
    ) {
      setDesc("");
      setAmount("");
      setCategory("");
    }
  };

  if (!view) return <div className="mx-auto max-w-xl px-5 py-6 text-sm text-muted-foreground">Loading…</div>;
  const bal = view.balance;
  // Balance sentence from the viewer's side. bal > 0 means Anni owes Argo.
  const balanceText =
    bal === 0
      ? "All square"
      : bal > 0
        ? `${names.anni} ${owes(names.anni)} ${names.argo === "You" ? "you" : names.argo}`
        : `${names.argo} ${owes(names.argo)} ${names.anni === "You" ? "you" : names.anni}`;
  // Good news for the viewer when the other person owes them.
  const balanceGood = bal === 0 || (role === "argo" ? bal > 0 : bal < 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          <CoinMark />
          Pooleks
        </h1>
        <div className="flex items-center gap-1.5">
          {role === "argo" && (
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
            <div className={cn("text-xl font-semibold", balanceGood ? "text-gain" : "text-loss")}>
              {balanceText}
              {bal !== 0 && <span className="ml-2 font-mono tabular-nums">{eur.format(Math.abs(bal))}</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {view.sharedItems.length} shared · {view.settlements.length} settled up
            </div>
          </div>
          {role === "argo" && (
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
          )}
        </CardContent>
        {view.suggestions.length > 0 && (
          <CardContent className="flex flex-col gap-2 px-4">
            {view.suggestions.map((sg) => (
              <div className="flex items-center justify-between gap-2 rounded-md bg-gain/10 p-2.5 text-xs" key={sg.txId}>
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
        )}
      </Card>

      {months.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nothing shared yet. On the board, drop an expense on the Pooleks zone — or add something you paid for below.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between px-1 text-xs uppercase tracking-wide text-muted-foreground">
            <span>{names.argo} paid</span>
            <span>{names.anni} paid</span>
          </div>
          {months.map((m) => (
            <div key={m.month} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between px-1 pb-1 pt-4">
                <span className="font-heading text-sm font-semibold">{monthLabel(m.month)}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {eur.format(m.argoPaid)} · {eur.format(m.anniPaid)}
                </span>
              </div>
              {m.byCategory.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-1 pb-1 text-xs text-muted-foreground">
                  {m.byCategory.map(([name, total]) => (
                    <span key={name}>
                      {name} <span className="font-mono tabular-nums text-foreground">{eur.format(total)}</span>
                    </span>
                  ))}
                </div>
              )}
              {m.entries.map((e) =>
                e.kind === "settle" ? (
                  <div key={e.settlement.id} className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    <span>
                      {e.settlement.amount > 0 ? names.anni : names.argo} paid back{" "}
                      <span className="font-mono tabular-nums text-foreground">
                        {eur.format(Math.abs(e.settlement.amount))}
                      </span>{" "}
                      · {shortDate.format(new Date(e.date))}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                ) : (
                  <div key={e.item.id} className={cn("flex", e.item.paidBy === "argo" ? "justify-start" : "justify-end")}>
                    <div className="w-[88%] rounded-lg bg-card px-3 py-2 ring-1 ring-foreground/10 sm:w-[48%]">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium">{e.item.description}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <span className="font-mono text-sm font-semibold tabular-nums">{eur.format(e.item.total)}</span>
                          {role === "argo" && (
                            <button
                              type="button"
                              className="-mr-1 flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                              title="Remove from Pooleks"
                              aria-label={`Remove ${e.item.description} from Pooleks`}
                              onClick={() => void post({ type: "unshare", shareId: e.item.id })}
                            >
                              <XIcon className="size-3" />
                            </button>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">
                          {shortDate.format(new Date(e.date))}
                          {e.item.category && ` · ${e.item.category}`}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums">
                          {e.item.paidBy === "argo"
                            ? `${names.anni} ${owes(names.anni)} ${eur.format(e.item.total * (e.item.anniShare ?? 0.5))}`
                            : `${names.argo} ${owes(names.argo)} ${eur.format(e.item.total * (1 - (e.item.anniShare ?? 0.5)))}`}
                          {shareLabel(e.item.anniShare) !== "1/2" && ` (${shareLabel(e.item.anniShare)})`}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">I paid for something shared</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-4">
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
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{role === "argo" ? "Anni pays" : "You pay"}</span>
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
        </CardContent>
      </Card>

      <Dialog open={settleOpen} onOpenChange={(o) => !o && setSettleOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Settle up</DialogTitle>
            <DialogDescription>
              {bal > 0 ? "Anni → you" : "You → Anni"} · records a repayment and moves the balance toward zero.
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
