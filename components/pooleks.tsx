"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon, HouseIcon, PlusIcon, SettingsIcon, XIcon } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { amountInput, cn, parseAmount, shareLabel } from "@/lib/utils";
import { act, focusAfterRemoval } from "@/lib/act";
import { OWNER_NAME, PARTNER_NAME } from "@/lib/names";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRollingNumber } from "@/components/rolling-number";
import { announceError, announceUndoable } from "@/components/toaster";
import { Field, FormError, Pending } from "@/components/form-status";
import { SplitPicker } from "@/components/split-picker";
import { CoinHeader } from "@/components/coin-header";
import { PaintedCoin } from "@/components/painted";
import { wrapperOf } from "@/components/coin-stage";
import { CARD, DISPLAY, FOCUS, INK, INK_TEXT, MUTED, OAT, PAGE, PANEL, PILL, WHITE } from "@/components/coin-look";

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

// Each person keeps a metal, whoever is looking: the owner's coins are copper, the partner's brass.
const METAL = { owner: "copper", partner: "brass" } as const;

// A statement line: the payer's coin, then the name beside the amount, the category and
// day beside which way it goes, and who paid under both on a phone (beside the balance
// after it, with Details, from 640px).
const LINE = "group grid grid-cols-[2rem_minmax(0,1fr)_auto_2rem] items-start gap-x-2.5 gap-y-0.5 rounded-2xl py-3 pl-3 pr-2 sm:gap-x-3";
const WIDE = "col-[2/4] row-start-3 sm:col-[2/3]";
// The quiet ✕ at the end of a row: always there on touch, revealed on hover
// or keyboard focus where there is a pointer.
const REMOVE = cn(
  "relative -my-1 flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-mist hover:text-ink disabled:opacity-40 dark:hover:bg-card-night-hover dark:hover:text-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5 pointer-coarse:after:content-['']",
  MUTED,
  FOCUS
);

// Pooleks ("in half"): the couple's tab as a statement. Same page for both
// of them; only the labels flip. The head says where the tab stands and, as two
// piles, what each has paid since the last repayment; every line wears its payer's coin.
export function Pooleks({ role, initial, fontClass }: { role: Person; initial: SharedView; fontClass: string }) {
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
  // Focus goes back to whatever opened a dialog when it closes: the button, or the
  // phone's message box.
  const addReturn = useRef<HTMLElement | null>(null);
  const settleButton = useRef<HTMLButtonElement>(null);
  const composer = useRef<HTMLInputElement>(null);
  const descField = useRef<HTMLInputElement>(null);
  const amountField = useRef<HTMLInputElement>(null);
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
  // A shared cost's last line: who paid the bill, and whose part the amount on the right is.
  const shareLine = (item: SharedView["sharedItems"][number]) => {
    const owner = item.paidBy === "owner";
    const debtor = owner ? names.partner : names.owner;
    const part = owner ? (item.partnerShare ?? 0.5) : 1 - (item.partnerShare ?? 0.5);
    return `${names[item.paidBy]} paid ${eur.format(item.total)}, ${debtor === "You" ? "your" : `${debtor}'s`} part ${shareLabel(part)}`;
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
      className="mt-5"
    >
      <button
        type="button"
        onClick={() => setShowSettled((s) => !s)}
        aria-expanded={showSettled}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-ink/20 px-4 py-2.5 text-left text-[13px] hover:border-ink/35 dark:border-white/20 dark:hover:border-white/35",
          MUTED,
          FOCUS
        )}
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
        <span className={cn("shrink-0 font-medium", INK_TEXT)}>{showSettled ? "Hide" : "Show"}</span>
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

  // What each of you has paid since the last repayment, full bills: the two piles in the head.
  const paid = { owner: 0, partner: 0 };
  for (const m of months) for (const r of m.rows) if (r.kind === "share") paid[r.item.paidBy] += r.item.total;
  const most = Math.max(paid.owner, paid.partner);
  const coinsFor = (v: number) => (v > 0 ? Math.max(1, Math.min(PILE.length, Math.round((v / most) * PILE.length))) : 0);
  const since = fold
    ? openLines === 0
      ? `Nothing new since the repayment on ${shortDate.format(new Date(fold.date))}`
      : `${openLines} ${openLines === 1 ? "line" : "lines"} since the repayment on ${shortDate.format(new Date(fold.date))}`
    : `${view.sharedItems.length} shared ${view.sharedItems.length === 1 ? "cost" : "costs"}, no repayments yet`;
  const colourOf = (category: string) => wrapperOf(view.categories.map((name) => ({ name })), category, true);
  const dialogLook = cn(fontClass, "coins-panel rounded-[28px] p-6 sm:max-w-sm");
  const openAdd = (from: HTMLElement | null) => {
    addReturn.current = from;
    setAddErr("");
    setAddOpen(true);
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className={cn(fontClass, PAGE)}>
    <div className="mx-auto max-w-[1200px] px-5 pb-28 sm:px-6 sm:pb-20 wide:max-w-[1848px]">
      <CoinHeader
        links={
          role === "owner"
            ? [
                { href: "/", label: "Board", icon: HouseIcon },
                { href: "/settings", label: "Settings", icon: SettingsIcon },
              ]
            : []
        }
      />

      {/* From 1900px, as on the board: where the tab stands on the left, staying put, and the
          statement beside it at the board's charges width. */}
      <main className="flex flex-col gap-8 wide:grid wide:grid-cols-[720px_minmax(0,1fr)] wide:items-start">
        <h1 className="sr-only">Pooleks</h1>
        {/* Where the tab stands, and who has been paying since the last repayment. */}
        <section aria-label="Where the tab stands" className={cn(PANEL, OAT, "flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center wide:sticky wide:top-5")}>
          <div className="min-w-0 lg:flex-1">
            <p className={cn("text-[15px]", MUTED)}>{since}</p>
            {!flat && <p className={cn(DISPLAY, "mt-1 text-[22px] font-semibold sm:text-[26px]")}>{balanceText}</p>}
            <p className={cn(DISPLAY, "text-[44px] font-semibold leading-tight tabular-nums sm:text-[52px]")}>
              {flat ? "All square" : eur.format(Math.abs(shownBalance))}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                ref={settleButton}
                type="button"
                // Greys out when the rolling amount reaches zero, in step with "All square".
                disabled={flat}
                onClick={() => {
                  setSettleAmount(amountInput(Math.abs(bal)));
                  setSettleNote("");
                  setSettleErr("");
                  setSettleOpen(true);
                }}
                className={cn(PILL, INK, "max-sm:flex-1", FOCUS)}
              >
                Settle up
              </button>
              {/* On a phone, the message box at the foot of the screen adds an expense. */}
              <button type="button" onClick={(e) => openAdd(e.currentTarget)} className={cn(PILL, WHITE, "max-sm:hidden", FOCUS)}>
                Add expense
              </button>
            </div>
          </div>
          {most > 0 && (
            <div className="flex justify-center gap-8 max-lg:order-first lg:gap-12 lg:pr-4">
              <Payer label={`${names.owner} paid`} amount={paid.owner} coins={coinsFor(paid.owner)} metal={METAL.owner} />
              <Payer label={`${names.partner} paid`} amount={paid.partner} coins={coinsFor(paid.partner)} metal={METAL.partner} />
            </div>
          )}
        </section>

        {months.length === 0 && settledMonths.length === 0 ? (
          // The same empty state as the board's, said from the reader's side.
          <section className={cn(PANEL, OAT, "flex flex-col items-center px-6 py-12 text-center")}>
            <PaintedCoin size={64} mood="glad" seed={5} />
            <h2 className={cn(DISPLAY, "mt-4 text-[22px] font-semibold")}>Nothing shared yet</h2>
            <p className={cn("mt-1 max-w-[40ch] text-[15px]", MUTED)}>
              {role === "owner"
                ? `On the board, split a charge with ${PARTNER_NAME} from its menu, or add something you paid for in cash.`
                : `Add something you paid for; ${OWNER_NAME}'s shared costs arrive from the bank.`}
            </p>
          </section>
        ) : (
          // The statement: month by month, newest first, each line a white row with its payer's coin.
          <section aria-labelledby="statement-heading" className={cn(PANEL, OAT, "p-3 outline-none sm:p-6")} data-list>
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 id="statement-heading" className={cn(DISPLAY, "text-[20px] font-semibold")}>
                Statement
              </h2>
              <button
                type="button"
                onClick={toggleDetails}
                aria-pressed={details}
                title={details ? "Hide the balance after every line" : "Show the balance after every line"}
                className={cn("relative h-9 rounded-full px-3.5 text-[13px] font-medium pointer-coarse:after:absolute pointer-coarse:after:-inset-1 pointer-coarse:after:content-['']", details ? INK : WHITE, FOCUS)}
              >
                {details ? "Hide details" : "Details"}
              </button>
            </div>
            {[...months, ...(showSettled ? settledMonths : [])].map((m, mi) => (
              <div key={m.month}>
                {fold && mi === months.length && foldLine}
                <div className="mt-5 flex items-baseline justify-between gap-3 px-1">
                  <h3 className={cn(DISPLAY, "text-[16px] font-semibold")}>{monthLabel(m.month)}</h3>
                  <MonthNet net={m.rows.reduce((sum, r) => sum + r.movement, 0)} arrow={arrow} flow={flow} />
                </div>
                {details && (
                  // What the two of you spent together this month, full bills, and on what.
                  <p className={cn("mt-1 flex flex-wrap gap-x-3 gap-y-0.5 px-1 text-[13px]", MUTED)}>
                    <span title="Spent together this month, full amounts">
                      Together <span className={cn("tabular-nums", INK_TEXT)}>{eur.format(m.spentTogether)}</span>
                    </span>
                    {m.byCategory.length > 1 &&
                      m.byCategory.map(([name, total]) => (
                        <span key={name}>
                          {name} <span className="tabular-nums">{eur.format(total)}</span>
                        </span>
                      ))}
                  </p>
                )}
                <ul className="mt-2 flex flex-col gap-2">
                  {m.rows.map((r, i) =>
                    r.kind === "settle" ? (
                      <li key={r.settlement.id} data-row className={cn(LINE, CARD)}>
                        <span className="col-[1/2] row-[1/5]">
                          <PaintedCoin size={32} metal={METAL[r.settlement.amount > 0 ? "partner" : "owner"]} mood="glad" seed={i + 2} />
                        </span>
                        <p className="col-start-2 row-start-1 text-[15px] font-medium">
                          {r.settlement.amount > 0 ? `${names.partner} paid back` : `${names.owner} paid back`}
                        </p>
                        <p className={cn("col-start-2 row-start-2 text-[13px]", MUTED)}>
                          {shortDate.format(new Date(r.date))}
                          {r.settlement.note && ` · ${r.settlement.note}`}
                        </p>
                        {r.settlement.recordedBy && (
                          <p className={cn(WIDE, "text-[13px]", MUTED)}>
                            Recorded by {names[r.settlement.recordedBy] === "You" ? "you" : names[r.settlement.recordedBy]}
                          </p>
                        )}
                        {/* A repayment's arrow is the money that moved: who paid whom. */}
                        <Figure value={Math.abs(r.settlement.amount)} label={arrow(...flow(r.settlement.amount > 0))} />
                        {details && <Standing {...standing(r.running)} />}
                        {/* Either of the two can take a repayment back; Undo puts it back. */}
                        <button
                          type="button"
                          className={cn(REMOVE, "col-start-4 row-start-1")}
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
                          <XIcon aria-hidden className="size-4" />
                        </button>
                      </li>
                    ) : (
                      <li key={r.item.id} data-row className={cn(LINE, CARD)}>
                        <span className="col-[1/2] row-[1/5]">
                          <PaintedCoin size={32} metal={METAL[r.item.paidBy]} seed={i + 2} />
                        </span>
                        <p className="col-start-2 row-start-1 text-[15px] font-medium [overflow-wrap:anywhere]">{r.item.description}</p>
                        <p className={cn("col-start-2 row-start-2 flex min-w-0 items-center gap-1.5 text-[13px]", MUTED)}>
                          {r.item.category && (
                            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: colourOf(r.item.category) }} />
                          )}
                          <span className="truncate">
                            {r.item.category ?? "No category"}
                            <span className="max-sm:hidden"> · {shortDate.format(new Date(r.date))}</span>
                          </span>
                        </p>
                        {/* On a phone the day joins who paid, so the category keeps its room. */}
                        <p className={cn(WIDE, "text-[13px]", MUTED)}>
                          <span className="sm:hidden">{shortDate.format(new Date(r.date))} · </span>
                          {shareLine(r.item)}
                        </p>
                        {/* A shared cost's arrow is what is owed for it: from the one who didn't pay. */}
                        <Figure value={Math.abs(r.movement)} label={arrow(...flow(r.movement > 0))} strong />
                        {details && <Standing {...standing(r.running)} />}
                        {role === "owner" ? (
                          <button
                            type="button"
                            className={cn(REMOVE, "col-start-4 row-start-1")}
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
                            <XIcon aria-hidden className="size-4" />
                          </button>
                        ) : (
                          <span aria-hidden className="col-start-4 row-start-1 size-8" />
                        )}
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
            {fold && !showSettled && foldLine}
          </section>
        )}
      </main>

      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className={dialogLook} finalFocus={addReturn} initialFocus={desc.trim() ? amountField : descField}>
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
                  ref={descField}
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
                  ref={amountField}
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
                  className="h-9 rounded-md border border-input bg-accent px-3 text-sm text-foreground pointer-coarse:h-11 pointer-coarse:text-base"
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
        <DialogContent className={dialogLook} finalFocus={settleButton}>
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
    {/* On a phone an expense starts the way a message does: say what it was, then the rest. */}
    <form
      onSubmit={(e) => {
        e.preventDefault();
        openAdd(composer.current);
      }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:hidden dark:border-white/10 dark:bg-night"
    >
      {/* The field fills the pill, so a tap anywhere on it lands; it has no edge of its own, so
          the pill shows its focus, in the board's Ink outline. */}
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-full bg-mist pr-1.5 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-solid has-[input:focus-visible]:outline-ink dark:bg-card-night dark:has-[input:focus-visible]:outline-chalk">
        <input
          ref={composer}
          name="composer"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Add something you paid for…"
          aria-label="Add something you paid for"
          enterKeyHint="next"
          className="h-12 min-w-0 flex-1 rounded-l-full bg-transparent pl-4 text-[16px] outline-none placeholder:text-muted-text dark:placeholder:text-muted-text-night"
        />
        <button
          type="submit"
          aria-label="Add expense"
          className={cn("relative flex size-9 shrink-0 items-center justify-center rounded-full pointer-coarse:after:absolute pointer-coarse:after:-inset-1 pointer-coarse:after:content-['']", INK, FOCUS)}
        >
          <PlusIcon aria-hidden className="size-5" />
        </button>
      </div>
    </form>
    {/* Notices sit above the message box. */}
    <style>{`@media (max-width: 639px) { :root { --bottom-bar: 4.25rem; } }`}</style>
    </div>
    </MotionConfig>
  );
}

// A loose pile, as on the board's tray: coins at fixed spots, a few degrees each way.
const PILE = [
  [0, 22, -8],
  [30, 26, 7],
  [14, 4, -3],
  [46, 6, 10],
  [60, 28, -5],
] as const;

// What one of you has paid, as a pile and in words. The pile only decorates the
// amount: its coins follow the larger of the two, never stand in for the figure.
function Payer({ label, amount, coins, metal }: { label: string; amount: number; coins: number; metal: "copper" | "brass" }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div aria-hidden className="relative h-[84px] w-[104px]">
        {PILE.slice(0, coins).map(([x, y, r], i) => (
          <span key={i} className="absolute" style={{ left: x, top: y + 12, rotate: `${r}deg` }}>
            <PaintedCoin size={40} metal={metal} seed={i + (metal === "brass" ? 7 : 2)} />
          </span>
        ))}
      </div>
      <p className={cn("text-[13px]", MUTED)}>{label}</p>
      <p className={cn(DISPLAY, "text-[20px] font-semibold tabular-nums")}>{eur.format(amount)}</p>
    </div>
  );
}

// A line's figure: the amount, positive, beside the name, and under it which way it goes.
// The full sentence is what a screen reader hears.
function Figure({ value, label, strong }: { value: number; label: React.ReactNode; strong?: boolean }) {
  return (
    <>
      <span className={cn("col-start-3 row-start-1 text-right text-[15px] tabular-nums", strong && "font-medium")}>{eur.format(value)}</span>
      <span className={cn("col-start-3 row-start-2 whitespace-nowrap text-right text-[13px]", MUTED)}>{label}</span>
    </>
  );
}

// Where the tab stands after a line, in words from the reader's side: under who paid
// on a phone, beside it from 640px.
function Standing({ words, amount }: { words: string; amount: number | null }) {
  return (
    <span className={cn("col-[2/4] row-start-4 text-right text-[12px] sm:col-[3/4] sm:row-start-3", MUTED)}>
      {amount === null ? (
        words
      ) : (
        <>
          {words} <span className={cn("tabular-nums", INK_TEXT)}>{eur.format(amount)}</span>
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
    <span className={cn("text-right text-[13px]", MUTED)} title="What this month did to the balance">
      {r === 0 ? (
        "evens out"
      ) : (
        <>
          {arrow(from, to)} <span className="tabular-nums">{eur.format(Math.abs(r))}</span>
        </>
      )}
    </span>
  );
}

// Who to whom, with the arrow drawn. A screen reader hears "Partner to you".
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
