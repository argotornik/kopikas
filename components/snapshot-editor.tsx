"use client";

import { useState } from "react";
import { cn, parseAmount } from "@/lib/utils";
import { Field, FormError, Pending } from "@/components/form-status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

type PotLatest = { total: number; returnPct?: number; at: string; auto?: boolean } | null;

export function SnapshotEditor({
  open,
  latest,
  onClose,
  onSave,
  className,
}: {
  open: boolean;
  latest: { lightyear: PotLatest; lhv: PotLatest };
  onClose: () => void;
  // null when saved, otherwise the server's reason
  onSave: (
    source: "lightyear" | "lhv",
    total: number,
    holdings: { name: string; pct: number }[],
    returnPct?: number
  ) => Promise<string | null>;
  className?: string; // a page's own look for the dialog
}) {
  const [source, setSource] = useState<"lightyear" | "lhv">("lightyear");
  const [saving, setSaving] = useState(false);
  // Once the sync feeds the LHV pot, only Lightyear is entered by hand.
  const pots = latest.lhv?.auto ? (["lightyear"] as const) : (["lightyear", "lhv"] as const);
  const [total, setTotal] = useState("");
  const [returnPct, setReturnPct] = useState("");
  const [holdings, setHoldings] = useState("");
  const [err, setErr] = useState("");
  const current = latest[source];
  // An empty total is "not entered", never 0 €: every update is logged, and
  // a zero would draw the pot falling to nothing.
  const save = async () => {
    if (saving) return;
    const t = parseAmount(total);
    if (total.trim() === "") return setErr("Enter the pot's total value first.");
    if (!(t >= 0)) return setErr("The total should be a number like 5917 or 5 917,40.");
    const pct = returnPct.trim() === "" ? undefined : parseAmount(returnPct.replace("%", ""));
    if (pct !== undefined && !Number.isFinite(pct)) return setErr("Return % should be a number like 2,24.");
    const parsed = holdings
      .split(",")
      .map((part) => part.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)$/))
      .filter(Boolean)
      .map((m) => ({ name: m![1], pct: Number(m![2]) }));
    setErr("");
    setSaving(true);
    const error = await onSave(source, t, source === "lightyear" ? parsed : [], pct);
    setSaving(false);
    if (error) return setErr(error);
    setTotal("");
    setReturnPct("");
    setHoldings("");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn("sm:max-w-sm", className)}>
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
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
          <Field label="Total value, €">
            {(id) => (
              <Input
                id={id}
                placeholder="e.g. 5 917,40"
                name="snapshot-total"
                inputMode="decimal"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                autoFocus
              />
            )}
          </Field>
          <Field label="Return % (optional)">
            {(id) => (
              <Input
                id={id}
                placeholder="e.g. 2,24"
                name="snapshot-return"
                inputMode="decimal"
                value={returnPct}
                onChange={(e) => setReturnPct(e.target.value)}
              />
            )}
          </Field>
          {source === "lightyear" && (
            <Field label="Allocations (optional)" hint="Fund and percent, separated by commas.">
              {(id, hint) => (
                <Input
                  id={id}
                  aria-describedby={hint}
                  placeholder="VWCE 70, MMF 25"
                  name="snapshot-holdings"
                  value={holdings}
                  onChange={(e) => setHoldings(e.target.value)}
                />
              )}
            </Field>
          )}
          <FormError message={err} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Pending on={saving}>Save snapshot</Pending>
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
