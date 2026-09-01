import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import type { Db } from "./types";
import { seedDb } from "./seed";
import { seal, unseal } from "./crypto";
import type { LhvAccount, LhvTokens } from "./lhv";

// The single storage module, two adapters behind one interface:
//   - DATABASE_URL set (Vercel + Neon): Postgres, tables from db/schema.sql
//   - otherwise (local dev): one JSON file per collection under ./data
// Both seed mock data on first read of an empty store. Collection writes are
// whole-collection, mirroring the JSON semantics — except transactions, which
// are append-only facts and therefore upsert-only (also keeps FK references
// from shares/overrides safe).

const FILES: (keyof Db)[] = [
  "transactions",
  "rules",
  "overrides",
  "shares",
  "settlements",
  "subscriptions",
  "snapshots",
];

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function readDb(): Promise<Db> {
  return normalizeCategories(await (process.env.DATABASE_URL ? pgReadDb() : jsonReadDb()));
}

// Category rename (Housing → Mortgage, Sep 2026): rows taught under the old
// name keep working via read-time normalization, in both adapters; they
// persist renamed on the next write of their collection.
function normalizeCategories(db: Db): Db {
  for (const r of db.rules) if (r.category === "Housing") r.category = "Mortgage";
  for (const o of db.overrides) if (o.category === "Housing") o.category = "Mortgage";
  return db;
}

export async function writeCollection<K extends keyof Db>(name: K, value: Db[K]): Promise<void> {
  return process.env.DATABASE_URL ? pgWriteCollection(name, value) : jsonWriteCollection(name, value);
}

/* ---------------- JSON dev adapter ---------------- */

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureSeeded(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(path.join(DATA_DIR, "transactions.json"));
  } catch {
    const seed = seedDb();
    await Promise.all(
      FILES.map((f) =>
        fs.writeFile(path.join(DATA_DIR, `${f}.json`), JSON.stringify(seed[f], null, 2))
      )
    );
  }
}

async function jsonReadDb(): Promise<Db> {
  await ensureSeeded();
  const entries = await Promise.all(
    FILES.map(async (f) => {
      const raw = await fs.readFile(path.join(DATA_DIR, `${f}.json`), "utf8");
      return [f, JSON.parse(raw)] as const;
    })
  );
  return Object.fromEntries(entries) as unknown as Db;
}

async function jsonWriteCollection<K extends keyof Db>(name: K, value: Db[K]): Promise<void> {
  await ensureSeeded();
  await fs.writeFile(path.join(DATA_DIR, `${name}.json`), JSON.stringify(value, null, 2));
}

/* ---------------- Postgres adapter (Neon) ---------------- */

function db() {
  return neon(process.env.DATABASE_URL!);
}

async function pgReadDb(): Promise<Db> {
  const sql = db();
  // Lazy migration for columns added after the original schema shipped.
  await sql`alter table snapshots add column if not exists return_pct numeric(6,2)`;
  await sql`alter table subscriptions add column if not exists match_amount boolean not null default false`;
  await sql`alter table shares add column if not exists anni_share numeric(6,5)`;
  const [txs, rules, overrides, shares, settlements, subscriptions, snapshots] = await Promise.all([
    sql`select id, date::text as date, amount::float8 as amount, currency, counterparty, description, iban
        from transactions order by date, id`,
    sql`select id, match, category, created_at::text as created_at from rules order by created_at, id`,
    sql`select tx_id, category from overrides`,
    sql`select id, paid_by, tx_id, manual_date::text as manual_date, manual_description,
        manual_amount::float8 as manual_amount, anni_share::float8 as anni_share,
        created_at::text as created_at
        from shares order by created_at, id`,
    sql`select id, amount::float8 as amount, date::text as date, tx_id, note from settlements order by date, id`,
    sql`select id, name, match, expected_amount::float8 as expected_amount, cadence, active,
        match_amount, created_at::text as created_at from subscriptions order by created_at, id`,
    sql`select id, total::float8 as total, holdings, return_pct::float8 as return_pct, at::text as at from snapshots order by at, id`,
  ]);

  if (txs.length === 0) {
    const seed = seedDb();
    for (const f of FILES) await pgWriteCollection(f, seed[f]);
    return seed;
  }

  return {
    transactions: txs.map((r) => ({
      id: r.id,
      date: r.date,
      amount: r.amount,
      currency: r.currency,
      counterparty: r.counterparty,
      description: r.description,
      iban: r.iban,
    })),
    rules: rules.map((r) => ({ id: r.id, match: r.match, category: r.category, createdAt: r.created_at })),
    overrides: overrides.map((r) => ({ txId: r.tx_id, category: r.category })),
    shares: shares.map((r) => ({
      id: r.id,
      paidBy: r.paid_by,
      txId: r.tx_id ?? undefined,
      manual:
        r.manual_amount != null
          ? { date: r.manual_date, description: r.manual_description ?? "", amount: r.manual_amount }
          : undefined,
      anniShare: r.anni_share ?? undefined,
      createdAt: r.created_at,
    })),
    settlements: settlements.map((r) => ({
      id: r.id,
      amount: r.amount,
      date: r.date,
      txId: r.tx_id ?? undefined,
      note: r.note ?? undefined,
    })),
    subscriptions: subscriptions.map((r) => ({
      id: r.id,
      name: r.name,
      match: r.match,
      expectedAmount: r.expected_amount,
      cadence: r.cadence,
      active: r.active,
      matchAmount: r.match_amount ?? false,
      createdAt: r.created_at,
    })),
    snapshots: snapshots.map((r) => ({
      id: r.id,
      total: r.total,
      holdings: r.holdings,
      returnPct: r.return_pct ?? undefined,
      at: r.at,
    })),
  } as Db;
}

async function pgWriteCollection<K extends keyof Db>(name: K, value: Db[K]): Promise<void> {
  const sql = db();
  switch (name) {
    case "transactions": {
      // Append-only facts: upsert, never delete (shares/overrides hold FKs).
      // Display fields refresh on conflict so mapper improvements reach
      // already-stored rows on re-sync; date/amount stay immutable facts.
      for (const t of value as Db["transactions"]) {
        await sql.query(
          `insert into transactions (id, date, amount, currency, counterparty, description, iban)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (id) do update set counterparty = excluded.counterparty, description = excluded.description`,
          [t.id, t.date, t.amount, t.currency, t.counterparty, t.description, t.iban]
        );
      }
      return;
    }
    case "rules": {
      await sql`delete from rules`;
      for (const r of value as Db["rules"]) {
        await sql.query(`insert into rules (id, match, category, created_at) values ($1, $2, $3, $4)`, [
          r.id,
          r.match,
          r.category,
          r.createdAt,
        ]);
      }
      return;
    }
    case "overrides": {
      await sql`delete from overrides`;
      for (const o of value as Db["overrides"]) {
        await sql.query(`insert into overrides (tx_id, category) values ($1, $2)`, [o.txId, o.category]);
      }
      return;
    }
    case "shares": {
      await sql`alter table shares add column if not exists anni_share numeric(6,5)`;
      await sql`delete from shares`;
      for (const s of value as Db["shares"]) {
        await sql.query(
          `insert into shares (id, paid_by, tx_id, manual_date, manual_description, manual_amount, anni_share, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            s.id,
            s.paidBy,
            s.txId ?? null,
            s.manual?.date ?? null,
            s.manual?.description ?? null,
            s.manual?.amount ?? null,
            s.anniShare ?? null,
            s.createdAt,
          ]
        );
      }
      return;
    }
    case "settlements": {
      await sql`delete from settlements`;
      for (const s of value as Db["settlements"]) {
        await sql.query(
          `insert into settlements (id, amount, date, tx_id, note) values ($1, $2, $3, $4, $5)`,
          [s.id, s.amount, s.date, s.txId ?? null, s.note ?? null]
        );
      }
      return;
    }
    case "subscriptions": {
      await sql`alter table subscriptions add column if not exists match_amount boolean not null default false`;
      await sql`delete from subscriptions`;
      for (const s of value as Db["subscriptions"]) {
        await sql.query(
          `insert into subscriptions (id, name, match, expected_amount, cadence, active, match_amount, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [s.id, s.name, s.match, s.expectedAmount, s.cadence, s.active, s.matchAmount ?? false, s.createdAt]
        );
      }
      return;
    }
    case "snapshots": {
      await sql`alter table snapshots add column if not exists return_pct numeric(6,2)`;
      await sql`delete from snapshots`;
      for (const s of value as Db["snapshots"]) {
        await sql.query(
          `insert into snapshots (id, total, holdings, return_pct, at) values ($1, $2, $3::jsonb, $4, $5)`,
          [s.id, s.total, JSON.stringify(s.holdings), s.returnPct ?? null, s.at]
        );
      }
      return;
    }
  }
}

/* ---------------- LHV tokens (encrypted at rest in prod) ---------------- */

export async function getLhvTokens(): Promise<LhvTokens | null> {
  if (process.env.DATABASE_URL) {
    const sql = db();
    await sql`create table if not exists tokens (id text primary key, encrypted text not null, updated_at timestamptz not null)`;
    const rows = await sql`select encrypted, updated_at::text as updated_at from tokens where id = 'lhv'`;
    if (rows.length === 0) return null;
    return { refreshToken: unseal(rows[0].encrypted), updatedAt: rows[0].updated_at };
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "tokens.json"), "utf8");
    return JSON.parse(raw) as LhvTokens;
  } catch {
    return null;
  }
}

export async function saveLhvTokens(refreshToken: string): Promise<void> {
  const updatedAt = new Date().toISOString();
  if (process.env.DATABASE_URL) {
    const sql = db();
    await sql`create table if not exists tokens (id text primary key, encrypted text not null, updated_at timestamptz not null)`;
    await sql.query(
      `insert into tokens (id, encrypted, updated_at) values ('lhv', $1, $2)
       on conflict (id) do update set encrypted = $1, updated_at = $2`,
      [seal(refreshToken), updatedAt]
    );
    return;
  }
  // Dev fallback: plaintext file in gitignored data/ — dev never holds real tokens.
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "tokens.json"), JSON.stringify({ refreshToken, updatedAt }, null, 2));
}

/* ---------------- LHV account balances ---------------- */

export async function getAccounts(): Promise<{ accounts: LhvAccount[]; fetchedAt: string | null }> {
  if (process.env.DATABASE_URL) {
    const sql = db();
    await sql`create table if not exists accounts (iban text primary key, name text not null, currency text not null, balance numeric(14,2) not null, fetched_at timestamptz not null)`;
    const rows = await sql`select iban, name, currency, balance::float8 as balance, fetched_at::text as fetched_at from accounts order by balance desc`;
    return {
      accounts: rows.map((r) => ({ iban: r.iban, name: r.name, currency: r.currency, balance: r.balance })),
      fetchedAt: rows[0]?.fetched_at ?? null,
    };
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "accounts.json"), "utf8");
    return JSON.parse(raw) as { accounts: LhvAccount[]; fetchedAt: string | null };
  } catch {
    return { accounts: [], fetchedAt: null };
  }
}

export async function saveAccounts(accounts: LhvAccount[]): Promise<void> {
  const fetchedAt = new Date().toISOString();
  if (process.env.DATABASE_URL) {
    const sql = db();
    await sql`create table if not exists accounts (iban text primary key, name text not null, currency text not null, balance numeric(14,2) not null, fetched_at timestamptz not null)`;
    for (const a of accounts) {
      await sql.query(
        `insert into accounts (iban, name, currency, balance, fetched_at) values ($1, $2, $3, $4, $5)
         on conflict (iban) do update set name = $2, currency = $3, balance = $4, fetched_at = $5`,
        [a.iban, a.name, a.currency, a.balance, fetchedAt]
      );
    }
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "accounts.json"), JSON.stringify({ accounts, fetchedAt }, null, 2));
}

/* ---------------- one-time mock cleanup on first real sync ---------------- */

// Removes the fictional seed once real transactions exist: mock transactions
// (plus shares/overrides/settlements that referenced the demo world) and the
// fictional Lightyear snapshots. KEEPS rules (the Estonian merchant rules are
// genuinely useful) and subscriptions (their match patterns apply to real
// charges too). Runs only against Postgres; returns whether anything was cut.
export async function cleanupMockData(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const sql = db();
  const mock = await sql`select count(*)::int as n from transactions where id like 'mock-%'`;
  if (mock[0].n === 0) return false;
  await sql`delete from overrides where tx_id like 'mock-%'`;
  await sql`delete from shares`;
  await sql`delete from settlements`;
  await sql`delete from transactions where id like 'mock-%'`;
  await sql`delete from snapshots where id in ('snap-0a', 'snap-0b', 'snap-0c', 'snap-1')`;
  return true;
}
