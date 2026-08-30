import type { Db } from "./types";
import {
  CATEGORIES,
  SAVINGS,
  balance,
  categoryOf,
  categoryTotals,
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
}

export function buildBoard(db: Db, today = new Date()) {
  const month = today.toISOString().slice(0, 7);
  const shareByTx = new Map(db.shares.filter((s) => s.txId).map((s) => [s.txId!, s]));

  const txs: BoardTx[] = [...db.transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .map((tx) => {
      const override = db.overrides.find((o) => o.txId === tx.id);
      const cat = categoryOf(tx, db.rules, db.overrides);
      const share = shareByTx.get(tx.id);
      return {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        counterparty: tx.counterparty,
        description: tx.description,
        domain: guessDomain(tx.counterparty),
        category: cat,
        categorySource: override ? "override" : cat ? "rule" : null,
        shared: !!share,
        shareId: share?.id,
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
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const todayStr = today.toISOString().slice(0, 10);
  const sharedTxIds = new Set(db.shares.filter((s) => s.txId).map((s) => s.txId));

  // Everyday balance, last 30 days: today's known balance minus everything that happened after day d.
  const everydayPoints: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY).toISOString().slice(0, 10);
    const after = db.transactions.filter((t) => t.date > d).reduce((s, t) => s + t.amount, 0);
    everydayPoints.push(Math.round((MOCK_BALANCES.everyday - after) * 100) / 100);
  }

  const snapSorted = [...db.snapshots].sort((a, b) => a.at.localeCompare(b.at));
  const lightyearPoints = snapSorted.map((s) => s.total);

  // Cumulative spend (Argo's share, savings excluded) per day of the current month.
  const spentPoints: number[] = [];
  for (let d = new Date(month + "-01T00:00:00Z"); d.toISOString().slice(0, 10) <= todayStr; d = new Date(d.getTime() + DAY)) {
    const day = d.toISOString().slice(0, 10);
    let total = 0;
    for (const tx of db.transactions) {
      if (monthKey(tx.date) !== month || tx.date > day || tx.amount >= 0) continue;
      if (categoryOf(tx, db.rules, db.overrides) === SAVINGS) continue;
      total += Math.abs(tx.amount) * (sharedTxIds.has(tx.id) ? 0.5 : 1);
    }
    for (const s of db.shares) {
      if (s.manual && s.paidBy === "anni" && monthKey(s.manual.date) === month && s.manual.date <= day) {
        total += s.manual.amount / 2;
      }
    }
    spentPoints.push(Math.round(total * 100) / 100);
  }

  const spentNow = monthlySpend(db, month);
  const spentPrev = monthlySpend(db, prevMonth(month));
  const savedNow = savedInMonth(db, month);
  const savedPrev = savedInMonth(db, prevMonth(month));

  const sparks: Record<"everyday" | "savings" | "lightyear" | "spent" | "saved", Spark> = {
    everyday: {
      points: everydayPoints,
      tone: sparkTone(everydayPoints[0], everydayPoints[everydayPoints.length - 1]),
    },
    savings: { points: [MOCK_BALANCES.savings, MOCK_BALANCES.savings], tone: "neutral" },
    lightyear: {
      points: lightyearPoints,
      tone:
        lightyearPoints.length > 1
          ? sparkTone(lightyearPoints[lightyearPoints.length - 2], lightyearPoints[lightyearPoints.length - 1])
          : "neutral",
    },
    // Spending up vs last month is the bad direction.
    spent: { points: spentPoints, tone: sparkTone(spentPrev, spentNow, false) },
    saved: { points: [savedPrev, savedNow], tone: sparkTone(savedPrev, savedNow) },
  };

  return {
    month,
    txs,
    sparks,
    categories: CATEGORIES.map((c) => ({ name: c, total: Math.round((totals[c] ?? 0) * 100) / 100 })),
    uncategorizedCount: txs.filter((t) => !t.category && t.amount < 0).length,
    balance: balance(db.shares, db.settlements, db.transactions),
    sharedItems,
    settlements: db.settlements,
    suggestions: settlementSuggestions(db).map((t) => ({
      txId: t.id,
      date: t.date,
      amount: t.amount,
      counterparty: t.counterparty,
    })),
    subscriptions: subStatuses,
    monthlyBurn: monthlyBurn(subStatuses),
    snapshot: latestSnap,
    snapshotHistory: [...db.snapshots].sort((a, b) => a.at.localeCompare(b.at)),
    spentThisMonth: spentNow,
    savedThisMonth: savedNow,
    savedLastMonth: savedPrev,
    balances: MOCK_BALANCES,
  };
}

function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

export type Board = ReturnType<typeof buildBoard>;
export { monthKey };
