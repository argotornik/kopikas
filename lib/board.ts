import type { Db } from "./types";
import {
  SAVINGS,
  partnerShareOf,
  balance,
  categoryOf,
  categoryTotals,
  matches,
  monthKey,
  monthlyBurn,
  monthlySpend,
  shareAmount,
  subscriptionStatus,
} from "./engine";
import { MOCK_BALANCES } from "./seed";
import { guessDomain, merchantOf, rulePattern, subscriptionLabel } from "./icons";
import { merchantFromDescription, type LhvAccount } from "./lhv";
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
  counterparty: string; // raw bank string: rules match on it
  name: string; // statement-legible merchant name
  rulePattern: string; // what "always" would teach a rule to match on
  description: string;
  // What the second line says. Card payments carry the raw statement string
  // the merchant name was cut from (card tail, timestamp, address) — noise
  // once the name is shown, so it is dropped. Transfers keep their note.
  note: string;
  domain: string | null;
  emoji: string | null; // the owner's stand-in when there is no favicon
  // The pattern an identity set from this tile applies to; true when one already does.
  merchantPattern: string;
  customMerchant: boolean;
  category: string | null;
  categorySource: "rule" | "override" | null;
  shared: boolean;
  shareId?: string;
  partnerShare?: number;
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
      const merchant = merchantOf(tx, db.merchants);
      const isCardString = !!merchantFromDescription(tx.description);
      // A note that only repeats the name (bank transfers often carry the
      // counterparty text again, give or take a reference) says nothing.
      const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      const d = squash(tx.description);
      const redundant =
        !d || d.startsWith(squash(tx.counterparty)) || squash(tx.counterparty).startsWith(d) || d.startsWith(squash(merchant.name));
      return {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        counterparty: tx.counterparty,
        name: merchant.name,
        rulePattern: rulePattern(tx),
        description: tx.description,
        note: isCardString || redundant ? "" : tx.description.trim(),
        domain: merchant.domain,
        emoji: merchant.emoji,
        merchantPattern: merchant.match ?? rulePattern(tx),
        customMerchant: merchant.match !== null,
        micro: (tx.counterparty + " " + tx.description).toLowerCase().includes("mikroinvesteering"),
        category: cat,
        categorySource: override && override.category !== ruleCategory ? "override" : cat ? "rule" : null,
        shared: !!share,
        shareId: share?.id,
        partnerShare: share ? partnerShareOf(share) : undefined,
      };
    });

  const totals = categoryTotals(db, month);
  const subStatuses = db.subscriptions.map((s) => {
    // An identity whose pattern sits inside the subscription's own covers
    // every charge the subscription matches, so it names the row too.
    const own = db.merchants.findLast((m) => s.match.includes(m.match));
    return {
      ...subscriptionStatus(s, db.transactions, today),
      domain: own?.domain ?? guessDomain(s.name),
      emoji: own?.emoji ?? null,
      label: own?.name ?? subscriptionLabel(s.name),
      customMerchant: !!own,
    };
  });

  const sharedItems = [...db.shares]
    .map((s) => ({
      id: s.id,
      paidBy: s.paidBy,
      date: s.manual?.date ?? db.transactions.find((t) => t.id === s.txId)?.date ?? "",
      description:
        s.manual?.description ??
        (() => {
          const tx = db.transactions.find((t) => t.id === s.txId);
          return tx ? merchantOf(tx, db.merchants).name : "";
        })(),
      total: shareAmount(s, db.transactions),
      partnerShare: partnerShareOf(s),
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
  // Kasvukonto (LHV's growth account) is the micro-investing pot: round-ups
  // land there and are invested straight out, so its balance says nothing —
  // it stays off the stat row. Its transactions still sync.
  const accountRows: LhvAccount[] =
    lhvAccounts.length > 0
      ? lhvAccounts.filter((a) => !/kasvukonto/i.test(a.name))
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

  // Investments: two manually snapshotted pots. The series carries each pot's
  // latest known value forward, so the combined total is defined at every
  // snapshot time even when only one pot was updated.
  const snapSorted = [...db.snapshots].sort((a, b) => a.at.localeCompare(b.at));
  const sourceOf = (s: { source?: string }) => (s.source === "lhv" ? "lhv" : "lightyear");
  const latestBySource = {
    lightyear: snapSorted.filter((s) => sourceOf(s) === "lightyear").at(-1) ?? null,
    lhv: snapSorted.filter((s) => sourceOf(s) === "lhv").at(-1) ?? null,
  };
  const investmentSeries: { at: string; lightyear: number | null; lhv: number | null; total: number }[] = [];
  let carryLy: number | null = null;
  let carryLhv: number | null = null;
  for (const s of snapSorted) {
    if (sourceOf(s) === "lhv") carryLhv = s.total;
    else carryLy = s.total;
    investmentSeries.push({
      at: s.at,
      lightyear: carryLy,
      lhv: carryLhv,
      total: Math.round(((carryLy ?? 0) + (carryLhv ?? 0)) * 100) / 100,
    });
  }
  const investmentPoints = investmentSeries.map((p) => p.total);

  // Cumulative spend (the owner's share, savings excluded) per day of the month.
  const spentPoints: number[] = [];
  for (let d = new Date(month + "-01T00:00:00Z"); d.toISOString().slice(0, 10) <= todayStr; d = new Date(d.getTime() + DAY)) {
    const day = d.toISOString().slice(0, 10);
    let total = 0;
    for (const tx of db.transactions) {
      if (monthKey(tx.date) !== month || tx.date > day || tx.amount >= 0) continue;
      if (categoryOf(tx, db.rules, db.overrides) === SAVINGS) continue;
      const share = shareByTx.get(tx.id);
      total += Math.abs(tx.amount) * (share ? 1 - partnerShareOf(share) : 1);
    }
    for (const s of db.shares) {
      if (s.manual && s.paidBy === "partner" && monthKey(s.manual.date) === month && s.manual.date <= day) {
        total += s.manual.amount * (1 - partnerShareOf(s));
      }
    }
    spentPoints.push(Math.round(total * 100) / 100);
  }

  const spentNow = monthlySpend(db, month);
  const spentPrev = monthlySpend(db, prevMonth(month));

  const sparks: Record<"investments" | "spent", Spark> = {
    investments: {
      points: investmentPoints,
      tone:
        investmentPoints.length > 1
          ? sparkTone(investmentPoints[investmentPoints.length - 2], investmentPoints[investmentPoints.length - 1])
          : "neutral",
    },
    // Spending up vs last month is the bad direction.
    spent: { points: spentPoints, tone: sparkTone(spentPrev, spentNow, false) },
  };

  const bal = balance(db.shares, db.settlements, db.transactions);

  return {
    month,
    txs,
    sparks,
    categories: db.categories.map((c) => ({ name: c, total: Math.round((totals[c] ?? 0) * 100) / 100 })),
    uncategorizedCount: txs.filter((t) => !t.category && t.amount < 0).length,
    balance: bal,
    sharedItems,
    settlements: db.settlements,
    subscriptions: subStatuses,
    monthlyBurn: monthlyBurn(subStatuses),
    subsPaidThisMonth:
      Math.round(
        subStatuses
          .filter((s) => s.sub.active && s.lastCharge && s.lastCharge.date.slice(0, 7) === month)
          .reduce((sum, s) => sum + (s.lastCharge?.amount ?? 0), 0) * 100
      ) / 100,
    investments: {
      total: investmentSeries.at(-1)?.total ?? null,
      latest: latestBySource,
      series: investmentSeries,
    },
    spentThisMonth: spentNow,
    spentLastMonth: spentPrev,
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
