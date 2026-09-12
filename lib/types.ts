export type Person = "argo" | "partner";

export interface Tx {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number; // negative = money out
  currency: "EUR";
  counterparty: string;
  description: string;
  iban: string; // own account it happened on
}

export interface Rule {
  id: string;
  match: string; // case-insensitive substring on counterparty + description
  category: string;
  createdAt: string;
}

export interface Override {
  txId: string;
  category: string;
}

// A shared expense. Either points at a bank transaction (txId)
// or is a manual quick-add (the partner paid with their own money).
export interface Share {
  id: string;
  paidBy: Person;
  txId?: string;
  // amount positive; category optional — bank-linked shares inherit their
  // transaction's category instead.
  manual?: { date: string; description: string; amount: number; category?: string };
  // Fraction of the expense that is the partner's responsibility. Absent = 0.5,
  // so shares from before split options keep meaning 50/50.
  partnerShare?: number;
  createdAt: string;
}

// Repayment between the two. amount positive = partner -> owner.
export interface Settlement {
  id: string;
  amount: number;
  date: string;
  txId?: string; // matched incoming bank transfer, if any
  note?: string;
}

export interface Subscription {
  id: string;
  name: string;
  match: string; // same matching semantics as rules
  expectedAmount: number; // positive
  cadence: "monthly" | "yearly";
  active: boolean;
  createdAt: string;
  // Aggregator merchants (APPLE.COM/BILL) bill many subscriptions under one
  // name; matchAmount requires the charge amount to equal expectedAmount so
  // they stay distinguishable. Price changes then show as "gone quiet".
  matchAmount?: boolean;
}

// A manual portfolio snapshot. Append-only. `source` names the pot — Lightyear
// (default, so older rows keep meaning what they meant) or the LHV
// investment account, whose holdings the LHV API cannot see.
export type SnapshotSource = "lightyear" | "lhv";
export interface Snapshot {
  id: string;
  source?: SnapshotSource;
  total: number;
  holdings: { name: string; pct: number }[];
  returnPct?: number; // overall return % as reported by Lightyear at snapshot time
  at: string; // ISO datetime
}

export interface Db {
  transactions: Tx[];
  rules: Rule[];
  overrides: Override[];
  shares: Share[];
  settlements: Settlement[];
  subscriptions: Subscription[];
  snapshots: Snapshot[];
}
