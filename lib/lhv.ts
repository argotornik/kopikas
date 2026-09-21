import type { Tx } from "./types";

// LHV.ai client (https://api.lhv.ai/api/v1, tokens via api.lhv.ai/api-access).
// The exact response field names aren't publicly documented in detail, so the
// mappers accept the common PSD2-style aliases and — when a record can't be
// mapped — report the record's KEY NAMES (never values) in the sync
// diagnostics, so a mismatch is fixable from the sync output alone without
// exposing transaction contents anywhere.

const AUTH_URL = "https://auth.lhv.ai/oauth2/token";
const API_BASE = "https://api.lhv.ai/api/v1";

export interface LhvTokens {
  refreshToken: string;
  updatedAt: string;
}

export interface LhvAccount {
  iban: string;
  name: string;
  currency: string;
  balance: number;
}

export interface SyncDiagnostics {
  accounts: number;
  fetched: number;
  mapped: number;
  unmappedKeySamples: string[][];
  rotatedRefreshToken: boolean;
  window: { from: string; to: string };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; newRefreshToken?: string }> {
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
  if (process.env.LHV_CLIENT_ID) body.set("client_id", process.env.LHV_CLIENT_ID);
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(
      `LHV token refresh failed: HTTP ${res.status}${body ? ` — ${body}` : ""}. ` +
        `invalid_client → set LHV_CLIENT_ID env; invalid_grant → paste a fresh refresh token from api.lhv.ai/api-access.`
    );
  }
  const json = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!json.access_token) throw new Error("LHV token refresh: response had no access_token");
  return {
    accessToken: json.access_token,
    newRefreshToken: json.refresh_token && json.refresh_token !== refreshToken ? json.refresh_token : undefined,
  };
}

async function lhvGet(accessToken: string, path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`LHV GET ${path.split("?")[0]} failed: HTTP ${res.status}${body ? ` — ${body}` : ""}`);
  }
  return res.json();
}

/* ---------- accounts ---------- */

function asArray(json: unknown, keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  const obj = json as Record<string, unknown>;
  for (const k of keys) if (Array.isArray(obj?.[k])) return obj[k] as Record<string, unknown>[];
  return [];
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    // Tolerate "1 234,56" style formatting.
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    if (!Number.isNaN(n)) return n;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return num(o.amount ?? o.value);
  }
  return undefined;
}

function str(...vals: unknown[]): string | undefined {
  for (const v of vals) if (typeof v === "string" && v.trim() !== "") return v;
  return undefined;
}

// Identifiers may arrive as numbers — stringify them.
function idStr(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim() !== "") return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

// Dates may arrive as strings or epoch numbers (seconds or millis).
function dateStr(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim() !== "") return v;
    if (typeof v === "number" && Number.isFinite(v) && v > 1e9) {
      return new Date(v > 1e12 ? v : v * 1000).toISOString();
    }
  }
  return undefined;
}

export async function fetchAccounts(accessToken: string): Promise<{ accounts: LhvAccount[]; unmapped: string[][] }> {
  const json = await lhvGet(accessToken, "/accounts");
  const rows = asArray(json, ["accounts", "data", "items"]);
  const accounts: LhvAccount[] = [];
  const unmapped: string[][] = [];
  for (const r of rows) {
    const iban = str(r.iban, r.accountIban, r.id);
    const balance = num(r.availableBalance ?? r.balance ?? r.available);
    if (!iban || balance === undefined) {
      unmapped.push(Object.keys(r));
      continue;
    }
    accounts.push({
      iban,
      name: str(r.name, r.accountName, r.type, r.product) ?? "LHV",
      currency: str(r.currency) ?? "EUR",
      balance,
    });
  }
  return { accounts, unmapped };
}

/* ---------- statement ---------- */

export async function fetchStatement(
  accessToken: string,
  iban: string,
  dateFrom: string,
  dateTo: string
): Promise<{
  txs: Tx[];
  fetched: number;
  unmapped: string[][];
  paymentDataKeySamples: string[][];
  directionValues: string[];
  unmappedTypeSample: Record<string, string> | null;
}> {
  const json = await lhvGet(
    accessToken,
    `/accounts/${encodeURIComponent(iban)}/statement?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
  const rows = asArray(json, ["transactions", "entries", "data", "items"]);
  const txs: Tx[] = [];
  const unmapped: string[][] = [];
  const paymentDataKeySamples: string[][] = [];
  const directionValues = new Set<string>();
  let unmappedTypeSample: Record<string, string> | null = null;
  for (const r of rows) {
    const dir = str(r.creditDebitIndicator, r.direction, r.type);
    if (dir && directionValues.size < 4) directionValues.add(dir);
    const { tx, pdKeys } = mapTransaction(r, iban);
    if (tx) txs.push(tx);
    else {
      unmapped.push(Object.keys(r));
      if (!unmappedTypeSample) {
        // Types only, never values — enough to see exactly which required
        // field the mapper is rejecting.
        unmappedTypeSample = Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k, Array.isArray(v) ? "array" : v === null ? "null" : typeof v])
        );
      }
    }
    if (pdKeys && paymentDataKeySamples.length < 3) paymentDataKeySamples.push(pdKeys);
  }
  return {
    txs,
    fetched: rows.length,
    unmapped,
    paymentDataKeySamples,
    directionValues: [...directionValues],
    unmappedTypeSample,
  };
}

/* ---------- investments ---------- */

export interface LhvPortfolio {
  total: number; // market value in the base currency
  returnPct?: number; // total profit or loss as a percentage, as LHV reports it
  holdings: { name: string; pct: number }[];
  positions: number;
}

// The portfolio across every investment account, from /investments/balances
// (scope accounts:read, nothing extra). Positions are merged by instrument
// and reported as shares of the total, the shape the snapshots already use.
export function mapPortfolio(json: unknown): LhvPortfolio | null {
  const o = json as { accounts?: unknown; summary?: Record<string, unknown> } | null;
  const byName = new Map<string, number>();
  for (const a of asArray(o?.accounts, [])) {
    for (const p of asArray(a.positions, [])) {
      const value = num(p.baseCurrencyMarketValue ?? p.marketValue);
      const name = str(p.name, p.symbol);
      if (value === undefined || !name) continue;
      byName.set(name, (byName.get(name) ?? 0) + value);
    }
  }
  const summed = [...byName.values()].reduce((s, v) => s + v, 0);
  const total = num(o?.summary?.totalValue) ?? summed;
  if (!(total > 0)) return null;
  const holdings = [...byName.entries()]
    .map(([name, v]) => ({ name, pct: Math.round((v / total) * 100) }))
    .filter((h) => h.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  const returnPct = num(o?.summary?.totalChangePercentage);
  return {
    total: Math.round(total * 100) / 100,
    returnPct: returnPct === undefined ? undefined : Math.round(returnPct * 100) / 100,
    holdings,
    positions: byName.size,
  };
}

export async function fetchInvestments(accessToken: string): Promise<LhvPortfolio | null> {
  return mapPortfolio(await lhvGet(accessToken, "/investments/balances?isSettled=false"));
}

const DEBIT_MARKERS = new Set(["DBIT", "DEBIT", "D", "OUT", "OUTGOING", "DEB", "EXPENSE"]);

// LHV card payments embed the merchant in the description:
// "(..3696) 2026-08-30 17:39 SOLARISE TOIDUPOOD \ESTONIA PST 9 \TALLINN ..."
// -> "SOLARISE TOIDUPOOD". The backslash starts the address; the prefix is
// card suffix + timestamp.
// Some rows carry a labeled variant — "Sularaha välja: (..3696) 2026-08-22
// 12:33 WLEC0501 Parnu mnt 238\..." — where the label ("Sularaha välja",
// cash withdrawal) is the meaningful name and the post-timestamp segment is
// just the ATM's id and address. Prefer the label when present.
const CARD_DESC = /^(?:([^(\\]+?):\s*)?\(\.\.\d{3,4}\)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+([^\\]+)/;

export function merchantFromDescription(description: string): string | undefined {
  const m = description.match(CARD_DESC);
  if (!m) return undefined;
  const name = (m[1] ?? m[2])?.trim();
  return name && name.length > 1 ? name : undefined;
}

function mapTransaction(r: Record<string, unknown>, iban: string): { tx: Tx | null; pdKeys: string[] | null } {
  const pd = (r.paymentData ?? {}) as Record<string, unknown>;
  const id = idStr(r.id, r.transactionId, r.entryReference, r.reference, r.bankReference);
  const rawDate = dateStr(r.date, r.bookingDate, r.valueDate, r.transactionDate, r.settlementDtime, r.bookingDtime);
  let amount = num(r.amount);
  if (id === undefined || rawDate === undefined || amount === undefined) return { tx: null, pdKeys: null };

  // LHV returns positive amounts plus a direction flag.
  const dir = str(r.creditDebitIndicator, r.direction, r.type)?.toUpperCase();
  if (amount > 0 && dir && DEBIT_MARKERS.has(dir)) amount = -amount;

  const cp = r.counterparty as Record<string, unknown> | undefined;
  const merchant = r.merchant as Record<string, unknown> | undefined;
  // Transfers carry nested debtor/creditor parties: the counterparty is the
  // creditor when money leaves, the debtor when it arrives.
  const debtor = pd.debtor as Record<string, unknown> | undefined;
  const creditor = pd.creditor as Record<string, unknown> | undefined;
  const partner = amount < 0 ? (creditor ?? debtor) : (debtor ?? creditor);
  const counterparty = str(
    partner?.name,
    cp?.name,
    r.counterpartyName,
    r.creditorName,
    r.debtorName,
    merchant?.name as unknown,
    pd.counterpartyName,
    pd.counterPartyName,
    pd.name,
    pd.beneficiaryName,
    pd.payerName,
    pd.receiverName,
    pd.senderName,
    pd.creditorName,
    pd.debtorName,
    pd.merchantName,
    pd.partnerName
  );
  const description =
    str(r.description, r.remittanceInformation, r.remittanceInformationUnstructured, r.details, r.info) ?? "";

  return {
    tx: {
      id: `lhv-${id}`,
      date: rawDate.slice(0, 10),
      amount: Math.round(amount * 100) / 100,
      currency: (str(r.currency) ?? "EUR") as Tx["currency"],
      counterparty: counterparty ?? merchantFromDescription(description) ?? (description.slice(0, 60) || "Unknown"),
      description,
      iban,
    },
    // When no name field matched, report paymentData's key names so the next
    // sync response teaches us its real shape — values never leave the server.
    pdKeys: counterparty === undefined ? Object.keys(pd) : null,
  };
}
