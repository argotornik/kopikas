import type { Db, Rule, Override, Share, Subscription, Tx } from "./types";

// Two names the code relies on: Savings is a transfer the maths sets aside,
// Subscriptions is where the zone files what lands on it. The board renames
// every other category freely.
export const SAVINGS = "Savings";
export const SUBSCRIPTIONS = "Subscriptions";
export const FIXED_CATEGORIES: readonly string[] = [SAVINGS, SUBSCRIPTIONS];
// What a fresh board starts with. The live list is db.categories.
export const DEFAULT_CATEGORIES = [
  "Groceries",
  "Eating out",
  "Transport",
  "Mortgage", // interest part; principal files under Savings
  "Home", // household services, renovation, dry cleaning — the house, not the loan
  "Utilities",
  "Subscriptions",
  "Health",
  "Pets",
  "Shopping",
  "Cash",
  SAVINGS,
  "Other",
];

const norm = (s: string) => s.toLowerCase();

export function matches(tx: Tx, pattern: string): boolean {
  const hay = norm(tx.counterparty + " " + tx.description);
  return hay.includes(norm(pattern));
}

// Precedence: override > newest matching rule > null.
// Newest-wins lets a later drag correct an earlier rule without deleting it.
export function categoryOf(tx: Tx, rules: Rule[], overrides: Override[]): string | null {
  const o = overrides.find((x) => x.txId === tx.id);
  if (o) return o.category;
  const r = rules.findLast((x) => matches(tx, x.match));
  return r ? r.category : null;
}

export function shareAmount(s: Share, txs: Tx[]): number {
  if (s.manual) return s.manual.amount;
  const tx = txs.find((t) => t.id === s.txId);
  return tx ? Math.abs(tx.amount) : 0;
}

// The partner's fraction of a shared expense; shares predating split options are 50/50.
export const partnerShareOf = (s: Share): number => s.partnerShare ?? 0.5;

// Positive = the partner owes the owner.
export function balance(shares: Share[], settlements: { amount: number }[], txs: Tx[]): number {
  let b = 0;
  for (const s of shares) {
    const total = shareAmount(s, txs);
    const partnerPart = total * partnerShareOf(s);
    // Whoever paid is owed the other's portion.
    b += s.paidBy === "owner" ? partnerPart : -(total - partnerPart);
  }
  for (const st of settlements) b -= st.amount;
  return Math.round(b * 100) / 100;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

// Spend for a month = the owner's consumption: his outgoing non-savings expenses,
// shared ones counted at his portion, plus his portion of partner-paid shared expenses.
export function monthlySpend(db: Db, month: string): number {
  const shareByTx = new Map(db.shares.filter((s) => s.txId).map((s) => [s.txId!, s]));
  let total = 0;
  for (const tx of db.transactions) {
    if (monthKey(tx.date) !== month || tx.amount >= 0) continue;
    if (categoryOf(tx, db.rules, db.overrides) === SAVINGS) continue;
    const share = shareByTx.get(tx.id);
    total += Math.abs(tx.amount) * (share ? 1 - partnerShareOf(share) : 1);
  }
  for (const s of db.shares) {
    if (s.manual && s.paidBy === "partner" && monthKey(s.manual.date) === month) {
      total += s.manual.amount * (1 - partnerShareOf(s));
    }
  }
  return Math.round(total * 100) / 100;
}

export function savedInMonth(db: Db, month: string): number {
  let total = 0;
  for (const tx of db.transactions) {
    if (monthKey(tx.date) !== month || tx.amount >= 0) continue;
    if (categoryOf(tx, db.rules, db.overrides) === SAVINGS) total += Math.abs(tx.amount);
  }
  return Math.round(total * 100) / 100;
}

export function categoryTotals(db: Db, month: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const tx of db.transactions) {
    if (monthKey(tx.date) !== month || tx.amount >= 0) continue;
    const cat = categoryOf(tx, db.rules, db.overrides) ?? "Uncategorized";
    totals[cat] = (totals[cat] ?? 0) + Math.abs(tx.amount);
  }
  return totals;
}

const DAY = 86400000;

// One charge is not a rhythm, so with fewer than two the statement text
// decides: "Domain + hosting yearly", "aastamaks", "annual plan" → yearly.
const YEARLY_HINT = /\b(yearly|annual(?:ly)?|per year|12 months|aasta(?:ne|maks|s)?|12 kuud)\b|\/\s*(?:yr|year|a)\b/i;

// The charges a subscription is made of: outgoing, matching its pattern and,
// for aggregator rows (one merchant string billing many things), its amount.
export function subscriptionCharges(
  sub: Pick<Subscription, "match" | "expectedAmount" | "matchAmount">,
  txs: Tx[]
): Tx[] {
  return txs
    .filter(
      (t) =>
        t.amount < 0 &&
        matches(t, sub.match) &&
        (!sub.matchAmount || Math.abs(Math.abs(t.amount) - sub.expectedAmount) <= 0.01)
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Monthly or yearly, from the gaps between charges when there are two or more
// to measure between, from the statement text when there is only one.
export function inferCadence(charges: Tx[]): "monthly" | "yearly" {
  const dates = charges.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b);
  if (dates.length < 2) {
    return charges.some((t) => YEARLY_HINT.test(t.counterparty + " " + t.description)) ? "yearly" : "monthly";
  }
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / DAY);
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  return median >= 200 ? "yearly" : "monthly";
}

// After a sync: a cadence that was guessed from one charge gets re-measured
// once a second charge is there to measure against. One the owner set by
// hand stays. Returns how many rows changed.
export function recheckCadences(db: Db): number {
  let changed = 0;
  for (const sub of db.subscriptions) {
    if (!sub.active || sub.cadenceByHand) continue;
    const charges = subscriptionCharges(sub, db.transactions);
    if (charges.length < 2) continue;
    const cadence = inferCadence(charges);
    if (cadence !== sub.cadence) {
      sub.cadence = cadence;
      changed++;
    }
  }
  return changed;
}

export interface SubStatus {
  sub: Subscription;
  lastCharge?: { date: string; amount: number };
  nextDue?: string;
  priceChanged: boolean;
  overdue: boolean;
}

export function subscriptionStatus(sub: Subscription, txs: Tx[], today: Date): SubStatus {
  const charges = subscriptionCharges(sub, txs);
  const last = charges[charges.length - 1];
  if (!last) return { sub, priceChanged: false, overdue: false };
  const cadenceDays = sub.cadence === "monthly" ? 30 : 365;
  const nextDue = new Date(new Date(last.date).getTime() + cadenceDays * DAY);
  const lastAmount = Math.abs(last.amount);
  return {
    sub,
    lastCharge: { date: last.date, amount: lastAmount },
    nextDue: nextDue.toISOString().slice(0, 10),
    priceChanged: Math.abs(lastAmount - sub.expectedAmount) > 0.005,
    overdue: sub.active && today.getTime() > nextDue.getTime() + (cadenceDays / 2) * DAY,
  };
}

export function monthlyBurn(statuses: SubStatus[]): number {
  let total = 0;
  for (const st of statuses) {
    if (!st.sub.active) continue;
    const amt = st.lastCharge?.amount ?? st.sub.expectedAmount;
    total += st.sub.cadence === "monthly" ? amt : amt / 12;
  }
  return Math.round(total * 100) / 100;
}
