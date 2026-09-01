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
    throw new Error(`LHV token refresh failed: HTTP ${res.status} — token expired or revoked; get a new one at api.lhv.ai/api-access`);
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
  if (!res.ok) throw new Error(`LHV GET ${path.split("?")[0]} failed: HTTP ${res.status}`);
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
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
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
): Promise<{ txs: Tx[]; fetched: number; unmapped: string[][] }> {
  const json = await lhvGet(
    accessToken,
    `/accounts/${encodeURIComponent(iban)}/statement?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
  const rows = asArray(json, ["transactions", "entries", "data", "items"]);
  const txs: Tx[] = [];
  const unmapped: string[][] = [];
  for (const r of rows) {
    const tx = mapTransaction(r, iban);
    if (tx) txs.push(tx);
    else unmapped.push(Object.keys(r));
  }
  return { txs, fetched: rows.length, unmapped };
}

function mapTransaction(r: Record<string, unknown>, iban: string): Tx | null {
  const id = str(r.id, r.transactionId, r.entryReference, r.reference);
  const rawDate = str(r.date, r.bookingDate, r.valueDate, r.transactionDate);
  let amount = num(r.amount);
  if (id === undefined || rawDate === undefined || amount === undefined) return null;

  // Some PSD2-style APIs return positive amounts + a direction flag.
  const dir = str(r.creditDebitIndicator, r.direction, r.type)?.toUpperCase();
  if (amount > 0 && (dir === "DBIT" || dir === "DEBIT" || dir === "D" || dir === "OUT")) amount = -amount;

  const cp = r.counterparty as Record<string, unknown> | undefined;
  const merchant = r.merchant as Record<string, unknown> | undefined;
  const counterparty =
    str(cp?.name, r.counterpartyName, r.creditorName, r.debtorName, merchant?.name as unknown) ?? "";
  const description =
    str(r.description, r.remittanceInformation, r.remittanceInformationUnstructured, r.details, r.info) ?? "";

  return {
    id: `lhv-${id}`,
    date: rawDate.slice(0, 10),
    amount: Math.round(amount * 100) / 100,
    currency: (str(r.currency) ?? "EUR") as Tx["currency"],
    counterparty: counterparty || description.slice(0, 60) || "Unknown",
    description,
    iban,
  };
}
