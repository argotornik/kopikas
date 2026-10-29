import type { Db } from "./types";

// How the collections are saved: row by row, each row by its key, so a change sends only the
// rows it added, changed or removed, and two changes at once to different rows both stand.
// Rewriting a whole collection let the later of two overlapping changes drop the earlier's.
// Categories are saved whole, since their order is part of them; transactions are facts the
// sync only ever adds or refreshes.
export type RowCollection = Exclude<keyof Db, "categories" | "transactions">;
type Row<K extends RowCollection> = Db[K][number];

// Each row's key.
export const KEY: { [K in RowCollection]: (row: Row<K>) => string } = {
  rules: (r) => r.id,
  overrides: (o) => o.txId,
  shares: (s) => s.id,
  shareRules: (r) => r.id,
  settlements: (s) => s.id,
  subscriptions: (s) => s.id,
  merchants: (m) => m.id,
  snapshots: (s) => s.id,
};

// The order a collection is read in, as Postgres reads it. It matters: the newest rule is the
// last that matches.
const byCreated = (a: { createdAt: string; id: string }, b: { createdAt: string; id: string }) =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
export const ORDER: { [K in RowCollection]?: (a: Row<K>, b: Row<K>) => number } = {
  rules: byCreated,
  shares: byCreated,
  shareRules: byCreated,
  subscriptions: byCreated,
  merchants: byCreated,
  settlements: (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  snapshots: (a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id),
};

export type Changes<T> = { put: T[]; drop: string[] };

// What a save has to send: the rows that are new or changed since they were read, and the keys
// of the rows taken out. Rows nobody touched are left alone, so another change to them stands.
export function changes<T>(before: T[], after: T[], key: (row: T) => string): Changes<T> {
  const was = new Map(before.map((r) => [key(r), JSON.stringify(r)]));
  const now = new Set(after.map(key));
  return {
    put: after.filter((r) => was.get(key(r)) !== JSON.stringify(r)),
    drop: [...was.keys()].filter((k) => !now.has(k)),
  };
}

// The same changes made to a stored list, for the JSON files: the rows taken out go, a changed
// row takes its old one's place, a new one joins, and the list keeps its read order.
export function applyChanges<T>(stored: T[], { put, drop }: Changes<T>, key: (row: T) => string, order?: (a: T, b: T) => number): T[] {
  const gone = new Set(drop);
  const next = new Map(stored.filter((r) => !gone.has(key(r))).map((r) => [key(r), r]));
  for (const r of put) next.set(key(r), r);
  const rows = [...next.values()];
  return order ? rows.sort(order) : rows;
}

// Each collection as its table's columns, for Postgres.
type Table<K extends RowCollection> = { name: string; key: string; columns: (row: Row<K>) => Record<string, unknown>; jsonb?: string };
export const TABLE: { [K in RowCollection]: Table<K> } = {
  rules: { name: "rules", key: "id", columns: (r) => ({ id: r.id, match: r.match, category: r.category, created_at: r.createdAt }) },
  overrides: { name: "overrides", key: "tx_id", columns: (o) => ({ tx_id: o.txId, category: o.category, filed_at: o.at ?? null }) },
  shares: {
    name: "shares",
    key: "id",
    columns: (s) => ({
      id: s.id,
      paid_by: s.paidBy,
      tx_id: s.txId ?? null,
      manual_date: s.manual?.date ?? null,
      manual_description: s.manual?.description ?? null,
      manual_amount: s.manual?.amount ?? null,
      manual_category: s.manual?.category ?? null,
      partner_share: s.partnerShare ?? null,
      created_at: s.createdAt,
    }),
  },
  shareRules: { name: "share_rules", key: "id", columns: (r) => ({ id: r.id, match: r.match, partner_share: r.partnerShare, created_at: r.createdAt }) },
  settlements: {
    name: "settlements",
    key: "id",
    columns: (s) => ({ id: s.id, amount: s.amount, date: s.date, tx_id: s.txId ?? null, note: s.note ?? null, recorded_by: s.recordedBy ?? null }),
  },
  subscriptions: {
    name: "subscriptions",
    key: "id",
    columns: (s) => ({
      id: s.id,
      name: s.name,
      match: s.match,
      expected_amount: s.expectedAmount,
      cadence: s.cadence,
      cadence_by_hand: s.cadenceByHand ?? false,
      active: s.active,
      match_amount: s.matchAmount ?? false,
      created_at: s.createdAt,
    }),
  },
  merchants: {
    name: "merchants",
    key: "id",
    columns: (m) => ({ id: m.id, match: m.match, name: m.name, domain: m.domain ?? null, emoji: m.emoji ?? null, created_at: m.createdAt }),
  },
  snapshots: {
    name: "snapshots",
    key: "id",
    columns: (s) => ({
      id: s.id,
      source: s.source ?? null,
      auto: s.auto ?? false,
      total: s.total,
      holdings: JSON.stringify(s.holdings),
      return_pct: s.returnPct ?? null,
      at: s.at,
    }),
    jsonb: "holdings",
  },
};

export type Statement = { text: string; params: unknown[] };

// The statements that make the changes in Postgres, to run as one transaction: a delete per row
// taken out, and an insert per row put that updates the row when its key is there already.
export function statements<K extends RowCollection>(name: K, { put, drop }: Changes<Row<K>>): Statement[] {
  const t = TABLE[name] as unknown as Table<RowCollection>;
  const upsert = (row: Row<RowCollection>): Statement => {
    const columns = t.columns(row);
    const names = Object.keys(columns);
    const values = names.map((n, i) => `$${i + 1}${n === t.jsonb ? "::jsonb" : ""}`);
    const set = names.filter((n) => n !== t.key).map((n) => `${n} = excluded.${n}`);
    return {
      text: `insert into ${t.name} (${names.join(", ")}) values (${values.join(", ")}) on conflict (${t.key}) do update set ${set.join(", ")}`,
      params: Object.values(columns),
    };
  };
  return [...drop.map((key) => ({ text: `delete from ${t.name} where ${t.key} = $1`, params: [key] })), ...put.map(upsert)];
}
