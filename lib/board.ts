import type { Db } from "./types";
import {
  CATEGORIES,
  SAVINGS,
  anniShareOf,
  balance,
  categoryOf,
  categoryTotals,
  matches,
  monthKey,
  monthlyBurn,
  monthlySpend,
  savedInMonth,
  settlementSuggestions,
  shareAmount,
  subscriptionStatus,
} from "./engine";
import { MOCK_BALANCES } from "./seed";
import { guessDomain } from "./icons";
import type { LhvAccount } from "./lhv";
import type { Tx } from "./types";

export interface Spark {
  points: number[];
  tone: "green" | "red" | "neutral";
}

const DAY = 86400000;

// last===first → neutral; otherwise green when it moved in the good direction.
function sparkTone(first: number, last: number, upIsGood = true): Spark["tone"] {
  if (last === first) return "neutral";
  return last > first === upIsGood ? "green" : "red";
}

export interface BoardTx {
  id: string;
  date: string;
  amount: number;
  counterparty: string;
  description: string;
  domain: string | null;
  category: string | null;
  categorySource: "rule" | "override" | null;
  shared: boolean;
  shareId?: string;
  anniShare?: number;
  // Set-and-forget noise (LHV micro-investing round-ups): collapsed into a
  // per-day rollup line in the feed. Math still counts the underlying rows.
  micro: boolean;
}

// Reconstruct a 30-day balance line for one account: today's known balance
// minus everything on that IBAN dated after each day.
function balanceSpark(txs: Tx[], iban: string, currentBalance: number, today: Date): Spark {
  const points: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY).toISOString().slice(0, 10);
    const after = txs.filter((t) => t.iban === iban && t.date > d).reduce((s, t) => s + t.amount, 0);
    points.push(Math.round((currentBalance - after) * 100) / 100);
  }
  return { points, tone: sparkTone(points[0], points[points.length - 1]) };
}

export function buildBoard(db: Db, today = new Date(), lhvAccounts: LhvAccount[] = []) {
  const month = today.toISOString().slice(0, 7);
  const shareByTx = new Map(db.shares.filter((s) => s.txId).map((s) => [s.txId!, s]));

  const txs: BoardTx[] = [...db.transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .map((tx) => {
      const override = db.overrides.find((o) => o.txId === tx.id);
      const cat = categoryOf(tx, db.rules, db.overrides);
      // "override" only when the hand-filing disagrees with the rules: an
      // "Always" drag files its own tile by override too, so a bare override
      // check would mark every teaching tile as an exception.
      const ruleCategory = db.rules.findLast((r) => matches(tx, r.match))?.category ?? null;
      const share = shareByTx.get(tx.id);
      return {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        counterparty: tx.counterparty,
        description: tx.description,
        domain: guessDomain(tx.counterparty),
        micro: (tx.counterparty + " " + tx.description).toLowerCase().includes("mikroinvesteering"),
        category: cat,
        categorySource: override && override.category !== ruleCategory ? "override" : cat ? "rule" : null,
        shared: !!share,
        shareId: share?.id,
        anniShare: share ? anniShareOf(share) : undefined,
      };
    });

  const totals = categoryTotals(db, month);
  const subStatuses = db.subscriptions.map((s) => ({
    ...subscriptionStatus(s, db.transactions, today),
    domain: guessDomain(s.name),
  }));
  const latestSnap = [...db.snapshots].sort((a, b) => a.at.localeCompare(b.at)).at(-1) ?? null;

  const sharedItems = [...db.shares]
    .map((s) => ({
      id: s.id,
      paidBy: s.paidBy,
      date: s.manual?.date ?? db.transactions.find((t) => t.id === s.txId)?.date ?? "",
      description:
        s.manual?.description ?? db.transactions.find((t) => t.id === s.txId)?.counterparty ?? "",
      total: shareAmount(s, db.transactions),
      anniShare: anniShareOf(s),
      // What the couple spent it on: the transaction's category when bank-linked,
      // the optional pick on a quick-add otherwise.
      category: s.manual
        ? s.manual.category ?? null
        : (() => {
            const tx = db.transactions.find((t) => t.id === s.txId);
            return tx ? categoryOf(tx, db.rules, db.overrides) : null;
          })(),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const todayStr = today.toISOString().slice(0, 10);

  // Real LHV accounts when the sync has run; the two mock pseudo-accounts otherwise.
  const accountRows: LhvAccount[] =
    lhvAccounts.length > 0
      ? lhvAccounts
      : [
          { iban: "EE00MOCK0000000001", name: "LHV · everyday", currency: "EUR", balance: MOCK_BALANCES.everyday },
          { iban: "EE00MOCK0000000002", name: "LHV · savings", currency: "EUR", balance: MOCK_BALANCES.savings },
        ];
  const accounts = accountRows.slice(0, 2).map((a) => ({
    name: lhvAccounts.length > 0 ? `LHV · ${a.name}` : a.name,
    iban: a.iban,
    balance: a.balance,
    spark: balanceSpark(db.transactions, a.iban, a.balance, today),
  }));

  const snapSorted = [...db.snapshots].sort((a, b) => a.at.localeCompare(b.at));
  const lightyearPoints = snapSorted.map((s) => s.total);

  // Cumulative spend (Argo's share, savings excluded) and cumulative savings
  // per day of the current month.
  const spentPoints: number[] = [];
  const savedPoints: number[] = [];
  for (let d = new Date(month + "-01T00:00:00Z"); d.toISOString().slice(0, 10) <= todayStr; d = new Date(d.getTime() + DAY)) {
    const day = d.toISOString().slice(0, 10);
    let total = 0;
    let saved = 0;
    for (const tx of db.transactions) {
      if (monthKey(tx.date) !== month || tx.date > day || tx.amount >= 0) continue;
      if (categoryOf(tx, db.rules, db.overrides) === SAVINGS) {
        saved += Math.abs(tx.amount);
        continue;
      }
      const share = shareByTx.get(tx.id);
      total += Math.abs(tx.amount) * (share ? 1 - anniShareOf(share) : 1);
    }
    for (const s of db.shares) {
      if (s.manual && s.paidBy === "anni" && monthKey(s.manual.date) === month && s.manual.date <= day) {
        total += s.manual.amount * (1 - anniShareOf(s));
      }
    }
    spentPoints.push(Math.round(total * 100) / 100);
    savedPoints.push(Math.round(saved * 100) / 100);
  }

  const spentNow = monthlySpend(db, month);
  const spentPrev = monthlySpend(db, prevMonth(month));
  const savedNow = savedInMonth(db, month);
  const savedPrev = savedInMonth(db, prevMonth(month));

  const sparks: Record<"lightyear" | "spent" | "saved", Spark> = {
    lightyear: {
      points: lightyearPoints,
      tone:
        lightyearPoints.length > 1
          ? sparkTone(lightyearPoints[lightyearPoints.length - 2], lightyearPoints[lightyearPoints.length - 1])
          : "neutral",
    },
    // Spending up vs last month is the bad direction.
    spent: { points: spentPoints, tone: sparkTone(spentPrev, spentNow, false) },
    // The hero shows this month's trajectory, not last-month-vs-now: a young
    // month always loses that comparison and rendered as a red cliff. Savings
    // only accumulate, so the tone is never red.
    saved: { points: savedPoints, tone: savedNow > 0 ? "green" : "neutral" },
  };

  // Repayment suggestions only while something is actually owed, and only
  // transfers in the direction that would settle it — anything else is noise.
  const bal = balance(db.shares, db.settlements, db.transactions);
  const suggestions =
    bal === 0
      ? []
      : settlementSuggestions(db, process.env.ANNI_MATCH || undefined)
          .filter((t) => (bal > 0 ? t.amount > 0 : t.amount < 0))
          .map((t) => ({
            txId: t.id,
            date: t.date,
            amount: t.amount,
            counterparty: t.counterparty,
          }));

  return {
    month,
    txs,
    sparks,
    categories: CATEGORIES.map((c) => ({ name: c, total: Math.round((totals[c] ?? 0) * 100) / 100 })),
    uncategorizedCount: txs.filter((t) => !t.category && t.amount < 0).length,
    balance: bal,
    sharedItems,
    settlements: db.settlements,
    suggestions,
    subscriptions: subStatuses,
    monthlyBurn: monthlyBurn(subStatuses),
    subsPaidThisMonth:
      Math.round(
        subStatuses
          .filter((s) => s.sub.active && s.lastCharge && s.lastCharge.date.slice(0, 7) === month)
          .reduce((sum, s) => sum + (s.lastCharge?.amount ?? 0), 0) * 100
      ) / 100,
    snapshot: latestSnap,
    snapshotHistory: [...db.snapshots].sort((a, b) => a.at.localeCompare(b.at)),
    spentThisMonth: spentNow,
    savedThisMonth: savedNow,
    savedLastMonth: savedPrev,
    accounts,
  };
}

function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

export type Board = ReturnType<typeof buildBoard>;
export { monthKey };
