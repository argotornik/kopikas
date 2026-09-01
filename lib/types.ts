export type Person = "argo" | "anni";

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

// A shared (50/50) expense. Either points at a bank transaction (txId)
// or is a manual quick-add (Anni paid with her own money).
export interface Share {
  id: string;
  paidBy: Person;
  txId?: string;
  manual?: { date: string; description: string; amount: number }; // amount positive
  createdAt: string;
}

// Repayment between the two. amount positive = Anni -> Argo.
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

// Lightyear (or any manual) portfolio snapshot. Append-only.
export interface Snapshot {
  id: string;
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
