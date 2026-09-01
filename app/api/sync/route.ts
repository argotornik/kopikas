import { NextResponse } from "next/server";
import type { Tx } from "@/lib/types";
import {
  cleanupMockData,
  getLhvTokens,
  readDb,
  saveAccounts,
  saveLhvTokens,
  writeCollection,
} from "@/lib/storage";
import { fetchAccounts, fetchStatement, refreshAccessToken } from "@/lib/lhv";
import { currentRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The LHV sync. Runs as Vercel Cron (GET with CRON_SECRET bearer) and from the
// settings page's "Sync now" button (POST as Argo). Window: from 7 days before
// the newest LHV transaction (overlap re-fetch is safe — upsert dedupes by id)
// or 90 days back on the first run. Diagnostics contain counts and key NAMES
// only, never transaction values.

async function isAuthorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return (await currentRole()) === "argo";
}

function isoMinusDays(date: string, days: number): string {
  return new Date(new Date(date + "T00:00:00Z").getTime() - days * 86400000).toISOString().slice(0, 10);
}

async function run(req: Request) {
  if (!(await isAuthorized(req))) return new NextResponse(null, { status: 401 });

  const tokens = await getLhvTokens();
  if (!tokens) {
    return NextResponse.json(
      { ok: false, error: "No LHV token stored. Paste a refresh token in Settings (api.lhv.ai/api-access)." },
      { status: 400 }
    );
  }

  let refreshFailure: string | null = null;
  let tokenModeReport = "not attempted";
  try {
    // Design intent: the stored token is a refresh token. Reality check: if
    // the refresh grant fails, try the stored token directly as a bearer —
    // the portal may have handed out an access token or a static API key.
    // tokenMode in the response says which path worked.
    let accessToken: string;
    let newRefreshToken: string | undefined;
    let tokenMode = "refresh";
    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      accessToken = refreshed.accessToken;
      newRefreshToken = refreshed.newRefreshToken;
    } catch (refreshError) {
      refreshFailure = refreshError instanceof Error ? refreshError.message : String(refreshError);
      accessToken = tokens.refreshToken;
      tokenMode = "direct — stored token used as bearer (refresh grant failed, see refreshGrant)";
    }
    tokenModeReport = tokenMode;
    if (newRefreshToken) await saveLhvTokens(newRefreshToken);

    const { accounts, unmapped: accountUnmapped } = await fetchAccounts(accessToken);
    if (accounts.length > 0) await saveAccounts(accounts);

    const db = await readDb();
    const newestLhv = db.transactions
      .filter((t) => t.id.startsWith("lhv-"))
      .map((t) => t.date)
      .sort()
      .at(-1);
    const to = new Date().toISOString().slice(0, 10);
    const from = newestLhv ? isoMinusDays(newestLhv, 7) : isoMinusDays(to, 90);

    let fetched = 0;
    const txs: Tx[] = [];
    const unmappedKeySamples: string[][] = accountUnmapped.slice(0, 3);
    for (const account of accounts) {
      const result = await fetchStatement(accessToken, account.iban, from, to);
      fetched += result.fetched;
      txs.push(...result.txs);
      unmappedKeySamples.push(...result.unmapped.slice(0, 3));
    }
    if (txs.length > 0) await writeCollection("transactions", txs);

    const mockCleaned = txs.length > 0 ? await cleanupMockData() : false;

    return NextResponse.json({
      ok: true,
      tokenMode,
      refreshGrant: refreshFailure ?? undefined,
      accounts: accounts.length,
      fetched,
      mapped: txs.length,
      mockCleaned,
      rotatedRefreshToken: !!newRefreshToken,
      window: { from, to },
      unmappedKeySamples: unmappedKeySamples.slice(0, 5),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        tokenMode: tokenModeReport,
        refreshGrant: refreshFailure ?? undefined,
      },
      { status: 502 }
    );
  }
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
