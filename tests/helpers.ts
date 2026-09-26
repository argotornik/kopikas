import type { Db, Rule, Share, Subscription, Tx } from "../lib/types.ts";
import { DEFAULT_CATEGORIES } from "../lib/engine.ts";

let n = 0;
export const tx = (date: string, amount: number, counterparty: string, description = "", iban = "EE1"): Tx => ({
  id: `t${++n}`,
  date,
  amount,
  currency: "EUR",
  counterparty,
  description,
  iban,
});

export const rule = (match: string, category: string, createdAt = "2026-01-01"): Rule => ({
  id: `r-${match}`,
  match,
  category,
  createdAt,
});

export const sub = (o: Partial<Subscription> & Pick<Subscription, "match" | "expectedAmount">): Subscription => ({
  id: `sub-${o.match}`,
  name: o.match,
  cadence: "monthly",
  active: true,
  createdAt: "2026-01-01",
  ...o,
});

export const share = (o: Partial<Share>): Share => ({ id: `s${++n}`, paidBy: "owner", createdAt: "2026-01-01", ...o });

export const db = (o: Partial<Db> = {}): Db => ({
  categories: DEFAULT_CATEGORIES.map((name) => ({ name })),
  transactions: [],
  rules: [],
  overrides: [],
  shares: [],
  shareRules: [],
  settlements: [],
  subscriptions: [],
  merchants: [],
  snapshots: [],
  ...o,
});
