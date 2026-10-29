import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import type { Category, Db } from "./types";
import { seedDb } from "./seed";
import { SCHEMA } from "./schema";
import { DEFAULT_CATEGORIES } from "./engine";
import { stripPeriod } from "./utils";
import { seal, unseal } from "./crypto";
import { KEY, ORDER, applyChanges, changes, statements, type Changes, type RowCollection } from "./rows";
import type { LhvAccount, LhvTokens } from "./lhv";

// The single storage module, two adapters behind one interface:
//   - DATABASE_URL set (Vercel + Neon): Postgres, tables from db/schema.sql
//   - otherwise (local dev): one JSON file per collection under ./data
// The JSON adapter seeds mock data into an empty folder; Postgres starts empty. Collection writes are
// whole-collection, mirroring the JSON semantics — except transactions, which
// are append-only facts and therefore upsert-only (also keeps FK references
// from shares/overrides safe).

const FILES: (keyof Db)[] = [
  "categories",
  "transactions",
  "rules",
  "overrides",
  "shares",
  "shareRules",
  "settlements",
  "subscriptions",
  "merchants",
  "snapshots",
];

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// What each request read, as stored (before the repairs below), so a save sends only what the
// request changed, the repairs included.
const asRead = new WeakMap<Db, Db>();

export async function readDb(): Promise<Db> {
  const stored = await (process.env.DATABASE_URL ? pgReadDb() : jsonReadDb());
  const db = normalizePatterns(normalizeCategories(structuredClone(stored)));
  asRead.set(db, stored);
  // categories.json from before limits existed holds bare names.
  db.categories = (db.categories as unknown as (string | Category)[]).map((c) => (typeof c === "string" ? { name: c } : c));
  // A board that has never edited its categories stores none and shows the defaults.
  if (db.categories.length === 0) db.categories = DEFAULT_CATEGORIES.map((name) => ({ name }));
  return db;
}

// Rows taught before the period-stamp stripper shipped: "kaardi kuutasu
// 06-2026" and "... 07-2026" are the same subscription wearing different
// months. Patterns normalize on read and the duplicates that result are
// merged (oldest row wins); they persist repaired on the collection's next
// write, like normalizeCategories below.
function normalizePatterns(db: Db): Db {
  const seenRules = new Set<string>();
  db.rules = db.rules.filter((r) => {
    r.match = stripPeriod(r.match);
    const key = `${r.match}\x00${r.category}`;
    if (seenRules.has(key)) return false;
    seenRules.add(key);
    return true;
  });
  const seenSubs = new Set<string>();
  db.subscriptions = db.subscriptions.filter((s) => {
    s.match = stripPeriod(s.match);
    s.name = stripPeriod(s.name);
    if (!s.active) return true; // inactive rows are history, not duplicates
    const key = `${s.match}\x00${s.cadence}\x00${s.matchAmount ? s.expectedAmount : ""}`;
    if (seenSubs.has(key)) return false;
    seenSubs.add(key);
    return true;
  });
  return db;
}

// Category rename (Housing → Mortgage, Sep 2026): rows taught under the old
// name keep working via read-time normalization, in both adapters; they
// persist renamed on the next write of their collection.
function normalizeCategories(db: Db): Db {
  for (const r of db.rules) if (r.category === "Housing") r.category = "Mortgage";
  for (const o of db.overrides) if (o.category === "Housing") o.category = "Mortgage";
  return db;
}

// Saves a collection of a board read with readDb: only the rows this request added, changed or
// took out, in one step, so a save cut off halfway leaves nothing half-written and two saves at
// once to different rows both stand (see lib/rows.ts). Categories go whole, in one step.
export async function writeCollection(db: Db, name: RowCollection | "categories"): Promise<void> {
  const read = asRead.get(db);
  if (!read) throw new Error("writeCollection saves a board read with readDb");
  const pg = !!process.env.DATABASE_URL;
  if (name === "categories") {
    await (pg ? pgWriteCategories(db.categories) : jsonWriteCategories(db.categories));
  } else {
    const change = changes<object>(read[name], db[name], KEY[name] as (row: object) => string);
    if (change.put.length === 0 && change.drop.length === 0) return;
    await (pg ? pgSave(name, change) : jsonSave(name, change));
  }
  // A second save of the same collection in this request sends only what changed since.
  (read as unknown as Record<string, unknown>)[name] = structuredClone(db[name]);
}

// New and refreshed charges from the bank: added, or their names refreshed, never removed.
export async function upsertTransactions(txs: Db["transactions"]): Promise<void> {
  if (txs.length === 0) return;
  return process.env.DATABASE_URL ? pgUpsertTransactions(txs) : jsonUpsertTransactions(txs);
}

/* ---------------- JSON dev adapter ---------------- */

// KOPIKAS_EMPTY=1 runs the dev server against an empty store in data/empty:
// the normal data/ is seeded with mock transactions and never empty, and the
// first-run screens only show on an empty board.
const EMPTY = !!process.env.KOPIKAS_EMPTY;
const DATA_DIR = path.join(process.cwd(), "data", EMPTY ? "empty" : "");

async function ensureSeeded(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(path.join(DATA_DIR, "transactions.json"));
  } catch {
    const seed = EMPTY ? (Object.fromEntries(FILES.map((f) => [f, []])) as unknown as Db) : seedDb();
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
      try {
        const raw = await fs.readFile(path.join(DATA_DIR, `${f}.json`), "utf8");
        return [f, JSON.parse(raw)] as const;
      } catch (e) {
        // categories, merchants and shareRules arrived after the other files;
        // a data/ folder from before them means "none yet". Any other file
        // missing is an error.
        if (
          (f === "categories" || f === "merchants" || f === "shareRules") &&
          (e as NodeJS.ErrnoException).code === "ENOENT"
        ) {
          return [f, []] as const;
        }
        throw e;
      }
    })
  );
  return Object.fromEntries(entries) as unknown as Db;
}

// One write at a time: each reads its file afresh and makes its changes to that, as Postgres does
// row by row.
let writing: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(write: () => Promise<T>): Promise<T> {
  const run = writing.then(write, write);
  writing = run.catch(() => {});
  return run;
}

async function jsonReadFile<T>(name: keyof Db): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${name}.json`), "utf8")) as T[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

function jsonWriteFile(name: keyof Db, value: unknown): Promise<void> {
  return fs.writeFile(path.join(DATA_DIR, `${name}.json`), JSON.stringify(value, null, 2));
}

function jsonSave(name: RowCollection, change: Changes<object>): Promise<void> {
  return oneAtATime(async () => {
    await ensureSeeded();
    const key = KEY[name] as (row: object) => string;
    const order = ORDER[name] as ((a: object, b: object) => number) | undefined;
    await jsonWriteFile(name, applyChanges(await jsonReadFile<object>(name), change, key, order));
  });
}

function jsonWriteCategories(categories: Db["categories"]): Promise<void> {
  return oneAtATime(async () => {
    await ensureSeeded();
    await jsonWriteFile("categories", categories);
  });
}

function jsonUpsertTransactions(txs: Db["transactions"]): Promise<void> {
  return oneAtATime(async () => {
    await ensureSeeded();
    const byId = new Map((await jsonReadFile<Db["transactions"][number]>("transactions")).map((t) => [t.id, t]));
    for (const t of txs) {
      const old = byId.get(t.id);
      byId.set(t.id, old ? { ...old, counterparty: t.counterparty, description: t.description } : t);
    }
    await jsonWriteFile("transactions", [...byId.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)));
  });
}

/* ---------------- Postgres adapter (Neon) ---------------- */

function db() {
  return neon(process.env.DATABASE_URL!);
}

// Tables on first start, then the columns the schema has grown since a
// database was created. Once per server instance; a failure clears the memo
// so the next request tries again.
let schemaReady: Promise<void> | null = null;
function ensureSchema(sql: ReturnType<typeof db>): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const statement of SCHEMA) await sql.query(statement);
      await sql`alter table snapshots add column if not exists return_pct numeric(6,2)`;
      await sql`alter table subscriptions add column if not exists match_amount boolean not null default false`;
      await sql`alter table shares add column if not exists partner_share numeric(6,5)`;
      await sql`alter table shares add column if not exists manual_category text`;
      await sql`alter table snapshots add column if not exists source text`;
      await sql`alter table subscriptions add column if not exists cadence_by_hand boolean not null default false`;
      await sql`alter table categories add column if not exists budget numeric(12,2)`;
      await sql`alter table snapshots add column if not exists auto boolean not null default false`;
      await sql`alter table overrides add column if not exists filed_at timestamptz`;
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

async function pgReadDb(): Promise<Db> {
  const sql = db();
  await ensureSchema(sql);
  const [categories, txs, rules, overrides, shares, shareRules, settlements, subscriptions, merchants, snapshots] = await Promise.all([
    sql`select name, budget::float8 as budget from categories order by position, name`,
    sql`select id, date::text as date, amount::float8 as amount, currency, counterparty, description, iban
        from transactions order by date, id`,
    sql`select id, match, category, created_at::text as created_at from rules order by created_at, id`,
    sql`select tx_id, category, filed_at from overrides`,
    sql`select id, paid_by, tx_id, manual_date::text as manual_date, manual_description,
        manual_amount::float8 as manual_amount, manual_category, partner_share::float8 as partner_share,
        created_at::text as created_at
        from shares order by created_at, id`,
    sql`select id, match, partner_share::float8 as partner_share, created_at::text as created_at from share_rules order by created_at, id`,
    sql`select id, amount::float8 as amount, date::text as date, tx_id, note, recorded_by from settlements order by date, id`,
    sql`select id, name, match, expected_amount::float8 as expected_amount, cadence, cadence_by_hand, active,
        match_amount, created_at::text as created_at from subscriptions order by created_at, id`,
    sql`select id, match, name, domain, emoji, created_at::text as created_at from merchants order by created_at, id`,
    sql`select id, source, auto, total::float8 as total, holdings, return_pct::float8 as return_pct, at::text as at from snapshots order by at, id`,
  ]);

  return {
    categories: categories.map((r) => ({ name: r.name, budget: r.budget ?? undefined })),
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
    overrides: overrides.map((r) => ({ txId: r.tx_id, category: r.category, ...(r.filed_at ? { at: new Date(r.filed_at).toISOString() } : {}) })),
    shares: shares.map((r) => ({
      id: r.id,
      paidBy: r.paid_by,
      txId: r.tx_id ?? undefined,
      manual:
        r.manual_amount != null
          ? {
              date: r.manual_date,
              description: r.manual_description ?? "",
              amount: r.manual_amount,
              category: r.manual_category ?? undefined,
            }
          : undefined,
      partnerShare: r.partner_share ?? undefined,
      createdAt: r.created_at,
    })),
    shareRules: shareRules.map((r) => ({ id: r.id, match: r.match, partnerShare: r.partner_share, createdAt: r.created_at })),
    settlements: settlements.map((r) => ({
      id: r.id,
      amount: r.amount,
      date: r.date,
      txId: r.tx_id ?? undefined,
      note: r.note ?? undefined,
      recordedBy: r.recorded_by ?? undefined,
    })),
    subscriptions: subscriptions.map((r) => ({
      id: r.id,
      name: r.name,
      match: r.match,
      expectedAmount: r.expected_amount,
      cadence: r.cadence,
      cadenceByHand: r.cadence_by_hand || undefined,
      active: r.active,
      matchAmount: r.match_amount ?? false,
      createdAt: r.created_at,
    })),
    merchants: merchants.map((r) => ({
      id: r.id,
      match: r.match,
      name: r.name,
      domain: r.domain ?? undefined,
      emoji: r.emoji ?? undefined,
      createdAt: r.created_at,
    })),
    snapshots: snapshots.map((r) => ({
      id: r.id,
      source: r.source ?? undefined,
      total: r.total,
      holdings: r.holdings,
      returnPct: r.return_pct ?? undefined,
      at: r.at,
      auto: r.auto || undefined,
    })),
  } as Db;
}

// A collection's changes as one transaction: a save cut off halfway changes nothing.
async function pgSave(name: RowCollection, change: Changes<object>): Promise<void> {
  const sql = db();
  await ensureSchema(sql);
  await sql.transaction((txn) => statements(name, change as Changes<never>).map((q) => txn.query(q.text, q.params)));
}

async function pgWriteCategories(categories: Db["categories"]): Promise<void> {
  const sql = db();
  await ensureSchema(sql);
  await sql.transaction((txn) => [
    txn`delete from categories`,
    ...categories.map((c, i) => txn.query(`insert into categories (name, position, budget) values ($1, $2, $3)`, [c.name, i, c.budget ?? null])),
  ]);
}

// Append-only facts: upsert, never delete (shares/overrides hold FKs). Display fields refresh on
// conflict so mapper improvements reach already-stored rows on re-sync; date/amount stay
// immutable facts.
async function pgUpsertTransactions(txs: Db["transactions"]): Promise<void> {
  const sql = db();
  await ensureSchema(sql);
  await sql.transaction((txn) =>
    txs.map((t) =>
      txn.query(
        `insert into transactions (id, date, amount, currency, counterparty, description, iban)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (id) do update set counterparty = excluded.counterparty, description = excluded.description`,
        [t.id, t.date, t.amount, t.currency, t.counterparty, t.description, t.iban]
      )
    )
  );
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
