"use client";

import { useCallback, useEffect, useState } from "react";
import { HandCoinsIcon } from "lucide-react";
import { cn, shareLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

interface SharedView {
  balance: number;
  sharedItems: {
    id: string;
    paidBy: string;
    date: string;
    description: string;
    total: number;
    anniShare?: number;
  }[];
  settlements: { id: string; amount: number; date: string }[];
}

export default function AnniPage() {
  const [view, setView] = useState<SharedView | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");

  const refetch = useCallback(async () => {
    const res = await fetch("/api/shared", { cache: "no-store" });
    setView(await res.json());
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const add = async () => {
    const a = Number(amount.replace(",", "."));
    if (!desc.trim() || !(a > 0)) {
      setErr("Add a description and a positive amount");
      return;
    }
    setErr("");
    await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "quickadd",
        description: desc,
        amount: a,
        date: new Date().toISOString().slice(0, 10),
      }),
    });
    setDesc("");
    setAmount("");
    await refetch();
  };

  if (!view) return <div className="mx-auto max-w-xl px-5 py-6 text-sm text-muted-foreground">Loading…</div>;
  const bal = view.balance;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Shared with Argo</h1>
        <div className="flex items-center gap-1.5">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← board
          </a>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      <Card className="gap-3 py-4">
        <CardContent className="px-4">
          {view.sharedItems.length === 0 && (
            <Empty className="p-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HandCoinsIcon />
                </EmptyMedia>
                <EmptyTitle className="text-sm">All square</EmptyTitle>
                <EmptyDescription>
                  Anything either of you marks as shared shows up here, with the running balance.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {view.sharedItems.length > 0 && (
            <div className={cn("mb-2 text-base font-semibold", bal <= 0 ? "text-gain" : "text-loss")}>
              {bal === 0 ? (
                "All square"
              ) : (
                <>
                  {bal > 0 ? "You owe Argo " : "Argo owes you "}
                  <span className="font-mono tabular-nums">{eur.format(Math.abs(bal))}</span>
                </>
              )}
            </div>
          )}
          {view.sharedItems.map((s) => (
            <div className="flex items-baseline gap-2 py-1 text-xs" key={s.id}>
              <span className="min-w-0 flex-1 truncate text-foreground">
                {s.description}
                <span className="text-muted-foreground">
                  {" "}
                  · {s.paidBy === "argo" ? "Argo paid" : "you paid"} · {dayFmt.format(new Date(s.date))}
                </span>
              </span>
              <span className="w-20 shrink-0 text-right font-mono tabular-nums text-foreground">
                {eur.format(s.total)}
              </span>
              <span className="hidden w-20 shrink-0 text-right font-mono tabular-nums text-muted-foreground sm:block">
                {shareLabel(s.anniShare)} {eur.format(s.total * (s.anniShare ?? 0.5))}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
            I paid for something shared
          </CardTitle>
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
          {err && <p className="text-xs text-destructive">{err}</p>}
          <p className="text-xs text-muted-foreground">Added at full price — the split math takes your half automatically.</p>
        </CardContent>
      </Card>
    </div>
  );
}
