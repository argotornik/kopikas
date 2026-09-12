-- Postgres schema, for reading. The app creates these tables itself on first
-- start (lib/schema.ts is the copy it runs), so nothing here needs running by
-- hand. Amounts follow the app convention: negative = money out.

create table if not exists transactions (
  id           text primary key,
  date         date not null,
  amount       numeric(12, 2) not null,
  currency     text not null default 'EUR',
  counterparty text not null,
  description  text not null default '',
  iban         text not null
);

create table if not exists rules (
  id         text primary key,
  match      text not null,
  category   text not null,
  created_at timestamptz not null
);

create table if not exists overrides (
  tx_id    text primary key references transactions (id),
  category text not null
);

create table if not exists shares (
  id                 text primary key,
  paid_by            text not null check (paid_by in ('owner', 'partner')),
  tx_id              text references transactions (id),
  manual_date        date,
  manual_description text,
  manual_amount      numeric(12, 2),
  manual_category    text,          -- quick-adds only; bank-linked shares inherit the tx category
  partner_share      numeric(6, 5), -- the partner's fraction of the expense; null = 0.5
  created_at         timestamptz not null,
  check (tx_id is not null or manual_amount is not null)
);

create table if not exists settlements (
  id     text primary key,
  amount numeric(12, 2) not null,
  date   date not null,
  tx_id  text,
  note   text
);

create table if not exists subscriptions (
  id              text primary key,
  name            text not null,
  match           text not null,
  expected_amount numeric(12, 2) not null,
  cadence         text not null check (cadence in ('monthly', 'yearly')),
  active          boolean not null default true,
  match_amount    boolean not null default false,
  created_at      timestamptz not null
);

create table if not exists snapshots (
  id         text primary key,
  total      numeric(12, 2) not null,
  holdings   jsonb not null default '[]',
  return_pct numeric(6, 2),
  source     text,            -- lightyear (null = lightyear) | lhv
  at         timestamptz not null
);

-- Server-side favicon cache (replaces data/icons/ on serverless).
create table if not exists icons (
  domain     text primary key,
  png        bytea not null,
  fetched_at timestamptz not null
);

-- LHV tokens live encrypted in the DB, never in env vars: refresh tokens may
-- rotate on use and env is read-only at runtime. Env holds only the
-- ENCRYPTION_KEY that seals this row.
create table if not exists tokens (
  id         text primary key,
  encrypted  text not null,
  updated_at timestamptz not null
);

create index if not exists transactions_date_idx on transactions (date desc);

-- LHV account balances, refreshed by every sync (also created lazily by the
-- app itself, so existing databases don't need this run by hand).
create table if not exists accounts (
  iban       text primary key,
  name       text not null,
  currency   text not null,
  balance    numeric(14, 2) not null,
  fetched_at timestamptz not null
);
