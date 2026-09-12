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
// A year-long backfill is several statement calls per account; Hobby allows 60s.
export const maxDuration = 60;

// The LHV sync. Runs as Vercel Cron (GET with CRON_SECRET bearer) and from the
// settings page's "Sync now" button (POST as the owner). Window: from 7 days before
// the newest LHV transaction (overlap re-fetch is safe — upsert dedupes by id)
// or 90 days back on the first run. Diagnostics contain counts and key NAMES
// only, never transaction values.

async function isAuthorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return (await currentRole()) === "owner";
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
    const params = new URL(req.url).searchParams;
    // ?full=1 forces the whole 90-day window — useful after mapper
    // improvements, since upserts refresh names on re-fetched rows.
    // ?since=YYYY-MM-DD backfills history from that date (one-off pulls).
    const full = params.get("full") === "1";
    const since = params.get("since");
    const sinceValid = since && /^\d{4}-\d{2}-\d{2}$/.test(since) && since <= to ? since : null;
    const from = sinceValid ?? (!full && newestLhv ? isoMinusDays(newestLhv, 7) : isoMinusDays(to, 90));
    // Fetch in <=90-day slices so long backfills stay within whatever range
    // the statement API tolerates; upserts make overlaps harmless.
    const windows: { from: string; to: string }[] = [];
    for (let start = from; start <= to; ) {
      const candidate = isoMinusDays(start, -89);
      const end = candidate < to ? candidate : to;
      windows.push({ from: start, to: end });
      start = isoMinusDays(end, -1);
    }

    let fetched = 0;
    const txs: Tx[] = [];
    const unmappedKeySamples: string[][] = accountUnmapped.slice(0, 3);
    const paymentDataKeySamples: string[][] = [];
    const directionValues = new Set<string>();
    let unmappedTypeSample: Record<string, string> | null = null;
    for (const account of accounts) {
      for (const w of windows) {
        const result = await fetchStatement(accessToken, account.iban, w.from, w.to);
        fetched += result.fetched;
        txs.push(...result.txs);
        unmappedKeySamples.push(...result.unmapped.slice(0, 3));
        paymentDataKeySamples.push(...result.paymentDataKeySamples);
        result.directionValues.forEach((d) => directionValues.add(d));
        unmappedTypeSample = unmappedTypeSample ?? result.unmappedTypeSample;
      }
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
      window: { from, to, slices: windows.length },
      unmappedKeySamples: unmappedKeySamples.slice(0, 5),
      paymentDataKeySamples: paymentDataKeySamples.slice(0, 3),
      directionValues: [...directionValues],
      unmappedTypeSample: unmappedTypeSample ?? undefined,
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
