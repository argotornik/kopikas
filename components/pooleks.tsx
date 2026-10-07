"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon, ReceiptTextIcon, UsersIcon, XIcon } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { amountInput, cn, parseAmount, shareLabel } from "@/lib/utils";
import { act, focusAfterRemoval } from "@/lib/act";
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useRollingNumber } from "@/components/rolling-number";
import { HeaderLink, PageHeader } from "@/components/page-header";
import { announceError, announceUndoable } from "@/components/toaster";
import { Field, FormError, Pending } from "@/components/form-status";
import { SplitPicker } from "@/components/split-picker";

const eur = new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

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
  settlements: { id: string; amount: number; date: string; note?: string; recordedBy?: Person }[];
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
      const key = r.item.category ?? "uncategorized";
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

// Clean by default: date · what · what moved the tab. Details adds the running
// balance, and folds the bill and the share into the row's text — a statement
// shows what moved and where it leaves you; the working is there to read, not
// to scan.
const GRID_CLEAN = "grid items-baseline gap-x-3 px-3 grid-cols-[3rem_minmax(0,1fr)_5.5rem_1.5rem] sm:grid-cols-[3.25rem_minmax(0,1fr)_5.5rem_1.5rem]";
// On phones the running balance stacks under the movement (one figure column),
// so the description keeps its width.
const GRID_FULL =
  "grid items-baseline gap-x-3 px-3 grid-cols-[3rem_minmax(0,1fr)_5.5rem_1.5rem] sm:grid-cols-[3.25rem_minmax(0,1fr)_5.5rem_5.5rem_1.5rem]";

// The quiet ✕ at the end of a row: always there on touch, revealed on hover
// or keyboard focus where there is a pointer.
const REMOVE =
  "relative flex size-6 items-center justify-center justify-self-end rounded text-muted-foreground hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 pointer-coarse:after:absolute pointer-coarse:after:-inset-2.5 pointer-coarse:after:content-['']";

// Pooleks ("in half"): the couple's tab as a statement. Same page for both
// of them; only the labels flip.
export function Pooleks({ role, initial }: { role: Person; initial: SharedView }) {
  // Rendered with its data on the server: no loading line, no layout jump.
  const [view, setView] = useState<SharedView>(initial);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [share, setShare] = useState(0.5);
  const [category, setCategory] = useState("");
  // Each dialog reports its own failures; the page reports the rest as notices.
  const [addErr, setAddErr] = useState("");
  const [settleErr, setSettleErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [settling, setSettling] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  // Focus goes back to the button that opened a dialog when it closes.
  const addButton = useRef<HTMLButtonElement>(null);
  const settleButton = useRef<HTMLButtonElement>(null);
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
  // The balance rolls to its new value rather than jumping: after a repayment
  // the number winds down to zero and only then reads "All square".
  const shownBalance = useRollingNumber(view ? view.balance : null);

  // The statement, read fresh. A failed read keeps whatever is on screen;
  // with nothing on screen yet, the page offers to try again.
  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/shared", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setView(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);
  useEffect(() => {
    if (loadError) announceError("Pooleks couldn't refresh. Reload to see the latest.", () => window.location.reload());
  }, [loadError]);

  const run = useCallback(
    async (action: object) => {
      const result = await act<SharedView>(action, "shared");
      if (result.ok) {
        if (result.fresh) setView(result.fresh);
        else await refetch();
      }
      return result;
    },
    [refetch]
  );

  // Remove and take-back: one click, an Undo, and focus that stays on the list.
  const oneClick = async (key: string, action: object, done: string, from: HTMLElement) => {
    if (busy.has(key)) return;
    setBusy((b) => new Set(b).add(key));
    const refocus = focusAfterRemoval(from);
    const result = await run(action);
    setBusy((b) => {
      const next = new Set(b);
      next.delete(key);
      return next;
    });
    if (!result.ok) return announceError(result.error);
    refocus();
    announceUndoable(done, result.undo, refetch);
  };

  // "You" for whoever is looking; the other by name.
  const names = role === "owner" ? { owner: "You", partner: PARTNER_NAME } : { owner: OWNER_NAME, partner: "You" };
  const owes = (who: string) => (who === "You" ? "owe" : "owes");
  const lower = (who: string) => (who === "You" ? "you" : who);
  // Which way money goes on a line, from the reader's side: owed for a shared
  // cost, paid for a repayment. `toOwner` = from the partner to the owner.
  // Amounts are always positive; the arrow carries the direction.
  const flow = (toOwner: boolean): [string, string] =>
    toOwner ? [names.partner, names.owner] : [names.owner, names.partner];
  // Where a balance stands, said from the reader's side and never negative.
  // positive = the partner owes the owner.
  const standing = (balance: number) => {
    const r = Math.round(balance * 100) / 100;
    if (r === 0) return { words: "square", amount: null };
    const [debtor] = flow(r > 0);
    return { words: debtor === "You" ? "you owe" : "owed to you", amount: Math.abs(r) };
  };
  // A shared cost's second line: its category, who paid, and with Details,
  // whose part the amount on the right is.
  const describeShare = (item: SharedView["sharedItems"][number]) => {
    const parts = [item.category ?? "uncategorized"];
    if (item.paidBy === "partner") parts.push(`${names.partner} paid`);
    if (details) {
      const owner = item.paidBy === "owner";
      const debtor = owner ? names.partner : names.owner;
      const part = owner ? (item.partnerShare ?? 0.5) : 1 - (item.partnerShare ?? 0.5);
      parts.push(`${debtor === "You" ? "your" : `${debtor}'s`} part, ${shareLabel(part)} of ${eur.format(item.total)}`);
    }
    return parts.join(" · ");
  };
  const stillOwed = (balance: number) => {
    const [debtor, creditor] = flow(balance > 0);
    return `${debtor} still ${owes(debtor)} ${lower(creditor)} ${eur.format(Math.abs(balance))}`;
  };
  // Today on the household's own clock: toISOString would be yesterday's
  // date in Tallinn until three in the morning.
  const today = new Date().toLocaleDateString("sv-SE");

  // Oldest → newest to accumulate the running tab, then newest first to show.
  // Everything up to the last repayment is history: it folds into one line
  // and opens on request, so the statement shows what is open between the two.
  const [showSettled, setShowSettled] = useState(false);
  const statement = useMemo(() => {
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

  // The fold line as last seen, so a repayment recorded while watching slides
  // its line in while the one already there on load just renders.
  const foldKey = fold ? `${fold.date}:${fold.lines}` : null;
  const [knownFold, setKnownFold] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (view) setKnownFold(foldKey);
  }, [view, foldKey]);

  const foldLine = fold && (
    <motion.div
      key={foldKey}
      initial={knownFold !== undefined && knownFold !== foldKey ? { opacity: 0, y: -6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("px-3 py-2 text-xs text-muted-foreground", months.length > 0 && "border-t border-border/70")}
    >
      <button
        type="button"
        onClick={() => setShowSettled((s) => !s)}
        aria-expanded={showSettled}
        className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-accent hover:text-foreground pointer-coarse:py-3.5"
      >
        {/* "All square" only when it is: a repayment can leave something owed. */}
        <span>
          {fold.carried === 0 ? (
            <>
              {months.length === 0 && "All square. "}
              Settled up to {shortDate.format(new Date(fold.date))} · {fold.lines} {fold.lines === 1 ? "line" : "lines"}
            </>
          ) : (
            <>
              Repayment on {shortDate.format(new Date(fold.date))} · {fold.lines} earlier {fold.lines === 1 ? "line" : "lines"} ·{" "}
              {stillOwed(fold.carried)}
            </>
          )}
        </span>
        <span className="shrink-0">{showSettled ? "Hide" : "Show"}</span>
      </button>
    </motion.div>
  );

  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat(
      "en-GB",
      m.slice(0, 4) === today.slice(0, 4) ? { month: "long" } : { month: "long", year: "numeric" }
    ).format(new Date(m + "-01T00:00:00Z"));

  const add = async () => {
    if (adding) return;
    const a = parseAmount(amount);
    if (!desc.trim()) return setAddErr("Say what it was, so both of you recognise it later.");
    if (!(a > 0)) return setAddErr("Enter the amount you paid, like 54,00.");
    setAddErr("");
    setAdding(true);
    const result = await run({
      type: "quickadd",
      description: desc,
      amount: a,
      date: today,
      partnerShare: share,
      category: category || undefined,
    });
    setAdding(false);
    if (!result.ok) return setAddErr(result.error);
    setDesc("");
    setAmount("");
    setCategory("");
    setAddOpen(false);
  };

  const bal = view.balance;
  // Balance sentence from the viewer's side, following the rolling number so
  // "All square" arrives when the amount does. bal > 0 means the partner owes the owner.
  const flat = Math.round(shownBalance * 100) === 0;
  const balanceText =
    flat
      ? "All square"
      : shownBalance > 0
        ? `${names.partner} ${owes(names.partner)} ${names.owner === "You" ? "you" : names.owner}`
        : `${names.owner} ${owes(names.owner)} ${names.partner === "You" ? "you" : names.partner}`;
  // "Partner → you" / "You → Owner": from whoever owes (or paid) to whoever is owed.
  const arrow = (from: string, to: string) => <Flow from={from} to={lower(to)} />;
  // Lines open since the last repayment, for the line under the headline.
  const openLines = months.reduce((n, m) => n + m.rows.length, 0);

  // Settle up: the amount as typed, and what it would leave.
  const settleValue = parseAmount(settleAmount);
  const open = Math.abs(bal);
  const settleLeaves = !(settleValue > 0)
    ? settleAmount.trim()
      ? "Enter an amount like 40,40."
      : ""
    : Math.abs(settleValue - open) < 0.005
      ? "Leaves the tab at 0,00 €: all square."
      : settleValue < open
        ? `Leaves ${eur.format(open - settleValue)} open.`
        : `That is ${eur.format(settleValue - open)} more than is owed; the tab would turn the other way.`;
  const settle = async () => {
    if (settling) return;
    if (!(settleValue > 0)) return setSettleErr("Enter the amount that was paid back, like 40,40.");
    setSettleErr("");
    setSettling(true);
    const result = await run({
      type: "settle",
      amount: bal > 0 ? settleValue : -settleValue,
      date: today,
      note: settleNote.trim() || undefined,
    });
    setSettling(false);
    if (!result.ok) return setSettleErr(result.error);
    setSettleOpen(false);
    announceUndoable(`Recorded a ${eur.format(settleValue)} repayment.`, result.undo, refetch);
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-6 pb-24">
      <PageHeader title="Pooleks" heading>
        {role === "owner" && (
          <HeaderLink href="/" back>
            board
          </HeaderLink>
        )}
      </PageHeader>

      <main className="flex flex-col gap-4">
      <Card className="gap-3 py-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div>
            <div className="text-xl font-semibold">
              {balanceText}
              {!flat && <span className="ml-2 font-mono tabular-nums">{eur.format(Math.abs(shownBalance))}</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {fold
                ? openLines === 0
                  ? `Nothing new since the repayment on ${shortDate.format(new Date(fold.date))}`
                  : `${openLines} ${openLines === 1 ? "line" : "lines"} since the repayment on ${shortDate.format(new Date(fold.date))}`
                : `${view.sharedItems.length} shared ${view.sharedItems.length === 1 ? "cost" : "costs"}, no repayments yet`}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              ref={addButton}
              onClick={() => {
                setAddErr("");
                setAddOpen(true);
              }}
            >
              Add expense
            </Button>
            <Button
              ref={settleButton}
              variant="outline"
              // Greys out when the rolling amount reaches zero, in step with "All square".
              disabled={flat}
              onClick={() => {
                setSettleAmount(amountInput(Math.abs(bal)));
                setSettleNote("");
                setSettleErr("");
                setSettleOpen(true);
              }}
            >
              Settle up
            </Button>
          </div>
        </CardContent>
      </Card>

      {months.length === 0 && settledMonths.length === 0 ? (
        // The same empty state as the board's, said from the reader's side.
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing shared yet</EmptyTitle>
            <EmptyDescription>
              {role === "owner"
                ? `On the board, file a charge with "Split with ${PARTNER_NAME}", or use Add expense for something you paid in cash.`
                : `Use Add expense for something you paid for; ${OWNER_NAME}'s shared costs arrive from the bank.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // The statement: one sheet, ruled rows, month headers as section rules.
        <div className="overflow-hidden rounded-xl bg-card pb-2 ring-1 ring-foreground/10 outline-none" data-list>
          {/* One head row: the view toggle in the label columns, column heads on the rail. */}
          <div className={cn(GRID, "items-center pb-1 pt-2 text-xs text-muted-foreground")}>
            <div className="col-span-2 -ml-2">
              <button
                type="button"
                onClick={toggleDetails}
                aria-pressed={details}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground pointer-coarse:py-3.5"
                title={details ? "Hide each part and the balance after every line" : "Show each part and the balance after every line"}
              >
                <ReceiptTextIcon className="size-3.5" />
                {details ? "Hide details" : "Details"}
              </button>
            </div>
            {/* The arrows say which way each amount goes; only the balance column needs a head. */}
            <span />
            {details && <span className="hidden text-right sm:block">Balance after</span>}
            <span />
          </div>
          {[...months, ...(showSettled ? settledMonths : [])].map((m, mi) => (
            <div key={m.month}>
              {fold && mi === months.length && foldLine}
              <div className={cn(GRID, "pb-1.5 pt-3", mi > 0 && "border-t border-border/70")}>
                <h2 className="col-span-2 font-heading text-sm font-semibold tracking-tight">{monthLabel(m.month)}</h2>
                {details && (
                  <>
                    <MonthNet net={m.rows.reduce((sum, r) => sum + r.movement, 0)} arrow={arrow} flow={flow} />
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
                    data-row
                    className={cn(GRID, "group py-2 text-xs text-muted-foreground", i > 0 && "border-t border-border/70")}
                  >
                    <span>{shortDate.format(new Date(r.date))}</span>
                    <span className="truncate italic">
                      {r.settlement.amount > 0 ? `${names.partner} paid back` : `${names.owner} paid back`}
                      {r.settlement.note && ` · ${r.settlement.note}`}
                      {r.settlement.recordedBy &&
                        ` · recorded by ${names[r.settlement.recordedBy] === "You" ? "you" : names[r.settlement.recordedBy]}`}
                    </span>
                    {/* A repayment's arrow is the money that moved: who paid whom. */}
                    <Amount value={Math.abs(r.settlement.amount)} label={arrow(...flow(r.settlement.amount > 0))}>
                      {details && <Standing {...standing(r.running)} className="sm:hidden" />}
                    </Amount>
                    {details && <Standing {...standing(r.running)} className="hidden sm:block" />}
                    {/* Either of the two can take a repayment back; Undo puts it back. */}
                    <button
                      type="button"
                      className={REMOVE}
                      title="Remove this repayment"
                      aria-label={`Remove the ${eur.format(Math.abs(r.settlement.amount))} repayment of ${shortDate.format(new Date(r.date))}`}
                      data-focus-key="remove"
                      disabled={busy.has(`unsettle:${r.settlement.id}`)}
                      onClick={(e) =>
                        void oneClick(
                          `unsettle:${r.settlement.id}`,
                          { type: "unsettle", settlementId: r.settlement.id },
                          `Removed the ${eur.format(Math.abs(r.settlement.amount))} repayment.`,
                          e.currentTarget
                        )
                      }
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ) : (
                  <div key={r.item.id} data-row className={cn(GRID, "group py-1.5", i > 0 && "border-t border-border/70")}>
                    <span className="text-xs text-muted-foreground">{shortDate.format(new Date(r.date))}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm">
                        <span className="font-medium">{r.item.description}</span>
                        <span className="hidden text-muted-foreground sm:inline">
                          {" · "}
                          {describeShare(r.item)}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground sm:hidden">{describeShare(r.item)}</div>
                    </div>
                    {/* A shared cost's arrow is what is owed for it: from the one who didn't pay. */}
                    <Amount value={Math.abs(r.movement)} label={arrow(...flow(r.movement > 0))} strong>
                      {details && <Standing {...standing(r.running)} className="sm:hidden" />}
                    </Amount>
                    {details && <Standing {...standing(r.running)} className="hidden sm:block" />}
                    {role === "owner" ? (
                      <button
                        type="button"
                        className={REMOVE}
                        title="Remove from Pooleks"
                        aria-label={`Remove ${r.item.description} from Pooleks`}
                        data-focus-key="remove"
                        disabled={busy.has(`unshare:${r.item.id}`)}
                        onClick={(e) =>
                          void oneClick(
                            `unshare:${r.item.id}`,
                            { type: "unshare", shareId: r.item.id },
                            `Took ${r.item.description} off Pooleks.`,
                            e.currentTarget
                          )
                        }
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
      </main>

      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="sm:max-w-sm" finalFocus={addButton}>
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
          <DialogHeader>
            <DialogTitle>Add something you paid for</DialogTitle>
            <DialogDescription>Enter the full amount; the split works out each part.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label="What was it">
              {(id) => (
                <Input
                  id={id}
                  placeholder="e.g. Dinner at Kivi Paber Käärid"
                  name="description"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              )}
            </Field>
            <Field label="Full amount, €">
              {(id) => (
                <Input
                  id={id}
                  placeholder="e.g. 54,00"
                  name="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              )}
            </Field>
            <Field label="Category (optional)">
              {(id) => (
                <select
                  id={id}
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground pointer-coarse:h-11 pointer-coarse:text-base"
                >
                  <option value="">None</option>
                  {(view?.categories ?? []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {/* The fraction is always the partner's; named from the reader's side. */}
            <SplitPicker label={role === "owner" ? `${PARTNER_NAME}'s part` : "Your part"} value={share} onChange={setShare} />
            <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
              {parseAmount(amount) > 0 &&
                (role === "owner"
                  ? `${PARTNER_NAME} will owe you ${eur.format(parseAmount(amount) * share)}.`
                  : `${OWNER_NAME} will owe you ${eur.format(parseAmount(amount) * (1 - share))}.`)}
            </p>
            <FormError message={addErr} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adding}>
              <Pending on={adding}>Add to Pooleks</Pending>
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={settleOpen} onOpenChange={(o) => !o && setSettleOpen(false)}>
        <DialogContent className="sm:max-w-sm" finalFocus={settleButton}>
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              void settle();
            }}
          >
          <DialogHeader>
            <DialogTitle>Settle up</DialogTitle>
            <DialogDescription>
              {bal > 0 === (role === "owner")
                ? `Record money ${lower(bal > 0 ? names.partner : names.owner)} has paid you outside the app, by transfer or in cash. You both see it on the statement.`
                : `Record money you have paid ${bal > 0 ? names.owner : names.partner} outside the app, by transfer or in cash. You both see it on the statement.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Field label="Amount paid back, €">
              {(id) => (
                <Input
                  id={id}
                  aria-describedby="settle-leaves"
                  name="settle-amount"
                  inputMode="decimal"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  autoFocus
                />
              )}
            </Field>
            {/* Where the repayment leaves the tab, before it is recorded:
                404 typed for 40,40 shows up here, not on the statement. */}
            <p id="settle-leaves" className="min-h-4 text-xs text-muted-foreground">
              {settleLeaves}
            </p>
            <Field label="Note (optional)">
              {(id) => (
                <Input
                  id={id}
                  placeholder="e.g. cash at dinner"
                  name="settle-note"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                />
              )}
            </Field>
            <FormError message={settleErr} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSettleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={settling}>
              <Pending on={settling}>{settleValue > 0 ? `Record ${eur.format(settleValue)}` : "Record"}</Pending>
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </MotionConfig>
  );
}

// A line's figure: the amount, positive, and under it which way it goes.
// The full sentence is what a screen reader hears.
function Amount({
  value,
  label,
  strong,
  children,
}: {
  value: number;
  label: React.ReactNode;
  strong?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className="min-w-0 text-right">
      <span className={cn("block font-mono text-sm tabular-nums text-foreground", strong && "font-medium")}>
        {eur.format(value)}
      </span>
      <span className="block truncate text-xs not-italic text-muted-foreground">{label}</span>
      {children}
    </span>
  );
}

// Where the tab stands after a line, in words from the reader's side.
function Standing({ words, amount, className }: { words: string; amount: number | null; className?: string }) {
  return (
    <span className={cn("text-right text-xs text-muted-foreground", className)}>
      {amount === null ? (
        words
      ) : (
        <>
          {words} <span className="font-mono tabular-nums text-foreground">{eur.format(amount)}</span>
        </>
      )}
    </span>
  );
}

// What a month did to the tab, as an arrow and an amount.
function MonthNet({
  net,
  arrow,
  flow,
}: {
  net: number;
  arrow: (from: string, to: string) => React.ReactNode;
  flow: (toOwner: boolean) => [string, string];
}) {
  const r = Math.round(net * 100) / 100;
  const [from, to] = flow(r > 0);
  return (
    // Same order as a line's figure: the amount, then which way it goes.
    <span className="text-right text-xs text-muted-foreground" title="What this month did to the balance">
      {r === 0 ? (
        "evens out"
      ) : (
        <>
          <span className="block font-mono tabular-nums">{eur.format(Math.abs(r))}</span>
          <span className="block truncate">{arrow(from, to)}</span>
        </>
      )}
    </span>
  );
}

// Who to whom, with the arrow drawn: the arrow character is not in Geist and
// would fall back to another face. A screen reader hears "Partner to you".
function Flow({ from, to }: { from: string; to: string }) {
  return (
    <>
      {from}
      <ArrowRightIcon aria-hidden className="mx-0.5 inline size-3 align-[-1px]" />
      <span className="sr-only"> to </span>
      {to}
    </>
  );
}
