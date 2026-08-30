import type { Db } from "./types";
import {
  CATEGORIES,
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

export interface BoardTx {
  id: string;
  date: string;
  amount: number;
  counterparty: string;
  description: string;
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
        category: cat,
        categorySource: override ? "override" : cat ? "rule" : null,
        shared: !!share,
        shareId: share?.id,
      };
    });

  const totals = categoryTotals(db, month);
  const subStatuses = db.subscriptions.map((s) => subscriptionStatus(s, db.transactions, today));
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

  return {
    month,
    txs,
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
    spentThisMonth: monthlySpend(db, month),
    savedThisMonth: savedInMonth(db, month),
    savedLastMonth: savedInMonth(db, prevMonth(month)),
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
